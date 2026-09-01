from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json, os, requests, numpy as np
from sentence_transformers import SentenceTransformer
import faiss
from dotenv import load_dotenv
import google.generativeai as genai
from assistant_faq import FAQ_ENTRIES
from logic import (
    Profile,
    AssistantMessage,
    build_product_text,
    matches_budget,
    rescale_match_scores,
    score_product,
    build_understand_summary,
    profile_to_sentence,
    detect_injection_attempt,
    format_buyer_context,
    build_assistant_prompt,
    validate_output,
    extract_json_block,
    REFUSAL_MESSAGE,
    MAX_MESSAGE_LENGTH,
    INVOICE_EXTRACTION_PROMPT,
    MIME_TYPES,
)

load_dotenv()

app = FastAPI(title="Home Extras Recommendation Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load products 
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PRODUCTS_PATH = os.path.join(BASE_DIR, "products.json")

if not os.path.exists(PRODUCTS_PATH):
    raise RuntimeError(f"products.json not found at {PRODUCTS_PATH}")

with open(PRODUCTS_PATH, "r", encoding="utf-8") as f:
    products = json.load(f)

print(f"✅ Loaded {len(products)} products")

SKIP_MODEL_LOAD = os.getenv("AI_SERVICE_SKIP_MODEL_LOAD") == "1"

if SKIP_MODEL_LOAD:
    print("⚠️  AI_SERVICE_SKIP_MODEL_LOAD=1 — skipping real model/FAISS load (test mode)")
    model = None
    dimension = 0
    index = None
    faq_index = None
    gemini_model = None
else:
    print("⏳ Loading sentence-transformer model...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    print("✅ Model loaded")

    # Build FAISS index
    product_texts = [build_product_text(p) for p in products]
    product_embeddings = model.encode(
        product_texts, convert_to_numpy=True, show_progress_bar=True
    )
    faiss.normalize_L2(product_embeddings)

    dimension = product_embeddings.shape[1]
    index = faiss.IndexFlatIP(dimension)
    index.add(product_embeddings.astype(np.float32))

    print(f"✅ FAISS index built - {index.ntotal} vectors, dim={dimension}")

    # FAQ index
    faq_texts = [f"{f['topic']}. {f['text']}" for f in FAQ_ENTRIES]
    faq_embeddings = model.encode(faq_texts, convert_to_numpy=True)
    faiss.normalize_L2(faq_embeddings)
    faq_index = faiss.IndexFlatIP(faq_embeddings.shape[1])
    faq_index.add(faq_embeddings.astype(np.float32))
    print(f"✅ FAQ index built - {faq_index.ntotal} vectors")

    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
    GEMINI_MODEL_NAME = "gemini-2.5-flash"
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
        gemini_model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        print("✅ Gemini assistant configured")
    else:
        print("⚠️  GOOGLE_API_KEY not set — /assistant/chat will return a fallback message")


class ChatRequest(BaseModel):
    message: str
    basket: Optional[list] = []
    recommendations: Optional[list] = []


# /recommend
@app.post("/recommend")
def recommend(profile: Profile):
    sentence = profile_to_sentence(profile)
    query_vector = model.encode([sentence], convert_to_numpy=True)
    faiss.normalize_L2(query_vector)

    k = min(250, len(products))
    scores, indices = index.search(query_vector.astype(np.float32), k)

    results = []

    # Pass 1 - strict style + budget
    for raw, idx in zip(scores[0], indices[0]):
        if idx < 0 or idx >= len(products):
            continue
        scored = score_product(products[idx], float(raw), profile, sentence)
        if scored:
            results.append(scored)

    # Pass 2 - relax style, keep budget
    if not results and profile.preferred_style:
        for raw, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(products):
                continue
            scored = score_product(products[idx], float(raw), profile, sentence, allow_style=False)
            if scored:
                results.append(scored)

    # Pass 3 - budget fallback only
    if not results:
        fallbacks = sorted(
            [
                p
                for p in products
                if matches_budget(p, profile.budget_min, profile.budget_max)
            ],
            key=lambda x: float(x.get("price", 0)),
        )[:24]
        for p in fallbacks:
            results.append(
                {
                    **p,
                    "match_score": 50,
                    "similarity_raw": 0,
                    "query_sentence": sentence,
                    "why_points": [
                        "Shown as a budget-friendly fallback option",
                        f"Fits your selected budget range: £{profile.budget_min or 0} – £{profile.budget_max}",
                        f"Category: {p.get('category', 'Home Extras')}",
                    ],
                }
            )

    results.sort(key=lambda x: x.get("match_score", 0), reverse=True)
    top = results[:24]
    top = rescale_match_scores(top)

    if top:
        print(f"✅ Top: {top[0]['name']} ({top[0]['match_score']}% match, raw {top[0]['raw_match_score']})")
    else:
        print("⚠️  No recommendations found")

    return {"recommendations": top, "query_sentence": sentence}


# /understand
@app.post("/understand")
def understand(profile: Profile):
    return build_understand_summary(profile)


class AssistantRequest(BaseModel):
    message: str
    history: Optional[List[AssistantMessage]] = []
    buyer_context: Optional[dict] = {}


def retrieve_assistant_context(message: str, k_products: int = 4, k_faq: int = 3):
    query_vector = model.encode([message], convert_to_numpy=True)
    faiss.normalize_L2(query_vector)

    blocks = []
    matched_products = []

    p_scores, p_idx = index.search(query_vector.astype(np.float32), min(k_products, len(products)))
    f_scores, f_idx = faq_index.search(query_vector.astype(np.float32), min(k_faq, len(FAQ_ENTRIES)))

    top_product_score = float(p_scores[0][0]) if len(p_scores[0]) else 0.0
    top_faq_score = float(f_scores[0][0]) if len(f_scores[0]) else 0.0

    PRODUCT_SCORE_THRESHOLD = 0.32
    PRODUCT_VS_FAQ_MARGIN = 0.04
    products_are_relevant = (
        top_product_score >= PRODUCT_SCORE_THRESHOLD
        and top_product_score > top_faq_score + PRODUCT_VS_FAQ_MARGIN
    )

    if products_are_relevant:
        product_lines = []
        for score, idx in zip(p_scores[0], p_idx[0]):
            if idx < 0 or idx >= len(products) or score < PRODUCT_SCORE_THRESHOLD:
                continue
            p = products[idx]
            product_lines.append(f"- {p.get('name')} (£{p.get('price', 0)}, {p.get('category', '')}, style: {p.get('style', '')})")
            matched_products.append(p)
        if product_lines:
            blocks.append("Relevant products:\n" + "\n".join(product_lines))

    faq_lines = []
    for score, idx in zip(f_scores[0], f_idx[0]):
        if idx < 0 or idx >= len(FAQ_ENTRIES) or score < 0.15:
            continue
        faq_lines.append(f"- {FAQ_ENTRIES[idx]['text']}")
    if faq_lines:
        blocks.append("Relevant platform information:\n" + "\n".join(faq_lines))

    context_text = "\n\n".join(blocks) if blocks else "No closely matching products or FAQ entries were found."
    return context_text, matched_products


@app.post("/assistant/chat")
def assistant_chat(req: AssistantRequest):
    message = (req.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="A message is required.")
    if len(message) > MAX_MESSAGE_LENGTH:
        message = message[:MAX_MESSAGE_LENGTH]

    if detect_injection_attempt(message):
        return {"reply": REFUSAL_MESSAGE, "blocked": True, "products": [], "suggestions": []}

    if not gemini_model:
        return {
            "reply": "The assistant isn't configured yet",
            "blocked": False,
            "products": [],
            "suggestions": [],
        }

    retrieved_text, matched_products = retrieve_assistant_context(message)
    prompt = build_assistant_prompt(message, req.history or [], req.buyer_context or {}, retrieved_text)

    suggestions = []
    try:
        result = gemini_model.generate_content(prompt)
        raw_text = getattr(result, "text", "") or ""
        parsed = extract_json_block(raw_text)
        if parsed and isinstance(parsed, dict) and "answer" in parsed:
            reply = validate_output(str(parsed.get("answer") or ""))
            raw_suggestions = parsed.get("suggestions") or []
            if isinstance(raw_suggestions, list):
                suggestions = [str(s).strip() for s in raw_suggestions if str(s).strip()][:4]
        else:
            reply = validate_output(raw_text)
    except Exception as e:
        print(f"⚠️  Gemini call failed: {e}")
        reply = "I couldn't reach the assistant service just now, please try again in a moment."

    return {"reply": reply, "blocked": False, "products": matched_products, "suggestions": suggestions}


class InvoiceSummariseRequest(BaseModel):
    file_url: str
    file_name: str


@app.post("/invoice/summarise")
def summarise_invoice(req: InvoiceSummariseRequest):
    if not gemini_model:
        raise HTTPException(status_code=503, detail="The AI summariser isn't configured yet.")

    ext = req.file_name.rsplit(".", 1)[-1].lower() if "." in req.file_name else ""
    mime_type = MIME_TYPES.get(ext)
    if not mime_type:
        raise HTTPException(status_code=400, detail="Unsupported file type for summarisation.")

    try:
        resp = requests.get(req.file_url, timeout=20)
        resp.raise_for_status()
        file_bytes = resp.content
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Couldn't download the invoice file: {e}")

    try:
        result = gemini_model.generate_content([
            INVOICE_EXTRACTION_PROMPT,
            {"mime_type": mime_type, "data": file_bytes},
        ])
        raw_text = getattr(result, "text", "") or ""
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI extraction failed: {e}")

    parsed = extract_json_block(raw_text)
    if parsed is None:
        return {"success": False, "message": "Couldn't reliably extract structured data from this invoice.", "raw": raw_text[:1000]}

    line_items_raw = parsed.get("line_items")
    line_items = []
    if isinstance(line_items_raw, list):
        for li in line_items_raw:
            if not isinstance(li, dict):
                continue
            line_items.append({
                "description": li.get("description") or "",
                "quantity": li.get("quantity"),
                "unitPrice": li.get("unit_price"),
                "lineTotal": li.get("line_total"),
            })

    return {
        "success": True,
        "summary": parsed.get("summary") or "",
        "invoiceNumber": parsed.get("invoice_number") or "",
        "vendorName": parsed.get("vendor_name") or "",
        "invoiceDate": parsed.get("invoice_date") or "",
        "dueDate": parsed.get("due_date") or "",
        "extractedAmount": parsed.get("total_amount"),
        "lineItems": line_items,
    }


# /health
@app.get("/health")
def health():
    return {
        "status": "ok",
        "products": len(products),
        "index_vectors": index.ntotal,
        "embedding_dim": dimension,
        "model": "all-MiniLM-L6-v2",
        "method": "NLP sentence vectorisation + FAISS cosine similarity",
    }

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json, os, numpy as np
from sentence_transformers import SentenceTransformer
import faiss
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Home Extras Recommendation Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── 1. Load model ────────────────────────────────────────────────────────────
print("⏳ Loading sentence-transformer model...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print("✅ Model loaded")

# ─── 2. Load products ─────────────────────────────────────────────────────────
BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
PRODUCTS_PATH = os.path.join(BASE_DIR, "products.json")

if not os.path.exists(PRODUCTS_PATH):
    raise RuntimeError(f"products.json not found at {PRODUCTS_PATH}")

with open(PRODUCTS_PATH, "r", encoding="utf-8") as f:
    products = json.load(f)

print(f"✅ Loaded {len(products)} products")

# ─── 3. Build FAISS index ─────────────────────────────────────────────────────
def build_product_text(p: dict) -> str:
    return (
        f"{p.get('name', '')}. "
        f"Category: {p.get('category', 'Home Extras')}. "
        f"Style: {p.get('style', '')}. "
        f"{p.get('description', '')} "
        f"Tags: {' '.join(p.get('tags', []))}. "
        f"Suitable for: {' '.join(p.get('suitable_for', []))}. "
        f"Build stage: {' '.join(p.get('build_stage', []))}. "
        f"Price: £{p.get('price', 0)}."
    ).strip()

product_texts      = [build_product_text(p) for p in products]
product_embeddings = model.encode(product_texts, convert_to_numpy=True, show_progress_bar=True)
faiss.normalize_L2(product_embeddings)

dimension = product_embeddings.shape[1]
index     = faiss.IndexFlatIP(dimension)
index.add(product_embeddings.astype(np.float32))

print(f"✅ FAISS index built — {index.ntotal} vectors, dim={dimension}")

# ─── 4. Request schemas ───────────────────────────────────────────────────────
class Profile(BaseModel):
    userId:                   Optional[str]        = "guest"
    buyer_type:               Optional[str]        = ""
    household_size:           Optional[str]        = ""
    build_stage:              Optional[str]        = ""
    upgrade_categories:       Optional[List[str]]  = []
    priorities:               Optional[List[str]]  = []
    home_area:                Optional[str]        = ""
    bedroom_users:            Optional[str]        = ""
    wardrobe_need:            Optional[str]        = ""
    kitchen_usage:            Optional[str]        = ""
    appliance_need:           Optional[str]        = ""
    bathroom_priority:        Optional[str]        = ""
    flooring_area:            Optional[str]        = ""
    electrical_need:          Optional[str]        = ""
    garden_priority:          Optional[str]        = ""
    smart_home_need:          Optional[str]        = ""
    sustainability_interest:  Optional[str]        = ""
    preferred_style:          Optional[str]        = ""
    budget_min:               Optional[float]      = 0
    budget_max:               Optional[float]      = 0
    additional_notes:         Optional[str]        = ""
    # legacy compat
    room_type:                Optional[str]        = ""
    lifestyle_flags:          Optional[List[str]]  = []
    biggest_problems:         Optional[List[str]]  = []

class ChatRequest(BaseModel):
    message:         str
    basket:          Optional[list] = []
    recommendations: Optional[list] = []

# ─── 5. Helpers ───────────────────────────────────────────────────────────────
def norm(value) -> str:
    return str(value or "").strip().lower()

def profile_to_sentence(p: Profile) -> str:
    home_area = p.home_area or p.room_type
    parts = []

    if home_area:
        parts.append(f"The buyer is choosing new-build home extras for {home_area}")
    if p.buyer_type:
        parts.append(f"Buyer type: {p.buyer_type}")
    if p.household_size:
        parts.append(f"Household size: {p.household_size}")
    if p.build_stage:
        parts.append(f"Build stage: {p.build_stage}")

    for field in [
        p.bedroom_users, p.wardrobe_need, p.kitchen_usage,
        p.appliance_need, p.bathroom_priority, p.flooring_area,
        p.electrical_need, p.garden_priority, p.smart_home_need,
        p.sustainability_interest,
    ]:
        if field:
            parts.append(str(field))

    if p.upgrade_categories:
        parts.append("Interested upgrade categories: " + ", ".join(p.upgrade_categories))
    if p.priorities:
        parts.append("Buyer priorities: " + ", ".join(p.priorities))
    if p.lifestyle_flags:
        parts.append("Lifestyle preferences: " + ", ".join(p.lifestyle_flags))
    if p.biggest_problems:
        parts.append("Problems to solve: " + ", ".join(p.biggest_problems))
    if p.preferred_style:
        parts.append(f"Preferred style: {p.preferred_style}")
    if p.budget_max:
        parts.append(f"Budget range: £{p.budget_min or 0} to £{p.budget_max}")
    if p.additional_notes:
        parts.append(p.additional_notes)

    parts.append(
        "Recommend relevant home extras such as kitchen upgrades, appliances, "
        "bathroom upgrades, flooring, electrical extras, lighting, wardrobes and storage, "
        "doors and finishes, garden upgrades, smart home security, sustainability extras, "
        "structural extras and decorative upgrades."
    )
    return ". ".join(parts).strip()

def matches_budget(p: dict, mn: float, mx: float) -> bool:
    price = float(p.get("price", 0))
    if mn and price < mn: return False
    if mx and price > mx: return False
    return True

def matches_style(p: dict, style: str) -> bool:
    preferred = norm(style)
    if not preferred: return True
    product_style = norm(p.get("style", ""))
    if not product_style: return True
    return product_style == preferred

def category_boost(p: dict, profile: Profile) -> int:
    boost       = 0
    category    = norm(p.get("category", ""))
    tags        = " ".join(p.get("tags", [])).lower()
    text        = f"{category} {tags}"
    home_area   = norm(profile.home_area or profile.room_type)

    if home_area and home_area in text:                                      boost += 8
    if home_area == "electrical & lighting" and (
        "electrical" in text or "lighting" in text):                        boost += 8
    if home_area == "garden / external" and (
        "garden" in text or "external" in text):                            boost += 8
    if home_area == "smart home / security" and (
        "smart" in text or "security" in text):                             boost += 8
    if profile.wardrobe_need   and ("wardrobe" in text or "storage"  in text): boost += 10
    if profile.appliance_need  and ("appliance" in text or "kitchen"  in text): boost += 8
    if profile.bathroom_priority and "bathroom"  in text:                   boost += 8
    if profile.flooring_area   and "flooring"   in text:                    boost += 8
    if profile.smart_home_need and ("smart" in text or "security" in text): boost += 8
    if profile.sustainability_interest and (
        "sustainability" in text or "energy" in text or "solar" in text):   boost += 8
    return boost

def build_why(product: dict, profile: Profile, similarity: float) -> list:
    why = ["Matches the preferences you selected in the questionnaire"]
    if profile.preferred_style:
        if norm(product.get("style", "")) == norm(profile.preferred_style):
            why.append(f"Fits your {profile.preferred_style} style preference")
    if profile.budget_max:
        why.append(
            f"Stays within your selected budget of "
            f"£{int(profile.budget_min or 0)} – £{int(profile.budget_max)}"
        )
    if product.get("category"):
        why.append(f"Recommended because you showed interest in {product['category'].lower()}")
    home_area = profile.home_area or profile.room_type
    if home_area:
        why.append(f"Suitable for your selected area: {home_area}")
    if profile.build_stage:
        why.append(f"Suitable for homes at the {profile.build_stage.lower()}")
    return why[:5]

def fmt_list(items: list) -> str:
    clean = [str(i) for i in items if i]
    if not clean:           return ""
    if len(clean) == 1:     return clean[0]
    if len(clean) == 2:     return f"{clean[0]} and {clean[1]}"
    return ", ".join(clean[:-1]) + f" and {clean[-1]}"

# ─── 6. /recommend ────────────────────────────────────────────────────────────
@app.post("/recommend")
def recommend(profile: Profile):
    sentence     = profile_to_sentence(profile)
    query_vector = model.encode([sentence], convert_to_numpy=True)
    faiss.normalize_L2(query_vector)

    k = min(250, len(products))
    scores, indices = index.search(query_vector.astype(np.float32), k)

    results = []

    def score_product(product, raw, allow_style=True):
        if not matches_budget(product, profile.budget_min, profile.budget_max):
            return None
        if allow_style and not matches_style(product, profile.preferred_style):
            return None
        base  = round(raw * 100)
        boost = category_boost(product, profile)
        cap   = 98 if allow_style else 88
        match = min(cap, max(20, base + boost))
        return {
            **product,
            "match_score":    match,
            "similarity_raw": round(raw, 4),
            "query_sentence": sentence,
            "why_points":     build_why(product, profile, raw),
        }

    # Pass 1 — strict style + budget
    for raw, idx in zip(scores[0], indices[0]):
        if idx < 0 or idx >= len(products): continue
        scored = score_product(products[idx], float(raw))
        if scored: results.append(scored)

    # Pass 2 — relax style, keep budget
    if not results and profile.preferred_style:
        for raw, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(products): continue
            scored = score_product(products[idx], float(raw), allow_style=False)
            if scored: results.append(scored)

    # Pass 3 — budget fallback only
    if not results:
        fallbacks = sorted(
            [p for p in products if matches_budget(p, profile.budget_min, profile.budget_max)],
            key=lambda x: float(x.get("price", 0))
        )[:24]
        for p in fallbacks:
            results.append({
                **p,
                "match_score": 50,
                "similarity_raw": 0,
                "query_sentence": sentence,
                "why_points": [
                    "Shown as a budget-friendly fallback option",
                    f"Fits your selected budget range: £{profile.budget_min or 0} – £{profile.budget_max}",
                    f"Category: {p.get('category', 'Home Extras')}",
                ],
            })

    results.sort(key=lambda x: x.get("match_score", 0), reverse=True)
    top = results[:24]

    if top:
        print(f"✅ Top: {top[0]['name']} ({top[0]['match_score']}% match)")
    else:
        print("⚠️  No recommendations found")

    return {"recommendations": top, "query_sentence": sentence}

# ─── 7. /understand ───────────────────────────────────────────────────────────
HOUSEHOLD_MAP = {
    "solo": "single occupant", "couple": "couple",
    "family_y": "family with young children", "family_t": "family with teenagers",
    "shared": "shared household",
}
LIFESTYLE_MAP = {
    "smart_home": "smart home and tech", "entertain": "entertaining guests",
    "wfh_life": "working from home", "young_kids": "young children at home",
    "teen_kids": "teenagers at home", "eco": "eco and sustainability",
    "security": "home security", "outdoor_life": "outdoor living",
    "minimalist": "clutter-free living", "cosy_home": "cosy warm home",
    "pet_life": "pets in the home", "accessibility": "accessibility needs",
}
PRIORITY_MAP = {
    "budget": "staying within budget", "durable": "long-term durability",
    "maintain": "easy maintenance", "premium": "premium look and feel",
    "value_up": "increasing property value", "comfort": "comfort and lifestyle",
    "safety": "safety and security",
}

@app.post("/understand")
def understand(profile: Profile):
    home_area   = profile.home_area or profile.room_type or "your home"
    style       = profile.preferred_style or "any suitable"
    budget_text = (
        f"within your budget of £{int(profile.budget_min or 0):,} to £{int(profile.budget_max):,}"
        if profile.budget_max else "based on your selected preferences"
    )

    needs = []

    # Readable household
    if profile.household_size:
        readable = HOUSEHOLD_MAP.get(profile.household_size, profile.household_size)
        needs.append(readable)

    # Readable priorities
    for p in (profile.priorities or []):
        readable = PRIORITY_MAP.get(p, p)
        needs.append(readable)

    # Readable lifestyle traits (stored in upgrade_categories from buildProfile)
    for t in (profile.upgrade_categories or []):
        readable = LIFESTYLE_MAP.get(t, t.replace("_", " "))
        needs.append(readable)

    needs_text = fmt_list(needs[:3])

    if needs_text:
        summary = (
            f"Great! We're personalising your recommendations for {needs_text}. "
            f"We'll prioritise {style} style options and suggest upgrades {budget_text}."
        )
    else:
        summary = (
            f"Great! We'll find the best extras for your new home. "
            f"We'll prioritise {style} style options and suggest upgrades {budget_text}."
        )

    # if profile.build_stage:
    #     summary += (
    #         f" Since your home is at the {profile.build_stage.lower()} stage, "
    #         f"we'll focus on extras that are ready to install now."
    #     )

    return {
        "summary_message":   summary,
        "detected_needs":    needs,
        "detected_style":    profile.preferred_style or "Any style",
        "query_sentence":    profile_to_sentence(profile),
    }

# ─── 8. /chat ─────────────────────────────────────────────────────────────────
PRODUCT_KEYWORDS = [
    "kitchen", "cabinet", "worktop", "quartz", "granite", "sink", "tap",
    "boiling water", "wine cooler", "extractor", "island", "soft-close",
    "appliance", "fridge", "freezer", "dishwasher", "washing machine",
    "washer dryer", "microwave", "coffee machine", "oven", "hob", "induction",
    "bathroom", "tiling", "tiles", "chrome", "shower", "rainfall",
    "heated towel", "vanity", "mirror", "toilet",
    "flooring", "carpet", "laminate", "lvt", "vinyl", "wood", "herringbone",
    "electrical", "socket", "usb", "switch", "dimmer", "spotlight",
    "lighting", "tv point", "data point", "ev charger",
    "wardrobe", "storage", "shelving", "under stairs",
    "doors", "handles", "ironmongery", "glazed",
    "garden", "turf", "patio", "decking", "shed", "fencing", "driveway",
    "smart", "thermostat", "doorbell", "alarm", "cctv", "lock", "security",
    "solar", "battery", "insulation", "water-saving", "sustainability",
    "paint", "blinds", "curtains", "feature wall", "decorative",
    "recommend", "suggest", "find", "need", "looking for",
    "cheaper", "budget", "affordable", "alternative", "price",
    "cost", "show me", "options", "upgrade", "extra", "extras",
]

@app.post("/chat")
def chat(req: ChatRequest):
    msg = req.message.strip()
    msg_lower = msg.lower()

    if not any(kw in msg_lower for kw in PRODUCT_KEYWORDS):
        greetings = ["hi", "hello", "hey", "hiya", "howdy"]
        if any(msg_lower.startswith(g) for g in greetings):
            return {
                "reply": (
                    "Hello! I can help you choose home extras and upgrades such as "
                    "kitchen upgrades, flooring, appliances, bathrooms, smart home "
                    "options, garden extras or sustainability upgrades."
                ),
                "products": [],
            }
        return {
            "reply": (
                "I'm here to help you find suitable new-build home extras. Try asking "
                "something like 'show me kitchen upgrades under £1000', "
                "'what bathroom extras are worth choosing?', or "
                "'suggest smart home upgrades'."
            ),
            "products": [],
        }

    query_vector = model.encode([msg], convert_to_numpy=True)
    faiss.normalize_L2(query_vector)
    scores, indices = index.search(query_vector.astype(np.float32), min(12, len(products)))

    top = [products[i] for i in indices[0] if 0 <= i < len(products)]

    budget_words = ["cheaper", "budget", "affordable", "cheap", "low cost"]
    if any(w in msg_lower for w in budget_words):
        top = sorted(top, key=lambda x: float(x.get("price", 0)))

    top = top[:4]

    if not top:
        return {
            "reply": "I couldn't find a strong match. Try mentioning the area, budget or type of extra you're interested in.",
            "products": [],
        }

    names = ", ".join(
        f"{p.get('name', 'Product')} (£{p.get('price', 0)})" for p in top
    )
    return {
        "reply": f"Here are the best matches I found: {names}. Would you like details on any of these?",
        "products": top,
    }

# ─── 9. /health ───────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status":        "ok",
        "products":      len(products),
        "index_vectors": index.ntotal,
        "embedding_dim": dimension,
        "model":         "all-MiniLM-L6-v2",
        "method":        "NLP sentence vectorisation + FAISS cosine similarity",
    }
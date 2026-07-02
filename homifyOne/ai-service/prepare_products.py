# ai-service/prepare_products.py
import json, re, os

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
INPUT_PATH  = "/Users/mrudhulaapv/Desktop/mpv4/homifyOne/server/src/scripts/extras-products.js"
OUTPUT_PATH = os.path.join(BASE_DIR, "products.json")

with open(INPUT_PATH, "r", encoding="utf-8") as f:
    raw = f.read()

match = re.search(r'(\[.*\])', raw, re.DOTALL)
if not match:
    raise RuntimeError("Could not find JSON array in file")

raw = match.group(1)
products = json.loads(raw)

style_map = {
    "minimalistic": "minimal",
    "bohemian":     "bold",
    "scandi":       "scandi",
    "classic":      "classic",
    "modern":       "modern",
    "cosy":         "cosy",
    "bold":         "bold",
}

for p in products:
    p["image_url"]    = p.pop("imageUrl", "")
    p["style"]        = style_map.get(p.get("style", ""), p.get("style", ""))
    p["suitable_for"] = [p.get("category", "Home Extras")]
    p["build_stage"]  = ["Handover / ready to move in", "Pre-completion"]

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(products, f, indent=2, ensure_ascii=False)

print(f"✅ Written {len(products)} products to {OUTPUT_PATH}")

CATEGORY_SPECS = {
    "Kitchen": {
        "highlights": ["Easy-clean surface finish", "Designed for modern kitchens", "Professional installation included"],
        "specs":      {"Material": "High-grade MDF / solid timber options", "Finish": "Matt lacquer", "Warranty": "5 years", "Installation": "Professional fit included"},
        "goodToKnow": ["Colour swatches available on request", "Lead times may vary during peak periods"],
        "installStage": "Pre-completion",
        "leadTime": "4–6 weeks",
    },
    "Bathroom": {
        "highlights": ["Water-resistant finish", "Slip-resistant where applicable", "Designed for wet room use"],
        "specs":      {"Material": "Ceramic / porcelain / solid surface", "Finish": "Gloss or matt", "IP Rating": "IPX4 (splash-proof)", "Warranty": "10 years"},
        "goodToKnow": ["Requires WRAS-approved fittings", "Grout colour choice available"],
        "installStage": "Pre-completion",
        "leadTime": "3–5 weeks",
    },
    "Bedroom": {
        "highlights": ["Soft-close mechanisms throughout", "Maximises storage space", "Custom sizing available"],
        "specs":      {"Material": "Solid oak / MDF core", "Finish": "Matt or gloss lacquer", "Handles": "Choice of handle styles", "Warranty": "5 years"},
        "goodToKnow": ["Template survey required before manufacture", "Delivery and installation included"],
        "installStage": "Handover / ready to move in",
        "leadTime": "6–8 weeks",
    },
    "Living room": {
        "highlights": ["Enhances the main living space", "Coordinated with your style choice", "Professional installation available"],
        "specs":      {"Material": "Varies by product", "Finish": "To match your scheme", "Warranty": "2 years"},
        "goodToKnow": ["Style variants available — ask your consultant"],
        "installStage": "Handover / ready to move in",
        "leadTime": "3–4 weeks",
    },
    "Flooring": {
        "highlights": ["Durable wear layer for high traffic areas", "Easy underfloor heating compatible", "Consistent finish throughout"],
        "specs":      {"Thickness": "8–12mm", "Wear Layer": "0.5mm AC4 rated", "Underfloor Heating": "Compatible", "Warranty": "15 years"},
        "goodToKnow": ["Acclimate flooring for 48h before fitting", "Expansion gaps required at edges"],
        "installStage": "Pre-completion",
        "leadTime": "2–3 weeks",
    },
    "Security": {
        "highlights": ["Professionally installed and commissioned", "App-controlled and monitored", "Integrates with smart home systems"],
        "specs":      {"Power": "Mains + battery backup", "Connectivity": "Wi-Fi / Zigbee", "App Control": "iOS and Android", "Warranty": "3 years"},
        "goodToKnow": ["Requires home Wi-Fi for remote access", "Annual service plan recommended"],
        "installStage": "Handover / ready to move in",
        "leadTime": "1–2 weeks",
    },
    "Garden": {
        "highlights": ["Weather-resistant materials", "Low-maintenance design", "UV-stable finish"],
        "specs":      {"Material": "Composite / treated hardwood / metal", "Finish": "UV-stable powder coat", "Warranty": "10 years structural"},
        "goodToKnow": ["Ground conditions may affect installation", "Seasonal availability may apply"],
        "installStage": "Handover / ready to move in",
        "leadTime": "4–6 weeks",
    },
}

DEFAULT_SPECS = {
    "highlights": ["Quality-assured product", "Professionally installed", "Matched to your home style"],
    "specs":      {"Warranty": "2 years", "Installation": "Included"},
    "goodToKnow": ["Speak to your consultant for full details"],
    "installStage": "Handover / ready to move in",
    "leadTime": "2–4 weeks",
}

for p in products:
    cat = p.get("category", "")
    matched = next((v for k, v in CATEGORY_SPECS.items() if k.lower() in cat.lower()), DEFAULT_SPECS)
    p.setdefault("highlights",    matched["highlights"])
    p.setdefault("specs",         matched["specs"])
    p.setdefault("goodToKnow",    matched["goodToKnow"])
    p.setdefault("installStage",  matched["installStage"])
    p.setdefault("leadTime",      matched["leadTime"])
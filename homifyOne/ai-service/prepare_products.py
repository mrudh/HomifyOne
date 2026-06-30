# ai-service/prepare_products.py
import json, re, os

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
INPUT_PATH  = "/Users/mrudhulaapv/Desktop/mpv4/homifyOne/server/src/scripts/extras-products.js"
OUTPUT_PATH = os.path.join(BASE_DIR, "products.json")

with open(INPUT_PATH, "r", encoding="utf-8") as f:
    raw = f.read()

# Extract just the [...] array — most reliable approach
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
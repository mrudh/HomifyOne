const SUPPLIER_KEYS = [
  'supplierKitchen', 'supplierBath', 'supplierPaint', 'supplierBlinds',
  'supplierCarpet', 'supplierLights', 'supplierFloor', 'supplierRadiator',
  'supplierGarden', 'supplierFurniture',
];

const SUBCATEGORY_MAP = {
  Kitchen: {
    'Cabinets': 'supplierKitchen',
    'Worktop': 'supplierKitchen',
    'Splashback': 'supplierKitchen',
    'Appliances': 'supplierKitchen',
    'Sink & Taps': 'supplierKitchen',
    'Storage & Organisation': 'supplierKitchen',
    'Decor': 'supplierKitchen',
    'Lighting & Extraction': 'supplierLights',
  },
  Bathroom: {
    'Shower': 'supplierBath',
    'Bath': 'supplierBath',
    'Mirror': 'supplierBath',
    'Tiles': 'supplierBath',
    'Sanitaryware': 'supplierBath',
    'Storage & Mirrors': 'supplierBath',
    'Accessories': 'supplierBath',
    'Bath Screen': 'supplierBath',
    'Towel Rail': 'supplierRadiator',
    'Radiator': 'supplierRadiator',
    'Underfloor Heating': 'supplierRadiator',
  },
  // Both spellings supported — choices-products.js uses "Bedroom", extras-products.js uses "Master Bedroom"
  Bedroom: {
    'Wardrobes': 'supplierFurniture',
    'Furniture': 'supplierFurniture',
    'Desk & Workspace': 'supplierFurniture',
    'Gaming & Entertainment': 'supplierFurniture',
    'Kids Furniture': 'supplierFurniture',
    'Blinds': 'supplierBlinds',
    'Carpet': 'supplierCarpet',
    'Wall Colour': 'supplierPaint',
    'Lighting': 'supplierLights',
    'Sockets & Switches': 'supplierLights',
    'Radiator': 'supplierRadiator',
  },
  'Living Room': {
    'TV & Media Units': 'supplierFurniture',
    'Furniture & Decor': 'supplierFurniture',
    'Desk & Workspace': 'supplierFurniture',
    'Gaming & Entertainment': 'supplierFurniture',
    'Carpet & Rugs': 'supplierCarpet',
    'Wall Paint & Art': 'supplierPaint',
    'Wall Paint': 'supplierPaint',
    'Flooring': 'supplierFloor',
    'Lighting': 'supplierLights',
    'Smart Home': 'supplierLights',
    'Switches': 'supplierLights',
    'Sockets & Switches': 'supplierLights',
    'Radiator': 'supplierRadiator',
  },
  Garden: {
    'Outdoor Lighting': 'supplierLights',
    'Fencing': 'supplierGarden',
    'Patio & Paving': 'supplierGarden',
    'Garden Walls': 'supplierGarden',
    'Gates & Sheds': 'supplierGarden',
    'Lawn & Turf': 'supplierGarden',
    'Garden Storage': 'supplierGarden',
    'Play Areas': 'supplierGarden',
    'Planting & Decor': 'supplierGarden',
    'Vertical Gardening': 'supplierGarden',
    'Garden Features': 'supplierGarden',
  },
  'Smart Home & Security': {
    'Security Cameras': 'supplierLights',
    'Smart Thermostat': 'supplierLights',
    'Smart Speakers': 'supplierLights',
    'Smart Lighting': 'supplierLights',
    'Security & Control': 'supplierLights',
    'Monitoring': 'supplierLights',
    'Smart Devices': 'supplierLights',
  },
};

const ROOM_ALIASES = { 'Master Bedroom': 'Bedroom' };

function getSupplierKey(room, subCategory) {
  const normalizedRoom = ROOM_ALIASES[room] || room;
  const roomMap = SUBCATEGORY_MAP[normalizedRoom];
  const key = roomMap?.[subCategory];
  if (key) return key;

  const roomFallback = {
    Kitchen: 'supplierKitchen',
    Bathroom: 'supplierBath',
    Bedroom: 'supplierFurniture',
    'Living Room': 'supplierFurniture',
    Garden: 'supplierGarden',
    'Smart Home & Security': 'supplierLights',
  };
  return roomFallback[normalizedRoom] || 'supplierKitchen';
}

module.exports = { SUPPLIER_KEYS, getSupplierKey };
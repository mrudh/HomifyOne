import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useApp } from '../../context/AppContext';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CATEGORIES = [{
        key: 'home',
        label: 'Home',
        emoji: '🏠',
        color: '#1a4a45',
        query: null
    },
    {
        key: 'school',
        label: 'Schools',
        emoji: '🎓',
        color: '#0ea5e9',
        query: `node["amenity"~"school|college|university"](BBOX);`
    },
    {
        key: 'hospital',
        label: 'Hospitals',
        emoji: '🏥',
        color: '#ef4444',
        query: `node["amenity"~"hospital|clinic"](BBOX);`
    },
    {
        key: 'pharmacy',
        label: 'Pharmacy',
        emoji: '💊',
        color: '#8b5cf6',
        query: `node["amenity"="pharmacy"](BBOX);`
    },
    {
        key: 'grocery',
        label: 'Grocery',
        emoji: '🛒',
        color: '#f59e0b',
        query: `node["shop"~"supermarket|convenience|grocery"](BBOX);`
    },
    {
        key: 'restaurant',
        label: 'Restaurants',
        emoji: '🍽️',
        color: '#f97316',
        query: `node["amenity"~"restaurant|cafe|fast_food"](BBOX);`
    },
    {
        key: 'train',
        label: 'Train',
        emoji: '🚆',
        color: '#6366f1',
        query: `node["railway"~"station|halt"](BBOX);`
    },
    {
        key: 'bus',
        label: 'Bus Stop',
        emoji: '🚌',
        color: '#10b981',
        query: `node["highway"="bus_stop"](BBOX);`
    },
];

function makePinIcon(emoji, color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.06 27.94 0 18 0z"
        fill="${color}" />
      <circle cx="18" cy="18" r="13" fill="white" />
      <text x="18" y="23" text-anchor="middle" font-size="14">${emoji}</text>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor:[0, -44],
  });
}

async function fetchNearby(lat, lng, radiusM = 1500) {
  const d = (radiusM / 111320);
  const bbox = `${lat - d},${lng - d},${lat + d},${lng + d}`;

  const queries = CATEGORIES
    .filter(c => c.query)
    .map(c => c.query.replace(/BBOX/g, bbox))
    .join('\n');

  const body = `[out:json][timeout:25];\n(\n${queries}\n);\nout body;`;

  const res  = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body,
  });
  const data = await res.json();
  return data.elements || [];
}

function FitBounds({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length < 2) return;
    const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lon ?? m.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [markers]);
  return null;
}

function categorise(el) {
  const t = el.tags || {};
  if (t.amenity === 'pharmacy') return 'pharmacy';
  if (t.amenity?.match(/hospital|clinic/)) return 'hospital';
  if (t.amenity?.match(/school|college|university/)) return 'school';
  if (t.amenity?.match(/restaurant|cafe|fast_food/)) return 'restaurant';
  if (t.shop?.match(/supermarket|convenience|grocery/)) return 'grocery';
  if (t.railway?.match(/station|halt/)) return 'train';
  if (t.highway === 'bus_stop') return 'bus';
  return null;
}

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const StatusBadge = ({ status }) => {
  const map = {
    assigned: { label: 'Active', cls: 'bg-green-100 text-green-700' },
    selections_pending: { label: 'Selections Open', cls: 'bg-yellow-100 text-yellow-700' },
    selections_submitted: { label: 'Under Review', cls: 'bg-blue-100 text-blue-700' },
    selections_approved: { label: 'Approved ✓', cls: 'bg-green-100 text-green-700' },
  };
  const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-500' };
  return <span className={`text-xs font-semibold px-3 py-1 rounded-full ${s.cls}`}>{s.label}</span>;
};

function NearbyDistances({ plot, places }) {
  const DISTANCE_CATS = [
    { key: 'school', label: 'Nearest school', emoji: '🎓' },
    { key: 'hospital', label: 'Nearest hospital',emoji: '🏥' },
    { key: 'pharmacy', label: 'Nearest pharmacy', emoji: '💊' },
    { key: 'grocery', label: 'Nearest grocery', emoji: '🛒' },
    { key: 'restaurant',label: 'Nearest restaurant', emoji: '🍽️' },
    { key: 'train', label: 'Nearest train station', emoji: '🚆' },
    { key: 'bus', label: 'Nearest bus stop', emoji: '🚌' },
  ];

  const { lat, lng } = plot.coordinates;

  const distances = DISTANCE_CATS.map(cat => {
    const matching = places.filter(el => categorise(el) === cat.key);
    if (!matching.length) return { ...cat, dist: null, name: null };

    let closest = null;
    let minDist  = Infinity;
    for (const el of matching) {
      const d = getDistanceKm(lat, lng, el.lat, el.lon);
      if (d < minDist) { minDist = d; closest = el; }
    }
    return {
      ...cat,
      dist: minDist,
      name: closest?.tags?.name || null,
    };
  }).filter(d => d.dist !== null);

  if (!distances.length) return null;

  return (
    <div className="px-6 py-4 border-t border-gray-100">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
        Nearby at a glance
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {distances.map(d => (
          <div key={d.key}
            className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
            <span className="text-base flex-shrink-0">{d.emoji}</span>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 font-medium truncate">{d.label}</p>
              <p className="text-sm font-bold text-gray-800">
                {d.dist < 1
                  ? `${Math.round(d.dist * 1000)}m`
                  : `${d.dist.toFixed(1)}km`}
              </p>
              {d.name && (
                <p className="text-[10px] text-gray-400 truncate">{d.name}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MyProperty() {
  const [lightbox, setLightbox] = useState(false);
  const [places, setPlaces] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [activeCategories, setActiveCategories] = useState(['home']);
  const navigate = useNavigate();
  const { selectedPlot: plot, plotLoading: loading } = useApp();


  useEffect(() => {
    if (!plot?.coordinates) return;
    setPlacesLoading(true);
    fetchNearby(plot.coordinates.lat, plot.coordinates.lng)
      .then(setPlaces)
      .catch(() => setPlaces([]))
      .finally(() => setPlacesLoading(false));
  }, [plot?.coordinates?.lat, plot?.coordinates?.lng]);

  function toggleCategory(key) {
    setActiveCategories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  const pinIcons = Object.fromEntries(
    CATEGORIES.map(c => [c.key, makePinIcon(c.emoji, c.color)])
  );

  const visiblePlaces = (() => {
    const seen = new Set();
    const counts = {};
    return places.filter(el => {
      const cat = categorise(el);
      if (!cat || !activeCategories.includes(cat)) return false;
      if (seen.has(el.id)) return false;
      counts[cat] = (counts[cat] || 0) + 1;
      if (counts[cat] > 8) return false;
      seen.add(el.id);
      return true;
    });
  })();

  const mapsUrl = plot?.coordinates
    ? `https://www.google.com/maps?q=${plot.coordinates.lat},${plot.coordinates.lng}`
    : `https://www.google.com/maps?q=${encodeURIComponent(plot?.address)}`;

  if (loading) return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!plot) return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl mb-3">🏠</p>
        <p className="text-gray-500 font-medium">No plot assigned yet</p>
        <p className="text-gray-400 text-sm mt-1">Contact your developer to get started.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Property</h1>
            <p className="text-xs text-gray-400 mt-0.5">{plot.development} · Plot {plot.plotNumber}</p>
          </div>
          <StatusBadge status={plot.status} />
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Plot Details</p>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Development</span>
                <span className="font-semibold text-gray-800">{plot.development}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Plot Number</span>
                <span className="font-semibold text-gray-800">{plot.plotNumber}</span>
              </div>
              {plot.houseType && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">House Type</span>
                  <span className="font-semibold text-gray-800">{plot.houseType}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Bedrooms</span>
                <span className="font-semibold text-gray-800">{plot.bedrooms} 🛏️</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Bathrooms</span>
                <span className="font-semibold text-gray-800">{plot.bathrooms} 🚿</span>
              </div>
              {plot.floorArea && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Floor Area</span>
                  <span className="font-semibold text-gray-800">{plot.floorArea}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Address</span>
                <span className="font-semibold text-gray-800 text-right max-w-[55%]">{plot.address}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Floor Plan</p>
            {plot.floorPlanUrl ? (
              <>
                <div
                  className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-50 cursor-zoom-in border border-gray-100"
                  onClick={() => setLightbox(true)}
                >
                  <img src={plot.floorPlanUrl} alt="Floor plan" className="w-full h-full object-contain" />
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">Click to view full plan</p>
              </>
            ) : (
              <div className="w-full aspect-[4/3] rounded-xl bg-gray-50 border border-dashed border-gray-200 flex flex-col items-center justify-center">
                <p className="text-3xl mb-2">📐</p>
                <p className="text-gray-400 text-sm">Floor plan not uploaded yet</p>
              </div>
            )}
          </div>
        </div>

        {plot.developer && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Your Developer</p>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-full bg-[#eef7f5] text-[#214f49] font-bold text-lg flex items-center justify-center shrink-0">
                  {plot.developer.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{plot.developer.name}</p>
                  <p className="text-xs text-gray-400">Property Developer</p>
                </div>
              </div>
              <div className="space-y-3">
                <a href={`mailto:${plot.developer.email}`}
                  className="flex items-center gap-3 text-sm text-gray-600 hover:text-[#214f49] transition group">
                  <span className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-[#eef7f5] flex items-center justify-center text-base transition">✉️</span>
                  <span className="truncate">{plot.developer.email}</span>
                </a>
                {plot.developer.phone && (
                  <a href={`tel:${plot.developer.phone}`}
                    className="flex items-center gap-3 text-sm text-gray-600 hover:text-[#214f49] transition group">
                    <span className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-[#eef7f5] flex items-center justify-center text-base transition">📞</span>
                    <span>{plot.developer.phone}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {plot.coordinates && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Location & Nearby</p>
              <p className="text-sm font-semibold text-gray-800">{plot.development}</p>
              <p className="text-sm text-gray-500">{plot.address}</p>
            </div>

            <div className="px-6 pb-4 flex flex-wrap gap-2">
              {CATEGORIES.map(cat => {
                const active = activeCategories.includes(cat.key);
                const count  = cat.key === 'home' ? null
                  : places.filter(el => categorise(el) === cat.key).length;
                return (
                  <button key={cat.key}
                    onClick={() => cat.key !== 'home' && toggleCategory(cat.key)}
                    style={active ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                      border-2 transition-all
                      ${active
                        ? 'text-white shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                      }
                      ${cat.key === 'home' ? 'cursor-default' : 'cursor-pointer'}`}>
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                    {count !== null && (
                      <span className={`text-[10px] font-bold px-1 rounded-full
                        ${active ? 'bg-white/25' : 'bg-gray-200 text-gray-500'}`}>
                        {placesLoading ? '…' : count > 8 ? '8+' : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="h-80 w-full z-0">
              <MapContainer
                center={[plot.coordinates.lat, plot.coordinates.lng]}
                zoom={15}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                />

                <Marker
                  position={[plot.coordinates.lat, plot.coordinates.lng]}
                  icon={pinIcons['home']}
                >
                  <Popup>
                    <strong>{plot.development}</strong><br />{plot.address}
                  </Popup>
                </Marker>

                {visiblePlaces.map(el => {
                  const cat = categorise(el);
                  const cfg = CATEGORIES.find(c => c.key === cat);
                  return (
                    <Marker
                      key={el.id}
                      position={[el.lat, el.lon]}
                      icon={pinIcons[cat]}
                    >
                      <Popup>
                        <div className="text-sm">
                          <span className="mr-1">{cfg?.emoji}</span>
                          <strong>{el.tags?.name || cfg?.label}</strong>
                          {el.tags?.['addr:street'] && (
                            <p className="text-gray-500 text-xs mt-0.5">{el.tags['addr:street']}</p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                <FitBounds
                  markers={[
                    { lat: plot.coordinates.lat, lng: plot.coordinates.lng },
                    ...visiblePlaces.map(el => ({ lat: el.lat, lon: el.lon })),
                  ]}
                />
              </MapContainer>
            </div>

            <NearbyDistances plot={plot} places={places} />
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs font-semibold text-[#1a4a45] hover:underline flex items-center gap-1">
                Open in Google Maps →
              </a>
            </div>
          </div>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-[2000] flex items-start justify-center p-4 overflow-y-auto"
          onClick={() => setLightbox(false)}>
          <div className="relative w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-white rounded-t-2xl px-5 py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-800">Floor Plan</p>
                <p className="text-xs text-gray-400">{plot.development} · Plot {plot.plotNumber}</p>
              </div>
              <button onClick={() => setLightbox(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm transition">
                ✕
              </button>
            </div>
            <div className="bg-white rounded-b-2xl overflow-hidden">
              <img src={plot.floorPlanUrl} alt="Floor plan" className="w-full h-auto block" />
            </div>
            <p className="text-center text-xs text-white/50 mt-3">Click outside to close</p>
          </div>
        </div>
      )}
    </div>
  );
}
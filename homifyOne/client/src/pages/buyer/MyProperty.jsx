import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});


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

export default function MyProperty() {
  const [plot, setPlot]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [lightbox, setLightbox] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/plots/my')
      .then(r => setPlot(r.data.plot))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  
  const mapsUrl = plot.coordinates
    ? `https://www.google.com/maps?q=${plot.coordinates.lat},${plot.coordinates.lng}`
    : `https://www.google.com/maps?q=${encodeURIComponent(plot.address)}`;


  return (
    <div className="min-h-screen bg-[#f8f7f4]">

      {/* Top bar */}
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

        {/* ── Row 1: Plot details + Floor Plan ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Plot details */}
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

          {/* Floor Plan */}
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

        {/* ── Row 2: Developer contact ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Developer contact */}
          {plot.developer && (
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
          )}
        </div>

        {/* ── Location ── */}
        {plot.coordinates && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Location</p>
            <p className="text-sm font-semibold text-gray-800">{plot.development}</p>
            <p className="text-sm text-gray-500">{plot.address}</p>
            </div>
            <div className="h-56 w-full z-0">
            <MapContainer
                center={[plot.coordinates.lat, plot.coordinates.lng]}
                zoom={15}
                scrollWheelZoom={false}
                className="h-full w-full"
            >
                <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                />
                <Marker position={[plot.coordinates.lat, plot.coordinates.lng]}>
                <Popup>
                    <strong>{plot.development}</strong><br />{plot.address}
                </Popup>
                </Marker>
            </MapContainer>
            </div>
        </div>
        )}

      </div>

      {/* ── Floor Plan Lightbox ── */}
        {lightbox && (
        <div
            className="fixed inset-0 bg-black/80 z-[2000] flex items-start justify-center p-4 overflow-y-auto"
            onClick={() => setLightbox(false)}
        >
            <div
            className="relative w-full max-w-2xl my-8"
            onClick={e => e.stopPropagation()}
            >
            {/* Header bar */}
            <div className="flex items-center justify-between bg-white rounded-t-2xl px-5 py-3 border-b border-gray-100">
                <div>
                <p className="text-sm font-bold text-gray-800">Floor Plan</p>
                <p className="text-xs text-gray-400">{plot.development} · Plot {plot.plotNumber}</p>
                </div>
                <button
                onClick={() => setLightbox(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm transition"
                >✕</button>
            </div>

            {/* Image — full natural height, scrollable */}
            <div className="bg-white rounded-b-2xl overflow-hidden">
                <img
                src={plot.floorPlanUrl}
                alt="Floor plan"
                className="w-full h-auto block"
                />
            </div>

            {/* Footer hint */}
            <p className="text-center text-xs text-white/50 mt-3">Click outside to close</p>
            </div>
        </div>
        )}
    </div>
  );
}
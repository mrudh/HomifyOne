import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

const pinIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const PLOT_STATUS_MAP = {
  available:            { label: 'Available',        cls: 'bg-gray-100 text-gray-500' },
  assigned:             { label: 'Assigned',          cls: 'bg-gray-100 text-gray-600' },
  selections_pending:   { label: 'In Progress',       cls: 'bg-yellow-100 text-yellow-700' },
  selections_submitted: { label: 'Awaiting Review',   cls: 'bg-blue-100 text-blue-700' },
  selections_rejected:  { label: 'Changes Requested', cls: 'bg-red-100 text-red-700' },
  selections_approved:  { label: 'Approved ✓',        cls: 'bg-green-100 text-green-700' },
  completed:            { label: 'Completed',         cls: 'bg-teal-100 text-teal-700' },
};

function StatusBadge({ status }) {
  const s = PLOT_STATUS_MAP[status] || PLOT_STATUS_MAP.available;
  return <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${s.cls}`}>{s.label}</span>;
}

function DeadlineModal({ plot, onClose, onSaved }) {
  const [date, setDate] = useState(plot.deadline ? plot.deadline.slice(0, 10) : '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!date) return;
    setSaving(true);
    try {
      const { data } = await api.patch(`/plots/${plot._id}/deadline`, { deadline: date });
      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[999] p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
        <h3 className="font-bold text-gray-900">Set Selection Deadline</h3>
        <p className="text-xs text-gray-400">Plot {plot.plotNumber} · {plot.development}</p>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !date}
            className="flex-1 bg-[#1a4a45] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DrillDownPanel({ development, plots, onClose, onEditDeadline }) {
    const navigate = useNavigate();
  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-[998] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">{development}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{plots.length} plot{plots.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
      </div>

      <div className="p-4 space-y-3">
        {plots.map(plot => (
          <div key={plot._id} className="border border-gray-100 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-900 text-sm">Plot {plot.plotNumber}</p>
              {plot.status === 'selections_submitted' ? (
                <button
                    type="button"
                    onClick={() => navigate(`/developer/orders/${plot._id}`)}
                    className="cursor-pointer"
                >
                    <StatusBadge status={plot.status} />
                </button>
                ) : (
                <StatusBadge status={plot.status} />
            )}
            </div>
            <p className="text-xs text-gray-500">
              {plot.buyer ? plot.buyer.name : 'No buyer assigned'}
            </p>
            {plot.buyer && (
                <p className="text-xs text-gray-400">
                    {plot.buyer.email}
                    {/* {plot.buyer.phone && ` · ${plot.buyer.phone}`} */}
                </p>
            )}
            {plot.deadline && (
              <p className="text-xs text-gray-400">
                Deadline: {new Date(plot.deadline).toLocaleDateString('en-GB')}
              </p>
            )}
            {plot.buyer && (
              <button onClick={() => onEditDeadline(plot)}
                className="text-xs font-semibold text-[#1a4a45] hover:underline">
                {plot.deadline ? 'Edit Deadline' : 'Set Deadline'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlotsBuyersPage() {
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deadlinePlot, setDeadlinePlot] = useState(null);
  const [activeDev, setActiveDev] = useState(null);
  const navigate = useNavigate();
  
  // const fetchPlots = () => {
  //   api.get('/plots/developer')
  //     .then(r => setPlots(r.data.plots || []))
  //     .finally(() => setLoading(false));
  // };

  const fetchPlots = async () => {
    try {
      const r = await api.get('/plots/developer');
      setPlots(r.data.plots || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlots(); }, []);

  const developments = Object.values(
    plots.reduce((acc, plot) => {
      if (!plot.coordinates?.lat || !plot.coordinates?.lng) return acc;
      if (!acc[plot.development]) {
        acc[plot.development] = { name: plot.development, coordinates: plot.coordinates, plots: [] };
      }
      acc[plot.development].plots.push(plot);
      return acc;
    }, {})
  );

  const mapCenter = developments.length > 0
    ? [developments[0].coordinates.lat, developments[0].coordinates.lng]
    : [51.5074, -0.1278];

  if (loading) return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Plots & Buyers</h1>
      </div>

      <div className="px-6 py-6 max-w-6xl space-y-8">
        <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm h-96">
          <MapContainer center={mapCenter} zoom={7} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {developments.map(dev => (
              <Marker
                key={dev.name}
                position={[dev.coordinates.lat, dev.coordinates.lng]}
                icon={pinIcon}
                eventHandlers={{ click: () => setActiveDev(dev) }}
              >
                <Popup>
                  <p className="font-bold">{dev.name}</p>
                  <p className="text-xs">{dev.plots.length} plot{dev.plots.length !== 1 ? 's' : ''}</p>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div>
          <h2 className="text-sm font-bold text-gray-500 tracking-widest mb-3">
            🏠 All Plots ({plots.length})
          </h2>
          <div className="space-y-3">
            {plots.map(plot => (
              <div key={plot._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
                <div className="text-left">
                  <p className="font-bold text-gray-900 text-sm">Plot {plot.plotNumber} · {plot.development}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {plot.buyer ? plot.buyer.name : 'No buyer assigned'}
                    {plot.deadline && ` · Deadline: ${new Date(plot.deadline).toLocaleDateString('en-GB')}`}
                  </p>
                  {plot.buyer && (
                    <p className="text-xs text-gray-400 mt-0.5">
                        {plot.buyer.email}
                        {/* {plot.buyer.phone && ` | ${plot.buyer.phone}`} */}
                    </p>
                )}
                </div>
                <div className="flex items-center gap-3">
                  {plot.status === 'selections_submitted' ? (
                        <button
                            type="button"
                            onClick={() => navigate(`/developer/orders/${plot._id}`)}
                            className="cursor-pointer"
                        >
                            <StatusBadge status={plot.status} />
                        </button>
                        ) : (
                        <StatusBadge status={plot.status} />
                    )}
                  {plot.buyer && (
                    <button onClick={() => setDeadlinePlot(plot)}
                      className="border border-gray-200 px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50">
                      {plot.deadline ? 'Edit Deadline' : 'Set Deadline'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {activeDev && (
        <DrillDownPanel
          development={activeDev.name}
          plots={activeDev.plots}
          onClose={() => setActiveDev(null)}
          onEditDeadline={(plot) => { setDeadlinePlot(plot); setActiveDev(null); }}
        />
      )}

      {deadlinePlot && (
        <DeadlineModal
          plot={deadlinePlot}
          onClose={() => setDeadlinePlot(null)}
          onSaved={fetchPlots}
          // onSaved={(updated) => setPlots(prev => prev.map(p => p._id === updated._id ? updated : p))}
        />
      )}
    </div>
  );
}
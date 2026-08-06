import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import PlotFilterDropdown from '../../components/PlotFilterDropdown';

const pinIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const PLOT_STATUS_MAP = {
  available: { label: "Available", cls: "bg-gray-100 text-gray-500" },
  assigned: { label: "Assigned", cls: "bg-gray-100 text-gray-600" },
  selections_submitted: {
    label: "Awaiting Review",
    cls: "bg-blue-100 text-blue-700",
  },
  selections_rejected: {
    label: "Changes Requested",
    cls: "bg-red-100 text-red-700",
  },
  selections_approved: {
    label: "Approved",
    cls: "bg-green-100 text-green-700",
  },
  completed: { label: "Completed", cls: "bg-teal-100 text-teal-700" },
};

const DEADLINE_EXPIRED_KEY = 'deadline_expired';
const DEADLINE_EXPIRED_DISPLAY = { label: 'Selections Pending', cls: 'bg-amber-100 text-amber-700' };

function StatusBadge({ status, locked }) {
  const s = locked ? DEADLINE_EXPIRED_DISPLAY : (PLOT_STATUS_MAP[status] || PLOT_STATUS_MAP.available);
  return <span className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

const ORDER_STATUS_MAP = {
  none: { label: "None", cls: "bg-gray-100 text-gray-500" },
  in_progress: { label: "In Progress", cls: "bg-amber-100 text-amber-700" },
  delivered: { label: "Delivered ✓", cls: "bg-teal-100 text-teal-700" },
};

function OrderStatusBadge({ status }) {
  const s = ORDER_STATUS_MAP[status] || ORDER_STATUS_MAP.none;
  return <span className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${s.cls}`}>{s.label}</span>;
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
                    <StatusBadge status={plot.status} locked={plot.selectionsLocked} />
                </button>
                ) : (
                <StatusBadge status={plot.status} locked={plot.selectionsLocked} />
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
            {plot.buyer && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {plot.ordersCount ?? 0} order{(plot.ordersCount ?? 0) !== 1 ? 's' : ''}
                </span>
                <OrderStatusBadge status={plot.orderStatus || 'none'} />
              </div>
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [plotFilter, setPlotFilter] = useState([]);
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

  const sortedPlots = [...plots].sort((a, b) => a.plotNumber.localeCompare(b.plotNumber, undefined, { numeric: true }));

  const filteredPlots = plots.filter(plot => {
    if (plotFilter.length > 0 && !plotFilter.includes(plot._id)) return false;
    const displayStatus = plot.selectionsLocked ? DEADLINE_EXPIRED_KEY : plot.status;
    if (statusFilter !== 'all' && displayStatus !== statusFilter) return false;
    if (orderStatusFilter !== 'all' && (plot.orderStatus || 'none') !== orderStatusFilter) return false;
    return true;
  });

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

      <div className="px-6 py-6 max-w-full space-y-8">
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
            🏠 All Plots ({filteredPlots.length}{filteredPlots.length !== plots.length ? ` of ${plots.length}` : ''})
          </h2>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <PlotFilterDropdown plots={sortedPlots} selected={plotFilter} onChange={setPlotFilter} />
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white sm:w-56"
            >
              <option value="all">All Order Statuses</option>
              {Object.entries(ORDER_STATUS_MAP).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white sm:w-56"
            >
              <option value="all">All Selection Statuses</option>
              {Object.entries(PLOT_STATUS_MAP)
                .filter(([key]) => key !== 'selections_pending')
                .map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              <option value={DEADLINE_EXPIRED_KEY}>{DEADLINE_EXPIRED_DISPLAY.label}</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-4 py-3 whitespace-nowrap">Plot</th>
                    <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-4 py-3 whitespace-nowrap">Buyer</th>
                    <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-4 py-3 whitespace-nowrap">Deadline</th>
                    <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-4 py-3 whitespace-nowrap">Orders</th>
                    <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-4 py-3 whitespace-nowrap">Order Status</th>
                    <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-4 py-3 whitespace-nowrap">Selection Status</th>
                    <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-4 py-3 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlots.map(plot => (
                    <tr key={plot._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition">
                      <td className="text-left px-4 py-4 align-top whitespace-nowrap">
                        <p className="font-bold text-gray-900">Plot {plot.plotNumber}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{plot.development}</p>
                      </td>
                      <td className="text-left px-4 py-4 align-top">
                        {plot.buyer ? (
                          <>
                            <p className="text-gray-700 font-medium whitespace-nowrap">{plot.buyer.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">{plot.buyer.email}</p>
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs whitespace-nowrap">No buyer assigned</span>
                        )}
                      </td>
                      <td className="text-left px-4 py-4 align-top text-gray-500 text-xs whitespace-nowrap">
                        {plot.deadline ? new Date(plot.deadline).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="text-left px-4 py-4 align-top text-gray-700 font-semibold whitespace-nowrap">
                        {plot.ordersCount ?? 0}
                      </td>
                      <td className="text-left px-4 py-4 align-top whitespace-nowrap">
                        <OrderStatusBadge status={plot.orderStatus || 'none'} />
                      </td>
                      <td className="text-left px-4 py-4 align-top whitespace-nowrap">
                        {plot.status === 'selections_submitted' ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/developer/orders/${plot._id}`)}
                            className="cursor-pointer"
                          >
                            <StatusBadge status={plot.status} locked={plot.selectionsLocked} />
                          </button>
                        ) : (
                          <StatusBadge status={plot.status} locked={plot.selectionsLocked} />
                        )}
                      </td>
                      <td className="text-left px-4 py-4 align-top whitespace-nowrap">
                        {plot.buyer && (
                          <button onClick={() => setDeadlinePlot(plot)}
                            className="border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 whitespace-nowrap">
                            {plot.deadline ? 'Edit Deadline' : 'Set Deadline'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredPlots.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400 text-sm">No plots match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
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
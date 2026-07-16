import { useEffect, useState } from 'react';
import api from '../../services/api';

const PLOT_STATUS_MAP = {
    available: {
        label: 'Available',
        cls: 'bg-gray-100 text-gray-500'
    },
    assigned: {
        label: 'Assigned',
        cls: 'bg-gray-100 text-gray-600'
    },
    selections_pending: {
        label: 'In Progress',
        cls: 'bg-yellow-100 text-yellow-700'
    },
    selections_submitted: {
        label: 'Awaiting Review',
        cls: 'bg-blue-100 text-blue-700'
    },
    selections_rejected: {
        label: 'Changes Requested',
        cls: 'bg-red-100 text-red-700'
    },
    selections_approved: {
        label: 'Approved ✓',
        cls: 'bg-green-100 text-green-700'
    },
    completed: {
        label: 'Completed',
        cls: 'bg-teal-100 text-teal-700'
    },
};

const ORDER_STATUS_MAP = {
    submitted: {
        label: 'Awaiting Review',
        cls: 'bg-blue-100 text-blue-700'
    },
    approved: {
        label: 'Approved',
        cls: 'bg-green-100 text-green-700'
    },
    rejected: {
        label: 'Rejected',
        cls: 'bg-red-100 text-red-700'
    },
};

function DeadlineModal({ plot, onClose, onSaved }) {
  const [date, setDate] = useState(plot.deadline ? plot.deadline.slice(0, 10) : '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!date) return;
    setSaving(true);
    try {
      const { data } = await api.patch(`/plots/${plot._id}/deadline`, { deadline: date });
      onSaved(data.plot);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
        <h3 className="font-bold text-gray-900">Set Selection Deadline</h3>
        <p className="text-xs text-gray-400">Plot {plot.plotNumber} · {plot.development}</p>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
        />
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

function RejectModal({ order, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleReject = async () => {
    if (!reason.trim()) return setError('Please provide a reason.');
    setSaving(true);
    try {
      await api.patch(`/selections/developer/orders/${order._id}/reject`, { reason });
      onDone();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject order.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
        <h3 className="font-bold text-gray-900">Reject Selections</h3>
        <p className="text-xs text-gray-400">
          {order.buyer?.name} · Plot {order.plot?.plotNumber}
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Explain what needs to change…"
          rows={4}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600">
            Cancel
          </button>
          <button onClick={handleReject} disabled={saving}
            className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
            {saving ? 'Rejecting…' : 'Reject with Reason'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DeveloperDashboard() {
  const [plots, setPlots] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deadlinePlot, setDeadlinePlot] = useState(null);
  const [rejectOrder, setRejectOrder] = useState(null);
  const [approving, setApproving] = useState(null);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    try {
      const [plotsRes, ordersRes] = await Promise.all([
        api.get('/plots/developer'),
        api.get('/selections/developer/orders'),
      ]);
      setPlots(plotsRes.data.plots || []);
      setOrders(ordersRes.data.orders || []);
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const pendingOrders = orders.filter(o => o.status === 'submitted');
  const approvedCount = orders.filter(o => o.status === 'approved').length;

  const handleApprove = async (orderId) => {
    setApproving(orderId);
    try {
      await api.patch(`/selections/developer/orders/${orderId}/approve`);
      fetchAll();
    } catch {
      setError('Failed to approve order.');
    } finally {
      setApproving(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Developer Dashboard</h1>
      </div>

      <div className="px-6 py-6 max-w-6xl space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
                label: 'Total Plots',
                value: plots.length,
                icon: '🏠',
                accent: 'border-l-[#1a4a45]'
            }, {
                label: 'Awaiting Review',
                value: pendingOrders.length,
                icon: '📋',
                accent: 'border-l-blue-400'
            }, {
                label: 'Approved Orders',
                value: approvedCount,
                icon: '✅',
                accent: 'border-l-green-500'
            }, {
                label: 'Buyers Assigned',
                value: plots.filter(p => p.buyer).length,
                icon: '👥',
                accent: 'border-l-amber-400'
            },
          ].map(card => (
            <div key={card.label} className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${card.accent} shadow-sm p-5`}>
              <span className="text-2xl">{card.icon}</span>
              <div className="text-xl font-bold text-gray-800 mt-3">{card.value}</div>
              <p className="text-xs font-semibold text-gray-700 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-sm font-bold text-gray-500 tracking-widest mb-3">
            📋 Selections Awaiting Review ({pendingOrders.length})
          </h2>
          {pendingOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
              No submissions waiting for review.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map(order => (
                <div key={order._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{order.buyer?.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Plot {order.plot?.plotNumber} · {order.plot?.development} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Submitted {new Date(order.createdAt).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-extrabold text-[#1a4a45]">£{order.pricing.finalTotal.toLocaleString()}</p>
                    <button onClick={() => setRejectOrder(order)}
                      className="border border-red-200 text-red-500 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-red-50">
                      Reject
                    </button>
                    <button onClick={() => handleApprove(order._id)} disabled={approving === order._id}
                      className="bg-[#1a4a45] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#153d38] disabled:opacity-50">
                      {approving === order._id ? 'Approving…' : 'Approve'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-bold text-gray-500 tracking-widest mb-3">
            🏠 Plots & Buyers ({plots.length})
          </h2>
          <div className="space-y-3">
            {plots.map(plot => {
              const s = PLOT_STATUS_MAP[plot.status] || PLOT_STATUS_MAP.available;
              return (
                <div key={plot._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Plot {plot.plotNumber} · {plot.development}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {plot.buyer ? plot.buyer.name : 'No buyer assigned'}
                      {plot.deadline && ` · Deadline: ${new Date(plot.deadline).toLocaleDateString('en-GB')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${s.cls}`}>{s.label}</span>
                    {plot.buyer && (
                      <button onClick={() => setDeadlinePlot(plot)}
                        className="border border-gray-200 px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50">
                        {plot.deadline ? 'Edit Deadline' : 'Set Deadline'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {deadlinePlot && (
        <DeadlineModal
          plot={deadlinePlot}
          onClose={() => setDeadlinePlot(null)}
          onSaved={(updated) => setPlots(prev => prev.map(p => p._id === updated._id ? updated : p))}
        />
      )}
      {rejectOrder && (
        <RejectModal
          order={rejectOrder}
          onClose={() => setRejectOrder(null)}
          onDone={fetchAll}
        />
      )}
    </div>
  );
}
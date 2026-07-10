import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const STATUS_STYLES = {
  pending: { label: 'Pending', cls: 'bg-yellow-100 text-yellow-700' },
  sent: { label: 'Sent', cls: 'bg-blue-100 text-blue-700' },
  fulfilled: { label: 'Fulfilled', cls: 'bg-green-100 text-green-700' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${s.cls}`}>
      {s.label}
    </span>
  );
};

export default function SupplierPurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('/purchase-orders');
        setOrders(res.data.orders);
      } catch (err) {
        setError('Failed to load purchase orders.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filtered = statusFilter === 'all'
    ? orders
    : orders.filter((o) => o.status === statusFilter);

  const totals = {
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    sent: orders.filter((o) => o.status === 'sent').length,
    fulfilled: orders.filter((o) => o.status === 'fulfilled').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-f8f7f4 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-1a4a45 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-f8f7f4">
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Purchase Orders</h1>
        <p className="text-xs text-gray-400 mt-0.5">Orders assigned to you from developers</p>
      </div>

      <div className="px-6 py-6 max-w-6xl mx-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-6">
          {['all', 'pending', 'sent', 'fulfilled'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-sm font-medium px-4 py-2 rounded-xl border transition ${
                statusFilter === s
                  ? 'bg-1a4a45 text-white border-1a4a45'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-1a4a45'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} ({totals[s]})
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500 font-medium">No purchase orders yet</p>
            <p className="text-gray-400 text-sm mt-1">New orders from developers will appear here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Plot</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Developer</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Items</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Total</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-800">{order.plot?.plotNumber}</div>
                      <div className="text-xs text-gray-400">{order.plot?.development}</div>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{order.developer?.name}</td>
                    <td className="px-5 py-4 text-gray-600">{order.items.length} items</td>
                    <td className="px-5 py-4 font-semibold text-gray-800">
                      £{order.totalCost.toLocaleString()}
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={order.status} /></td>
                    <td className="px-5 py-4 text-gray-400 text-xs">
                      {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => navigate(`/supplier/purchase-orders/${order._id}`)}
                        className="text-1a4a45 text-sm font-medium hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
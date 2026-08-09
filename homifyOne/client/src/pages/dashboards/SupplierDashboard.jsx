import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export const daysAgo = (date) => Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
export const daysUntil = (date) => Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

function StatCard({ label, value, icon, accent }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${accent} shadow-sm p-5`}>
      <span className="text-2xl">{icon}</span>
      <div className="text-xl font-bold text-gray-800 mt-3">{value}</div>
      <p className="text-xs font-semibold text-gray-700 mt-1">{label}</p>
    </div>
  );
}

export default function SupplierDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ordersRes = await api.get('/purchase-orders');
        setOrders(ordersRes.data.orders || []);
      } catch (err) {
        console.error('Failed to load supplier dashboard:', err.response?.data || err.message);
        setError('Failed to load some dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pending = orders.filter((o) => o.status === 'pending');
  const acknowledged = orders.filter((o) => o.status === 'acknowledged');
  const fulfilled = orders.filter((o) => o.status === 'fulfilled');
  const totalValue = orders.reduce((sum, o) => sum + (o.totalCost || 0), 0);

  const needsAcknowledgment = [...pending].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  const upcomingDeliveries = orders
    .filter((o) => o.eta && o.status !== 'fulfilled')
    .sort((a, b) => new Date(a.eta) - new Date(b.eta));

  return (
    <div>
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <h1 className="text-md font-bold text-gray-900">Supplier Dashboard</h1>
        <p className="text-xs text-gray-400 mt-0.5">A quick look at what needs your attention today</p>
      </div>

      <div className="px-6 py-6 max-w-6xl space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Stat row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Pending" value={pending.length} icon="⏳" accent="border-l-yellow-400" />
          <StatCard label="Acknowledged" value={acknowledged.length} icon="✅" accent="border-l-blue-400" />
          <StatCard label="Fulfilled" value={fulfilled.length} icon="📦" accent="border-l-green-500" />
          <StatCard label="Total Order Value" value={`£${totalValue.toLocaleString()}`} icon="💷" accent="border-l-[#1a4a45]" />
        </div>

        {/* Needs acknowledgment */}
        <div>
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-gray-500 tracking-widest text-left">
              ⏳ Needs Acknowledgment ({needsAcknowledgment.length})
            </h2>
            {needsAcknowledgment.length > 0 && (
              <button
                onClick={() => navigate('/supplier/purchase-orders')}
                className="text-xs font-semibold text-[#1a4a45] hover:underline whitespace-nowrap shrink-0"
              >
                View all →
              </button>
            )}
          </div>
          {needsAcknowledgment.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
              Nothing waiting on you — all caught up.
            </div>
          ) : (
            <div className="space-y-3">
              {needsAcknowledgment.slice(0, 5).map((order) => {
                const age = daysAgo(order.createdAt);
                return (
                  <div
                    key={order._id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap"
                  >
                    <div className="text-left">
                      <p className="font-bold text-gray-900 text-sm">
                        Plot {order.plot?.plotNumber} · {order.plot?.development}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {order.developer?.name} · {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                      </p>
                      <p className={`text-xs mt-0.5 font-medium ${age >= 3 ? 'text-red-500' : 'text-gray-400'}`}>
                        Received {age === 0 ? 'today' : `${age} day${age !== 1 ? 's' : ''} ago`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-extrabold text-[#1a4a45]">£{(order.totalCost || 0).toLocaleString()}</p>
                      <button
                        onClick={() => navigate(`/supplier/purchase-orders/${order._id}`)}
                        className="bg-[#1a4a45] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#2d6b62] transition"
                      >
                        Review →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming deliveries */}
        <div>
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-gray-500 tracking-widest text-left">
              🚚 Upcoming Deliveries ({upcomingDeliveries.length})
            </h2>
            {upcomingDeliveries.length > 0 && (
              <button
                onClick={() => navigate('/supplier/purchase-orders')}
                className="text-xs font-semibold text-[#1a4a45] hover:underline whitespace-nowrap shrink-0"
              >
                View all →
              </button>
            )}
          </div>
          {upcomingDeliveries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
              No delivery ETAs set yet.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingDeliveries.slice(0, 5).map((order) => {
                const remaining = daysUntil(order.eta);
                const overdue = remaining < 0;
                return (
                  <div
                    key={order._id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap"
                  >
                    <div className="text-left">
                      <p className="font-bold text-gray-900 text-sm">
                        Plot {order.plot?.plotNumber} · {order.plot?.development}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {order.developer?.name} · ETA {new Date(order.eta).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${overdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {overdue ? `${Math.abs(remaining)} day${Math.abs(remaining) !== 1 ? 's' : ''} overdue` : remaining === 0 ? 'Due today' : `Due in ${remaining} day${remaining !== 1 ? 's' : ''}`}
                      </span>
                      <button
                        onClick={() => navigate(`/supplier/purchase-orders/${order._id}`)}
                        className="border border-gray-200 px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50"
                      >
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

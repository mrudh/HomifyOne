import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function SupplierDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('/purchase-orders');
        setOrders(res.data.orders || []);
      } catch (err) {
        console.error('Failed to load orders:', err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const pending = orders.filter((o) => o.status === 'pending').length;
  const acknowledged = orders.filter((o) => o.status === 'acknowledged').length;
  const sent = orders.filter((o) => o.status === 'sent').length;
  const fulfilled = orders.filter((o) => o.status === 'fulfilled').length;
  const totalValue = orders.reduce((sum, o) => sum + (o.totalCost || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    { label: 'Pending Orders', value: pending, icon: '⏳', accent: 'border-l-yellow-400' },
    { label: 'Acknowledged', value: acknowledged, icon: '✅', accent: 'border-l-blue-400' },
    { label: 'Sent', value: sent, icon: '🚚', accent: 'border-l-indigo-400' },
    { label: 'Fulfilled', value: fulfilled, icon: '📦', accent: 'border-l-green-500' },
  ];

  return (
    <div>
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Supplier Dashboard</h1>
        <p className="text-xs text-gray-400 mt-0.5">Overview of your assigned purchase orders</p>
      </div>

      <div className="px-6 py-6 max-w-5xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {cards.map((card) => (
            <div key={card.label} className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${card.accent} shadow-sm p-5`}>
              <span className="text-2xl">{card.icon}</span>
              <div className="text-xl font-bold text-gray-800 mt-3">{card.value}</div>
              <p className="text-xs font-semibold text-gray-700 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-400 mb-1">TOTAL ORDER VALUE</p>
            <p className="text-2xl font-bold text-gray-900">£{totalValue.toLocaleString()}</p>
          </div>
          <button
            onClick={() => navigate('/supplier/purchase-orders')}
            className="bg-[#1a4a45] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2d6b62] transition"
          >
            View All Orders
          </button>
        </div>

        {pending > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 flex items-center justify-between">
            <p className="text-sm text-yellow-800 font-medium">
              You have {pending} order{pending !== 1 ? 's' : ''} awaiting acknowledgment.
            </p>
            <button
              onClick={() => navigate('/supplier/purchase-orders')}
              className="text-sm font-semibold text-yellow-800 hover:underline"
            >
              Review now →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
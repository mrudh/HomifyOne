import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const STATUS_MAP = {
  submitted: { label: 'Under Review', cls: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Changes Needed', cls: 'bg-red-100 text-red-700' },
};

export default function OrderStatusPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/selections/orders')
      .then(r => setOrders(r.data.orders || []))
      .catch(() => setError('Failed to load orders.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || orders.length === 0) return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 shadow text-center space-y-4 max-w-sm">
        <p className="text-3xl">📦</p>
        <p className="text-gray-700 font-medium">{error || 'No orders submitted yet.'}</p>
        <button onClick={() => navigate('/buyer/basket')}
          className="bg-[#1a4a45] text-white px-6 py-3 rounded-xl font-semibold">
          Go to Basket
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-10">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-md font-extrabold text-gray-900">Orders & Status</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {orders.length} order{orders.length !== 1 ? 's' : ''} submitted
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {orders.map((order) => {
          const s = STATUS_MAP[order.status] || STATUS_MAP.submitted;
          console.log(s);
          const itemCount = order.items?.length || 0;
          const overBudget = order.pricing.finalTotal > order.pricing.allowance;

          return (
            <div
              key={order._id}
              onClick={() => navigate(`/buyer/orders/${order._id}`)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-[#9ccdc4] transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400 font-medium">
                  Submitted {new Date(order.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${s.cls}`}>{s.label}</span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-sm">
                    {itemCount} item{itemCount !== 1 ? 's' : ''}
                  </p>
                  <p className={`text-xs mt-0.5 font-medium ${overBudget ? 'text-red-500' : 'text-gray-400'}`}>
                    {overBudget ? '⚠️ Over allowance' : 'Within allowance'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-[#1a4a45]">
                    £{order.pricing.finalTotal.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">Order total</p>
                </div>
              </div>

              <div className="flex items-center justify-end mt-3 text-xs font-semibold text-[#1a4a45]">
                View details →
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
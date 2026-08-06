import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function SelectionsReviewPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/selections/developer/orders')
      .then(r => setOrders((r.data.orders || []).filter(o => o.status === 'submitted')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Selections Review</h1>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {orders.length === 0 && (
          <p className="text-sm text-gray-400">No selections awaiting review.</p>
        )}
        {orders.map(order => {
        const items = order.items || [];
        const total = order.pricing?.finalTotal ?? items.reduce((sum, i) => sum + (i.price || 0), 0);
        return (
            <div key={order._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className='text-left'>
                <p className="font-bold text-gray-900 text-sm">{order.buyer?.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                Plot {order.plot?.plotNumber} · {order.plot?.development} · {items.length} items
                </p>
                <p className="text-xs text-gray-400">
                Submitted {new Date(order.createdAt).toLocaleDateString('en-GB')}
                </p>
            </div>
            <div className="flex items-center gap-4">
                <p className="font-bold text-[#1a4a45]">£{total.toLocaleString()}</p>
                <button
                onClick={() => navigate(`/developer/orders/${order.plot._id}`)}
                className="text-sm font-semibold text-[#1a4a45] hover:underline"
                >
                View Order →
                </button>
            </div>
            </div>
        );
        })}
      </div>
    </div>
  );
}
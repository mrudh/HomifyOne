import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const STATUS_MAP = {
  submitted: { label: 'Under Review', cls:'bg-blue-100 text-blue-700' },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Changes Needed',cls: 'bg-red-100 text-red-700' },
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [approvedSpend, setApprovedSpend] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get(`/selections/orders/${id}`),
      api.get('/selections/approved-spend'),
    ])
      .then(([orderRes, spendRes]) => {
        setOrder(orderRes.data.order);
        setApprovedSpend(spendRes.data.approvedSpend || 0);
      })
      .catch(() => setError('Order not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !order) return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 shadow text-center space-y-4 max-w-sm">
        <p className="text-3xl">📦</p>
        <p className="text-gray-700 font-medium">{error || 'Order not found.'}</p>
        <button onClick={() => navigate('/buyer/orders')}
          className="bg-[#1a4a45] text-white px-6 py-3 rounded-xl font-semibold">
          Back to Orders
        </button>
      </div>
    </div>
  );

  const { items, pricing, status } = order;
  const otherApprovedSpend = approvedSpend - (status === 'approved' ? pricing.finalTotal : 0);
  const cumulativeTotal = pricing.finalTotal + otherApprovedSpend;
  const usedPct = pricing.allowance > 0 ? Math.min((cumulativeTotal / pricing.allowance) * 100, 100) : 0;
  const overBudget = cumulativeTotal > pricing.allowance;
  const s = STATUS_MAP[status] || STATUS_MAP.submitted;

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-10">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className='text-left'>
            <button onClick={() => navigate('/buyer/orders')}
              className="text-xs text-gray-400 hover:text-[#1a4a45] font-semibold mb-1">
              ← Back to Orders
            </button>
            <h1 className="text-md font-extrabold text-gray-900">Order Details</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Submitted on {new Date(order.createdAt).toLocaleDateString('en-GB')}
            </p>
          </div>
          <div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${s.cls}`}>{s.label}</span>
          {s.label === "Approved" &&
                order?.summaryPdf?.url && (
                  <div className="relative inline-block group"><button onClick={() => window.open( `http://localhost:5000/api/selections/orders/${order._id}/summary-pdf`, "_blank" ) } className="bg-[#1a4a45] text-white ml-2 px-3 py-2 rounded-full text-sm font-semibold hover:bg-[#153d38] transition" > 📄 </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white opacity-0 group-hover:opacity-100 transition pointer-events-none">
                  Download Selection Summary
                </div>
              </div>
                )}
                </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {pricing.allowance > 0 && (
          <div className={`rounded-2xl p-4 border ${overBudget ? 'bg-red-50 border-red-200' : 'bg-[#1a4a45]/5 border-[#1a4a45]/20'}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-gray-500 font-medium">Your extras allowance</p>
                <p className="text-2xl font-extrabold text-[#1a4a45]">£{pricing.allowance.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-medium">Order total</p>
                <p className={`text-2xl font-extrabold ${overBudget ? 'text-red-500' : 'text-gray-900'}`}>
                  £{pricing.finalTotal.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div className={`h-full rounded-full ${overBudget ? 'bg-red-400' : 'bg-[#1a4a45]'}`}
                style={{ width: `${usedPct}%` }} />
            </div>
            <p className={`text-sm font-semibold ${overBudget ? 'text-red-500' : 'text-[#1a4a45]'}`}>
              {overBudget
                ? `⚠️ £${Math.abs(pricing.allowance - cumulativeTotal).toLocaleString()} over your allowance`
                : `✓ £${(pricing.allowance - cumulativeTotal).toLocaleString()} remaining from your allowance`}
            </p>
            {otherApprovedSpend > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Includes £{otherApprovedSpend.toLocaleString()} already committed from your other approved orders.
              </p>
            )}
          </div>
        )}

        <div>
          <h2 className="text-sm font-bold text-gray-500 tracking-widest mb-3">
            📦 Order Items ({items.length})
          </h2>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 p-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🏠</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.room || item.category}{item.subCategory ? ` · ${item.subCategory}` : ''}
                  </p>
                </div>
                <p className="font-extrabold text-[#1a4a45] text-sm">
                  {item.type === 'standard' && !item.price ? 'Included' : `£${Number(item.price).toLocaleString()}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
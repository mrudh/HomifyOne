import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function OrderReviewPage() {
  const { plotId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    api.get('/selections/developer/orders')
      .then(r => {
        const match = r.data.orders.find(o => String(o.plot?._id) === plotId);
        setOrder(match || null);
      })
      .finally(() => setLoading(false));
  }, [plotId]);

  const handleApprove = async () => {
    if (!window.confirm('Approve this order? Purchase orders will be generated and grouped by supplier.')) return;
    setProcessing(true);
    try {
      const { data } = await api.patch(`/selections/developer/orders/${order._id}/approve`);
      if (data.unmatchedItems?.length > 0) {
        alert(`Note: ${data.unmatchedItems.length} item(s) couldn't be matched to a supplier and were excluded from purchase orders: ${data.unmatchedItems.join(', ')}`);
      }
      navigate('/developer/orders');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) return;
    setProcessing(true);
    try {
      await api.patch(`/selections/developer/orders/${order._id}/reject`, { reason });
      navigate('/developer/orders');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!order) return <p className="p-6 text-sm text-gray-400">Order not found.</p>;

  const { plot, items, pricing } = order;
  const total = pricing?.finalTotal ?? items.reduce((sum, i) => sum + (i.price || 0), 0);

  return (
    <div>
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Order Review</h1>
          <p className="text-xs text-gray-400">Plot {plot.plotNumber} · {plot.development}</p>
        </div>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-800">← Back</button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-500 tracking-widest mb-3">BUYER DETAILS</h2>
          <p className="font-bold text-gray-900">{order.buyer?.name}</p>
          <p className="text-sm text-gray-500">{order.buyer?.email}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <h2 className="text-sm font-bold text-gray-500 tracking-widest px-5 pt-5">
            ORDER ITEMS ({items.length})
          </h2>
          <div className="divide-y divide-gray-50 mt-3">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div className='text-left'>
                  <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400">
                    {item.room || item.category} · {item.subCategory || item.category}
                  </p>
                </div>
                {item.price > 0 ? (
                  <p className="text-sm font-bold text-gray-800">£{item.price.toLocaleString()}</p>
                ) : (
                  <span className="text-xs font-semibold text-green-500 bg-green-50 px-2 py-0.5 rounded-full">Included</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between px-5 py-4 border-t border-gray-100 bg-gray-50">
            <p className="font-bold text-gray-900">Total</p>
            <p className="font-bold text-[#1a4a45]">£{total.toLocaleString()}</p>
          </div>
        </div>

        {order.status === 'submitted' && (
          <div className="flex gap-3">
            <button onClick={() => setShowRejectModal(true)} disabled={processing}
              className="flex-1 border border-red-200 text-red-500 rounded-xl py-3 text-sm font-semibold hover:bg-red-50">
              Reject
            </button>
            <button onClick={handleApprove} disabled={processing}
              className="flex-1 bg-[#1a4a45] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#153d38] disabled:opacity-50">
              {processing ? 'Processing…' : 'Approve'}
            </button>
          </div>
        )}

        {order.status !== 'submitted' && (
          <p className="text-sm text-gray-400 italic">
            This order has already been {order.status}.
          </p>
        )}
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-gray-900">Reject Order</h3>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Provide a reason for rejection…"
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600">
                Cancel
              </button>
              <button onClick={handleReject} disabled={!reason.trim() || processing}
                className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
                {processing ? 'Submitting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
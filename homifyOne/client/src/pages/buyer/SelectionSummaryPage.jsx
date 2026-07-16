import { useEffect, useState } from 'react';
import api from '../../services/api';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const STATUS_MAP = {
  submitted: { label: 'Under Review', cls: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Changes Needed', cls: 'bg-red-100 text-red-700' },
};

export default function SelectionSummaryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/selections/orders')
      .then(r => setOrders(r.data.orders || []))
      .catch(() => setError('Failed to load selection summaries.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = (orderId) => {
    window.open(`${API}/selections/orders/${orderId}/summary-pdf`, '_blank');
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || orders.length === 0) return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 shadow text-center space-y-3 max-w-sm">
        <p className="text-3xl">📄</p>
        <p className="text-gray-700 font-medium">{error || 'No orders submitted yet.'}</p>
        <p className="text-xs text-gray-400">
          Once you submit selections and your developer approves them, the summary will show up here.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-10">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-md font-extrabold text-gray-900">Selection Summary</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {orders.length} order{orders.length !== 1 ? 's' : ''} submitted
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {orders.map((order, idx) => {
          const s = STATUS_MAP[order.status] || STATUS_MAP.submitted;
          const itemCount = order.items?.length || 0;
          const hasSummary = !!order.summaryPdf?.url;
          const orderNumber = orders.length - idx;

          return (
            <div key={order._id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-900">Order #{orderNumber}</p>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${s.cls}`}>{s.label}</span>
              </div>
              <p className="text-xs text-gray-400 mb-1">
                Submitted {new Date(order.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>
              <p className="text-xs text-gray-400 mb-4">
                {itemCount} item{itemCount !== 1 ? 's' : ''} · £{(order.pricing?.finalTotal || 0).toLocaleString()}
              </p>

              {hasSummary ? (
                <button
                  onClick={() => handleDownload(order._id)}
                  className="bg-[#1a4a45] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#153d38] transition"
                >
                  📄 Download Summary
                </button>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  {order.status === 'rejected'
                    ? 'No summary — this order was not approved.'
                    : 'Summary will be available once this order is approved.'}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

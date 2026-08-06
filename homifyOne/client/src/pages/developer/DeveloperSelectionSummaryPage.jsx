import { useEffect, useState } from 'react';
import api from '../../services/api';
import PlotFilterDropdown from '../../components/PlotFilterDropdown';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function DeveloperSelectionSummaryPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plotFilter, setPlotFilter] = useState([]);

  useEffect(() => {
    api.get('/selections/developer/summaries')
      .then(r => setGroups(r.data.groups || []))
      .catch(() => setError('Failed to load selection summaries.'))
      .finally(() => setLoading(false));
  }, []);

  const sortedGroups = [...groups].sort((a, b) =>
    a.plot.plotNumber.localeCompare(b.plot.plotNumber, undefined, { numeric: true })
  );
  const filteredGroups = plotFilter.length === 0
    ? sortedGroups
    : sortedGroups.filter(g => plotFilter.includes(g.plot._id));
  const filterPlots = sortedGroups.map(g => g.plot);

  const handleDownload = (orderId) => {
    window.open(`${API}/selections/orders/${orderId}/summary-pdf`, '_blank');
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || groups.length === 0) return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 shadow text-center space-y-3 max-w-sm">
        <p className="text-3xl">📄</p>
        <p className="text-gray-700 font-medium">{error || 'No approved selections yet.'}</p>
        <p className="text-xs text-gray-400">
          Once you approve a buyer's selections, the summary will show up here, grouped by plot.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-10">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-md font-extrabold text-gray-900">Selection Summaries</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {filteredGroups.length} plot{filteredGroups.length !== 1 ? 's' : ''} with approved selections
            {filteredGroups.length !== groups.length ? ` (of ${groups.length})` : ''}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <PlotFilterDropdown plots={filterPlots} selected={plotFilter} onChange={setPlotFilter} />

        {filteredGroups.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-400 text-sm">
            No approved selections for this plot.
          </div>
        )}

        {filteredGroups.map(({ plot, orders }) => (
          <div key={plot._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">Plot {plot.plotNumber}</p>
                <p className="text-xs text-gray-400">{plot.development}</p>
              </div>
              <span className="text-xs font-semibold text-gray-400">
                {orders.length} order{orders.length !== 1 ? 's' : ''} approved
              </span>
            </div>

            <div className="divide-y divide-gray-50">
              {orders.map((order, idx) => {
                const itemCount = order.items?.length || 0;
                const hasSummary = !!order.summaryPdf?.url;
                return (
                  <div key={order._id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className='text-left'>
                      <p className="text-sm font-semibold text-gray-800">
                        Order #{orders.length - idx} · {order.buyer?.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Approved {new Date(order.updatedAt).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })} · {itemCount} item{itemCount !== 1 ? 's' : ''} · £{(order.pricing?.finalTotal || 0).toLocaleString()}
                      </p>
                    </div>
                    {hasSummary && (
                      <button
                        onClick={() => handleDownload(order._id)}
                        className="bg-[#1a4a45] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#153d38] transition shrink-0"
                      >
                        📄 Download
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
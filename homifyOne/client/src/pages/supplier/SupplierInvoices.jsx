import { useEffect, useState } from 'react';
import api from '../../services/api';
import InvoicePreviewModal from '../../components/InvoicePreviewModal';
import PlotFilterDropdown from '../../components/PlotFilterDropdown';

const STATUS_STYLES = {
  submitted: { label: "Submitted", cls: "bg-green-100 text-gray-600" },
  pending: { label: "Pending", cls: "bg-yellow-100 text-yellow-700" },
  paid: { label: "Paid", cls: "bg-green-100 text-green-700" },
  flagged: { label: "Flagged", cls: "bg-red-100 text-red-700" },
};

const InvoiceStatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.submitted;
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>
      {s.label}
    </span>
  );
};

const fileIcon = (name) => {
  const ext = name?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return '📄';
  if (['jpg', 'jpeg', 'png'].includes(ext)) return '🖼️';
  return '📎';
};

export default function SupplierInvoices() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [plotFilter, setPlotFilter] = useState([]);
  const [preview, setPreview] = useState({ open: false, url: '', name: '' });

  useEffect(() => {
    api.get('/invoices/my')
      .then(res => setGroups(res.data.groups || []))
      .catch(() => setError('Failed to load invoices.'))
      .finally(() => setLoading(false));
  }, []);

  const handleView = async (invoice) => {
    try {
      const res = await api.get(`/invoices/${invoice._id}/download`);
      setPreview({ open: true, url: res.data.url, name: invoice.fileName });
    } catch (err) {
      console.error('Failed to get invoice link', err);
    }
  };

  const closePreview = () => setPreview({ open: false, url: '', name: '' });

  const plotOptions = Array.from(
    new Map(groups.filter(g => g.plot).map(g => [g.plot._id, g.plot])).values()
  );

  const filteredGroups = groups
    .filter(g => plotFilter.length === 0 || plotFilter.includes(g.plot?._id))
    .map(g => ({
      ...g,
      invoices: statusFilter === 'all'
        ? g.invoices
        : g.invoices.filter(inv => inv.status === statusFilter),
    }))
    .filter(g => g.invoices.length > 0);

  const totals = groups.reduce((acc, g) => {
    g.invoices.forEach(inv => {
      acc.all += 1;
      acc[inv.status] = (acc[inv.status] || 0) + 1;
    });
    return acc;
  }, { all: 0 });

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
        <h1 className="text-md font-bold text-gray-900">Invoice History</h1>
        <p className="text-xs text-gray-400 mt-0.5">Your submitted invoices, grouped by plot</p>
      </div>

      <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="mb-2">
          <PlotFilterDropdown plots={plotOptions} selected={plotFilter} onChange={setPlotFilter} />
        </div>

        <div className="flex gap-2 mb-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
          {['all', 'submitted', 'pending', 'paid', 'flagged'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-sm font-medium px-4 py-2 rounded-xl border transition shrink-0 whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-1a4a45 text-gray-500 border-1a4a45'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-1a4a45'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} ({totals[s] || (s === 'all' ? totals.all : 0)})
            </button>
          ))}
        </div>

        {filteredGroups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500 font-medium">No invoices yet</p>
            <p className="text-gray-400 text-sm mt-1">Invoices you submit against purchase orders will appear here.</p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.plot?._id || 'unassigned'} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">
                    {group.plot ? `Plot ${group.plot.plotNumber}` : 'Unassigned'}
                  </h3>
                  {group.plot?.development && (
                    <p className="text-xs text-gray-400 mt-0.5">{group.plot.development}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {group.invoices.length} invoice{group.invoices.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {group.invoices.map((inv) => (
                  <div key={inv._id} className="flex items-center gap-4 px-5 py-4 justify-between">
                    <button
                      onClick={() => handleView(inv)}
                      className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg shrink-0 hover:bg-gray-200 transition cursor-pointer"
                      aria-label="Preview invoice"
                    >
                      {fileIcon(inv.fileName)}
                    </button>

                      <button
                        onClick={() => handleView(inv)}
                        className="text-sm font-semibold text-1a4a45 hover:underline truncate block text-left"
                      >
                        {inv.fileName}
                      </button>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(inv.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {inv.notes && ` · ${inv.notes}`}
                      </p>
                      {inv.status === 'flagged' && inv.flagReason && (
                        <p className="text-xs text-red-600 mt-1 font-medium">Flagged: {inv.flagReason}</p>
                      )}
                    
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-800">£{Number(inv.amount).toLocaleString()}</p>
                    </div>
                    <div className="shrink-0">
                      <InvoiceStatusBadge status={inv.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <InvoicePreviewModal
        open={preview.open}
        onClose={closePreview}
        fileUrl={preview.url}
        fileName={preview.name}
      />
    </div>
  );
}
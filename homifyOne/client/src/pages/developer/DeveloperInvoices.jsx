import { useEffect, useState } from 'react';
import api from '../../services/api';

const STATUS_STYLES = {
  submitted: { label: "Submitted", cls: "bg-gray-100 text-gray-600" },
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

function InvoicePreviewModal({ open, onClose, fileUrl, fileName }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const ext = fileName?.split('.').pop()?.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png'].includes(ext);
  const isPdf = ext === 'pdf';

  const handleDownload = async () => {
    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName || 'invoice';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <p className="text-sm font-semibold text-gray-800 truncate pr-4">{fileName}</p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownload}
              className="text-xs font-semibold text-1a4a45 border border-1a4a45 rounded-lg px-3 py-1.5 hover:bg-e8f4f2 transition"
            >
              Download
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg w-8 h-8 flex items-center justify-center transition"
              aria-label="Close preview"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center min-h-[300px]">
          {isPdf && (
            <iframe src={fileUrl} title={fileName} className="w-full h-full min-h-[70vh]" />
          )}
          {isImage && (
            <img src={fileUrl} alt={fileName} className="max-w-full max-h-[75vh] object-contain" />
          )}
          {!isPdf && !isImage && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📎</p>
              <p className="text-gray-500 text-sm">Preview not available for this file type.</p>
              <button onClick={handleDownload} className="mt-4 text-sm font-semibold text-1a4a45 hover:underline">
                Download instead
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InvoiceRow({ invoice, onStatusChange, onPreview, updatingId }) {
  const [flagging, setFlagging] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const isUpdating = updatingId === invoice._id;
  const isPaid = invoice.status === 'paid';

  const handleFlagSubmit = () => {
    if (!flagReason.trim()) return;
    onStatusChange(invoice._id, 'flagged', flagReason.trim());
    setFlagging(false);
    setFlagReason('');
  };

  return (
    <div className="px-4 sm:px-5 py-4 border-b border-gray-50 last:border-b-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => onPreview(invoice._id, invoice.fileName)}
            className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg shrink-0 hover:bg-gray-200 transition"
            title="Preview invoice"
          >
            {fileIcon(invoice.fileName)}
          </button>

          {/* <div className="flex-1 min-w-0"> */}
            <button
              onClick={() => onPreview(invoice._id, invoice.fileName)}
              className="text-sm font-semibold text-1a4a45 hover:underline truncate block text-left"
            >
              {invoice.fileName}
            </button>
            <p className="text-xs text-gray-400 mt-0.5">
              {invoice.supplier?.name} 
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
                {new Date(invoice.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            {invoice.notes && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{invoice.notes}</p>
            )}
            {invoice.status === 'flagged' && invoice.flagReason && (
              <p className="text-xs text-red-600 mt-1 font-medium">Flagged: {invoice.flagReason}</p>
            )}
          {/* </div> */}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
          <p className="text-sm font-bold text-gray-800 whitespace-nowrap">£{Number(invoice.amount).toLocaleString()}</p>
          <InvoiceStatusBadge status={invoice.status} />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:shrink-0">
          <button
            onClick={() => onStatusChange(invoice._id, 'paid')}
            disabled={isUpdating || isPaid}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Mark Paid
          </button>
          <button
            onClick={() => onStatusChange(invoice._id, 'pending')}
            disabled={isUpdating || isPaid}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Mark Pending
          </button>
          <button
            onClick={() => setFlagging(v => !v)}
            disabled={isUpdating || isPaid}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Flag
          </button>
        </div>
      </div>

      {flagging && (
        <div className="mt-3 sm:ml-14 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            placeholder="Reason for flagging this invoice..."
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm min-w-0"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleFlagSubmit}
              disabled={!flagReason.trim()}
              className="flex-1 sm:flex-none bg-1a4a45 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-2d6b62 transition disabled:opacity-50"
            >
              Submit
            </button>
            <button
              onClick={() => { setFlagging(false); setFlagReason(''); }}
              className="text-gray-400 hover:text-gray-600 text-sm px-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeveloperInvoices() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [preview, setPreview] = useState({ open: false, url: '', name: '' });

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/developer/invoices/all');
      setGroups(res.data.groups || []);
    } catch (err) {
      setError('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const handleStatusChange = async (invoiceId, status, flagReason) => {
    setUpdatingId(invoiceId);
    try {
      await api.patch(`/invoices/${invoiceId}/status`, { status, flagReason });
      await fetchInvoices();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update invoice status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePreview = async (invoiceId, fileName) => {
    try {
      const res = await api.get(`/invoices/${invoiceId}/download`);
      setPreview({ open: true, url: res.data.url, name: fileName });
    } catch (err) {
      console.error('Failed to get invoice link', err);
    }
  };

  const closePreview = () => setPreview({ open: false, url: '', name: '' });

  const filteredGroups = groups
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
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 sticky top-0 z-10">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900">Invoices</h1>
        <p className="text-xs text-gray-400 mt-0.5">Supplier invoices across all your plots</p>
      </div>

      <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
          {['all', 'submitted', 'pending', 'paid', 'flagged'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-sm font-medium px-4 py-2 rounded-xl border transition shrink-0 whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-1a4a45 text-gray border-1a4a45'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-1a4a45'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} ({totals[s] || (s === 'all' ? totals.all : 0)})
            </button>
          ))}
        </div>

        {filteredGroups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500 font-medium">No invoices found</p>
            <p className="text-gray-400 text-sm mt-1">Submitted invoices from suppliers will appear here.</p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.plot?._id || 'unassigned'} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-3 text-left">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-800 text-sm truncate">
                    {group.plot ? `Plot ${group.plot.plotNumber}` : 'Unassigned'}
                  </h3>
                  {group.plot?.development && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{group.plot.development}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">{group.invoices.length} invoice{group.invoices.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {group.invoices.map((invoice) => (
                  <InvoiceRow
                    key={invoice._id}
                    invoice={invoice}
                    onStatusChange={handleStatusChange}
                    onPreview={handlePreview}
                    updatingId={updatingId}
                  />
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
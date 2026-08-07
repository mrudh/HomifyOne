import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const STATUS_STYLES = {
  pending: { label: 'Pending', cls: 'bg-yellow-100 text-yellow-700' },
  acknowledged: { label: 'Acknowledged', cls: 'bg-blue-100 text-blue-700' },
  sent: { label: 'Sent', cls: 'bg-indigo-100 text-indigo-700' },
  fulfilled: { label: 'Fulfilled', cls: 'bg-green-100 text-green-700' },
};

const INVOICE_STATUS_STYLES = {
  submitted: { label: 'Submitted', cls: 'bg-gray-100 text-gray-600' },
  pending: { label: 'Pending', cls: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Paid', cls: 'bg-green-100 text-green-700' },
  flagged: { label: 'Flagged', cls: 'bg-red-100 text-red-700' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${s.cls}`}>{s.label}</span>;
};

const InvoiceStatusBadge = ({ status }) => {
  const s = INVOICE_STATUS_STYLES[status] || INVOICE_STATUS_STYLES.submitted;
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>;
};

const fileIcon = (name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'pdf') return '📄';
  if (['jpg', 'jpeg', 'png'].includes(ext)) return '🖼️';
  return '📎';
};

export default function SupplierPurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [order, setOrder] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [etaInput, setEtaInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/purchase-orders/${id}`);
      setOrder(res.data.order);
      if (res.data.order.eta) setEtaInput(res.data.order.eta.slice(0, 10));
    } catch (err) {
      setError('Failed to load purchase order.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await api.get(`/purchase-orders/${id}/invoices`);
      setInvoices(res.data.invoices || []);
    } catch (err) {
      console.error('Failed to load invoices:', err.response?.data || err.message);
    }
  };

  useEffect(() => { fetchOrder(); fetchInvoices(); }, [id]);

  const handleAcknowledge = async () => {
    setSaving(true);
    try {
      await api.patch(`/purchase-orders/${id}/acknowledge`);
      await fetchOrder();
    } catch (err) {
      setError('Failed to acknowledge order.');
    } finally {
      setSaving(false);
    }
  };

  
  const handleStatusChange = async (status) => {
    setSaving(true);
    try {
      await api.patch(`/purchase-orders/${id}/status`, { status });
      await fetchOrder();
    } catch (err) {
      setError('Failed to update status.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEta = async () => {
    if (!etaInput) return;
    setSaving(true);
    try {
      await api.patch(`/purchase-orders/${id}/eta`, { eta: etaInput });
      await fetchOrder();
    } catch (err) {
      setError('Failed to save ETA.');
    } finally {
      setSaving(false);
    }
  };

  const validateAndSetFile = (file) => {
    setUploadError('');
    setUploadSuccess('');
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setUploadError('Only PDF, JPG, and PNG files are allowed.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File must be under 10MB.');
      return;
    }
    setInvoiceFile(file);
  };

  const handleFileChange = (e) => validateAndSetFile(e.target.files?.[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    validateAndSetFile(e.dataTransfer.files?.[0]);
  };

  const handleRemoveStagedFile = () => {
    setInvoiceFile(null);
    setUploadError('');
    setUploadSuccess('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceFile) {
      setUploadError('Please select a file to upload.');
      return;
    }
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');
    try {
      const formData = new FormData();
      formData.append('invoice', invoiceFile);
      formData.append('amount', invoiceAmount);
      formData.append('notes', invoiceNotes);

      await api.post(`/purchase-orders/${id}/invoices`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadSuccess('Invoice submitted successfully.');
      setInvoiceFile(null);
      setInvoiceAmount('');
      setInvoiceNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchInvoices();
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to upload invoice.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Delete this invoice? This cannot be undone.')) return;
    setDeletingId(invoiceId);
    try {
      await api.delete(`/invoices/${invoiceId}`);
      setInvoices((prev) => prev.filter((inv) => inv._id !== invoiceId));
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to delete invoice.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewInvoice = async (invoiceId) => {
    try {
      const res = await api.get(`/invoices/${invoiceId}/download`);
      window.open(res.data.url, '_blank');
    } catch (err) {
      console.error('Failed to get invoice link:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
        <p className="text-gray-500">{error || 'Order not found.'}</p>
      </div>
    );
  }

  const nextStatusOptions = { acknowledged: 'sent', sent: 'fulfilled' };
  const nextStatus = nextStatusOptions[order.status];

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
        <div className='text-left'>
          <h1 className="text-md font-bold text-gray-900">Purchase Order Detail</h1>
          <p className="text-xs text-gray-400 mt-0.5">Plot {order.plot?.plotNumber} - {order.plot?.development}</p>
        </div>
        <button onClick={() => navigate('/supplier/purchase-orders')} className="text-sm text-[#1a4a45] font-medium hover:underline">
          Back to Orders
        </button>
      </div>

      <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-400 mb-1">STATUS</p>
            <StatusBadge status={order.status} />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-400 mb-1">DEVELOPER</p>
            <p className="text-sm font-medium text-gray-800">{order.developer?.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-400 mb-1">TOTAL COST</p>
            <p className="text-lg font-bold text-gray-900">£{order.totalCost.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-400 mb-1">ORDER DATE</p>
            <p className="text-sm text-gray-600">
              {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {order.status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-yellow-800 font-medium">This order needs your acknowledgment.</p>
            <button
              onClick={handleAcknowledge}
              disabled={saving}
              className="bg-[#1a4a45] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2d6b62] transition disabled:opacity-50 shrink-0"
            >
              {saving ? 'Acknowledging…' : 'Acknowledge Order'}
            </button>
          </div>
        )}

        {order.status !== 'pending' && order.status !== 'fulfilled' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-center gap-6">
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs font-semibold tracking-widest text-gray-400 mb-2">SET DELIVERY ETA</p>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={etaInput}
                  onChange={(e) => setEtaInput(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm flex-1"
                />
                <button
                  onClick={handleSaveEta}
                  disabled={saving || !etaInput}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 transition disabled:opacity-50"
                >
                  Save
                </button>
              </div>
              {order.eta && (
                <p className="text-xs text-gray-400 mt-2">
                  Current ETA: {new Date(order.eta).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
            {nextStatus && (
              <button
                onClick={() => handleStatusChange(nextStatus)}
                disabled={saving}
                className="bg-[#1a4a45] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2d6b62] transition disabled:opacity-50"
              >
                Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
              </button>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-800 text-sm">Order Items ({order.items.length})</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 px-5 py-4">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                  {item.product?.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 truncate">{item.room} · {item.category}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-800">£{item.price.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-between">
            <span className="font-bold text-gray-800 text-sm">Total</span>
            <span className="font-bold text-lg text-gray-900">£{order.totalCost.toLocaleString()}</span>
          </div>
        </div>

        {/* Invoice upload */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-800 text-sm">Upload Invoice</h3>
            <p className="text-xs text-gray-400 mt-0.5">Submit your invoice for this purchase order (PDF, JPG or PNG, max 10MB)</p>
          </div>

          <form onSubmit={handleUploadInvoice} className="p-5 space-y-4">
            {uploadError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{uploadError}</div>
            )}
            {uploadSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">{uploadSuccess}</div>
            )}

            <div>
              <label className="block text-xs font-semibold tracking-widest text-gray-400 mb-2">INVOICE FILE</label>

              {!invoiceFile ? (
                <label
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-8 cursor-pointer transition-colors ${
                    dragActive ? 'border-[#1a4a45] bg-[#e8f4f2]' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                  }`}
                >
                  <span className="text-2xl">📤</span>
                  <p className="text-sm font-medium text-gray-700">
                    <span className="text-[#1a4a45] font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-400">PDF, JPG or PNG - up to 10MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
                  <span className="text-2xl shrink-0">{fileIcon(invoiceFile.name)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{invoiceFile.name}</p>
                    <p className="text-xs text-gray-400">{(invoiceFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveStagedFile}
                    className="text-red-500 hover:text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition shrink-0"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold tracking-widest text-gray-400 mb-2">INVOICE AMOUNT (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold tracking-widest text-gray-400 mb-2">NOTES (OPTIONAL)</label>
                <input
                  type="text"
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="Reference number, delivery notes, etc."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading || !invoiceFile}
              className="w-full sm:w-auto bg-[#1a4a45] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2d6b62] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Submitting…' : 'Submit Invoice'}
            </button>
          </form>

          {invoices.length > 0 && (
            <div className="border-t border-gray-100">
              <div className="px-5 py-3 bg-gray-50">
                <h4 className="text-xs font-semibold tracking-widest text-gray-400">SUBMITTED INVOICES ({invoices.length})</h4>
              </div>
              <div className="divide-y divide-gray-50">
                {invoices.map((inv) => (
                  <div key={inv._id} className="flex items-center gap-4 px-5 py-4 justify-between">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg shrink-0">
                      {fileIcon(inv.fileName)}
                    </div>
                      <button
                        onClick={() => handleViewInvoice(inv._id)}
                        className="text-sm font-semibold text-[#1a4a45] hover:underline truncate block text-left"
                      >
                        {inv.fileName}
                      </button>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(inv.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {inv.notes && ` · ${inv.notes}`}
                      </p>
                    
                    {/* <div className="text-right shrink-0"> */}
                      <p className="text-sm font-bold text-gray-800">£{Number(inv.amount).toLocaleString()}</p>
                      <InvoiceStatusBadge status={inv.status} />
                    {/* </div> */}
                    {inv.status === 'submitted' && (
                      <button
                        onClick={() => handleDeleteInvoice(inv._id)}
                        disabled={deletingId === inv._id}
                        title="Delete invoice"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-2 transition disabled:opacity-50 shrink-0"
                      >
                        {deletingId === inv._id ? '…' : '🗑️'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
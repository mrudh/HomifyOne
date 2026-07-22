import { useEffect, useState, useRef } from 'react';
import api from '../../services/api';

const STATUS_STYLES = {
  pending: { label: 'Pending', cls: 'bg-yellow-100 text-yellow-700' },
  acknowledged: { label: 'Acknowledged', cls: 'bg-blue-100 text-blue-700' },
  sent: { label: 'Sent', cls: 'bg-indigo-100 text-indigo-700' },
  fulfilled: { label: 'Fulfilled', cls: 'bg-green-100 text-green-700' },
};

const INVOICE_STATUS_STYLES = {
  submitted: { label: 'Submitted', cls: 'bg-gray-100 text-gray-600' },
  reviewed: { label: 'Reviewed', cls: 'bg-blue-100 text-blue-700' },
  paid: { label: 'Paid', cls: 'bg-green-100 text-green-700' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${s.cls}`}>{s.label}</span>;
};

const InvoiceStatusBadge = ({ status }) => {
  const s = INVOICE_STATUS_STYLES[status] || INVOICE_STATUS_STYLES.submitted;
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${s.cls}`}>{s.label}</span>;
};

const fileIcon = (name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'pdf') return '📄';
  if (['jpg', 'jpeg', 'png'].includes(ext)) return '🖼️';
  return '📎';
};

function PlotFilterDropdown({ plots, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = (plotId) => {
    if (selected.includes(plotId)) {
      onChange(selected.filter((id) => id !== plotId));
    } else {
      onChange([...selected, plotId]);
    }
  };

  const allSelected = selected.length === 0;
  const label = allSelected
    ? 'All plots'
    : selected.length === 1
      ? plots.find((p) => p.id === selected[0])?.label || '1 plot'
      : `${selected.length} plots selected`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 transition w-full sm:w-auto justify-between sm:justify-start"
      >
        <span className="flex items-center gap-2 truncate">
          <span className="text-gray-400">📍</span>
          <span className="truncate">{label}</span>
        </span>
        <span className={`text-gray-400 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-64 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-2 left-0 sm:left-auto sm:right-0">
          <button
            onClick={() => onChange([])}
            className="w-full text-left px-4 py-2 text-sm font-medium text-[#1a4a45] hover:bg-gray-50 border-b border-gray-100 mb-1"
          >
            Clear filters (show all)
          </button>
          {plots.map((plot) => (
            <label
              key={plot.id}
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(plot.id)}
                onChange={() => toggle(plot.id)}
                className="w-4 h-4 rounded border-gray-300 text-[#1a4a45] focus:ring-[#1a4a45]"
              />
              <span className="truncate">{plot.label}</span>
            </label>
          ))}
          {plots.length === 0 && (
            <p className="px-4 py-2 text-sm text-gray-400">No plots available.</p>
          )}
        </div>
      )}
    </div>
  );
}

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
              className="text-xs font-semibold text-[#1a4a45] border border-[#1a4a45] rounded-lg px-3 py-1.5 hover:bg-[#e8f4f2] transition"
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
            <iframe
              src={fileUrl}
              title={fileName}
              className="w-full h-full min-h-[70vh]"
            />
          )}
          {isImage && (
            <img
              src={fileUrl}
              alt={fileName}
              className="max-w-full max-h-[75vh] object-contain"
            />
          )}
          {!isPdf && !isImage && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📎</p>
              <p className="text-gray-500 text-sm">Preview not available for this file type.</p>
              <button
                onClick={handleDownload}
                className="mt-4 text-sm font-semibold text-[#1a4a45] hover:underline"
              >
                Download instead
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderRow({ order, invoices, onViewInvoice }) {
  const [expanded, setExpanded] = useState(false);
  const orderInvoices = invoices.filter((inv) => inv.purchaseOrder === order._id || inv.purchaseOrder?._id === order._id);

  return (
    <div className="border-b border-gray-50 last:border-b-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 sm:px-5 py-4 hover:bg-gray-50 transition text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            Plot {order.plot?.plotNumber}
            {orderInvoices.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-[#1a4a45] bg-[#e8f4f2] px-2 py-0.5 rounded-full">
                📄 {orderInvoices.length} invoice{orderInvoices.length !== 1 ? 's' : ''}
              </span>
            )}
          </p>
          <p className="text-xs text-gray-400 truncate">{order.plot?.development} · {order.items.length} items</p>
        </div>
        {order.eta && (
          <p className="text-xs text-gray-400 hidden sm:block shrink-0">
            ETA {new Date(order.eta).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </p>
        )}
        <p className="text-sm font-bold text-gray-800 shrink-0">£{order.totalCost.toLocaleString()}</p>
        <div className="shrink-0"><StatusBadge status={order.status} /></div>
        <span className={`text-gray-400 text-xs transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {expanded && (
        <div className="bg-gray-50 px-4 sm:px-5 py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-400 mb-2">ORDER ITEMS</p>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-700 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 truncate">{item.room} · {item.category}</p>
                  </div>
                  <p className="font-semibold text-gray-700 shrink-0 ml-3">£{item.price.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-400 mb-2">
              SUPPLIER INVOICES {orderInvoices.length > 0 && `(${orderInvoices.length})`}
            </p>
            {orderInvoices.length === 0 ? (
              <div className="bg-white rounded-lg px-4 py-4 text-center">
                <p className="text-sm text-gray-400">No invoices submitted yet for this order.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {orderInvoices.map((inv) => (
                  <div key={inv._id} className="flex justify-between items-center gap-3 bg-white rounded-lg px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl shrink-0">{fileIcon(inv.fileName)}</span>
                      <button
                          onClick={() => onViewInvoice(inv._id, inv.fileName)}
                          className="text-sm font-semibold text-[#1a4a45] hover:underline truncate block text-left"
                        >
                          {inv.fileName}
                      </button>
                    </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {inv.supplier?.name} · {new Date(inv.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {inv.notes && ` · ${inv.notes}`}
                      </p>
                      <div className="flex items-center gap-4">
                      <p className="text-sm font-bold text-gray-800 shrink-0">£{Number(inv.amount).toLocaleString()}</p>
                      <div className="shrink-0"><InvoiceStatusBadge status={inv.status} /></div>
                      <button
                        onClick={() => onViewInvoice(inv._id, inv.fileName)}
                        className="shrink-0 text-xs font-semibold text-[#1a4a45] border border-[#1a4a45] rounded-lg px-3 py-1.5 hover:bg-[#e8f4f2] transition"
                      >
                      View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeveloperPurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlots, setSelectedPlots] = useState([]);
  const [preview, setPreview] = useState({ open: false, url: '', name: '' });

  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const [ordersRes, invoicesRes] = await Promise.all([
  //         api.get('/purchase-orders/developer/all'),
  //         api.get('/developer/invoices/all'),
  //       ]);
  //       setOrders(ordersRes.data.orders || []);
  //       setInvoices(invoicesRes.data.invoices || []);
  //     } catch (err) {
  //       setError('Failed to load purchase orders.');
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, invoicesRes] = await Promise.all([
          api.get('/purchase-orders/developer/all'),
          api.get('/developer/invoices/all'),
        ]);
        setOrders(ordersRes.data.orders || []);
        const flatInvoices = (invoicesRes.data.groups || []).flatMap(g => g.invoices);
        setInvoices(flatInvoices);
      } catch (err) {
        setError('Failed to load purchase orders.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleViewInvoice = async (invoiceId, fileName) => {
    try {
      const res = await api.get(`/invoices/${invoiceId}/download`);
      setPreview({ open: true, url: res.data.url, name: fileName });
    } catch (err) {
      console.error('Failed to get invoice link:', err);
    }
  };

  const closePreview = () => setPreview({ open: false, url: '', name: '' });

  const plotOptions = Array.from(
    new Map(
      orders.map((o) => [
        o.plot?._id,
        { id: o.plot?._id, label: `Plot ${o.plot?.plotNumber} — ${o.plot?.development}` },
      ])
    ).values()
  ).filter((p) => p.id);

  const filteredOrders = selectedPlots.length === 0
    ? orders
    : orders.filter((o) => selectedPlots.includes(o.plot?._id));

  const grouped = filteredOrders.reduce((acc, order) => {
    const key = order.supplier?._id || order.supplier || 'unassigned';
    const name = order.supplier?.name || 'Unknown Supplier';
    if (!acc[key]) acc[key] = { name, orders: [] };
    acc[key].orders.push(order);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Purchase Orders</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">Generated orders grouped by supplier</p>
      </div>

      <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <p className="text-sm text-gray-500">
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
            {selectedPlots.length > 0 && ` across ${selectedPlots.length} plot${selectedPlots.length !== 1 ? 's' : ''}`}
          </p>
          <PlotFilterDropdown plots={plotOptions} selected={selectedPlots} onChange={setSelectedPlots} />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">{error}</div>
        )}

        {Object.keys(grouped).length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-gray-500 font-medium">No purchase orders match this filter.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([supplierId, group]) => (
              <div key={supplierId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-gray-50 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800 text-sm truncate">{group.name}</h3>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">
                    {group.orders.length} order{group.orders.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div>
                  {group.orders.map((order) => (
                    <OrderRow key={order._id} order={order} invoices={invoices} onViewInvoice={handleViewInvoice} />
                  ))}
                </div>
              </div>
            ))}
          </div>
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
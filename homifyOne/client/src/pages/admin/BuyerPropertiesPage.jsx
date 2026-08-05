import { useEffect, useState } from 'react';
import api from '../../services/api';

function PropertyEditModal({ plot, developers, onClose, onSaved }) {
  const [form, setForm] = useState({
    developer: plot.developer?._id || plot.developer || '',
    plotNumber: plot.plotNumber || '',
    address: plot.address || '',
    development: plot.development || '',
    houseType: plot.houseType || '',
    bedrooms: plot.bedrooms || '',
    bathrooms: plot.bathrooms || '',
    floorArea: plot.floorArea || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [floorPlanUrl, setFloorPlanUrl] = useState(plot.floorPlanUrl || '');

  const handleChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put(`/plots/buyer/${plot.buyer._id}`, form);
      await onSaved(data.plot);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save property details.');
    } finally {
      setSaving(false);
    }
  };

  const handleFloorPlan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const body = new FormData();
      body.append('floorPlan', file);
      const { data } = await api.post(`/plots/buyer/${plot.buyer._id}/floorplan`, body);
      setFloorPlanUrl(data.plot.floorPlanUrl);
      await onSaved(data.plot);
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[999] p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Edit Property</h3>
            <p className="text-xs text-gray-400">{plot.buyer?.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <select required value={form.developer} onChange={handleChange('developer')}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
            <option value="">Select a developer…</option>
            {developers.map((d) => <option key={d._id} value={d._id}>{d.name} ({d.email})</option>)}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Plot number" value={form.plotNumber} onChange={handleChange('plotNumber')}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
            <input required placeholder="Development" value={form.development} onChange={handleChange('development')}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
          </div>

          <input required placeholder="Address" value={form.address} onChange={handleChange('address')}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />

          <div className="grid grid-cols-2 gap-3">
            <input placeholder="House type" value={form.houseType} onChange={handleChange('houseType')}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
            <input placeholder="Floor area (e.g. 1,100 sq ft)" value={form.floorArea} onChange={handleChange('floorArea')}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input type="number" min="0" placeholder="Bedrooms" value={form.bedrooms} onChange={handleChange('bedrooms')}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
            <input type="number" min="0" placeholder="Bathrooms" value={form.bathrooms} onChange={handleChange('bathrooms')}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full bg-[#1a4a45] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>

        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-2">Floor plan</p>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
              {floorPlanUrl ? (
                <img src={floorPlanUrl} alt="Floor plan" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg">🏠</div>
              )}
            </div>
            <label className="text-xs font-semibold text-[#1a4a45] border border-[#1a4a45] rounded-xl px-3 py-2 cursor-pointer hover:bg-[#e8f4f2] transition">
              {uploading ? 'Uploading…' : 'Upload Floor Plan'}
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFloorPlan} disabled={uploading} />
            </label>
          </div>
          {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
        </div>
      </div>
    </div>
  );
}

export default function BuyerPropertiesPage() {
  const [plots, setPlots] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingPlot, setEditingPlot] = useState(null);

  const fetchAll = async () => {
    const [plotsRes, devsRes] = await Promise.all([
      api.get('/plots'),
      api.get('/users', { params: { role: 'developer' } }),
    ]);
    setPlots(plotsRes.data.plots || []);
    setDevelopers(devsRes.data.users || []);
  };

  useEffect(() => {
    fetchAll()
      .catch((err) => setError(err.response?.data?.message || 'Failed to load buyer properties.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = async (updatedPlot) => {
    setPlots((prev) => prev.map((p) => (p._id === updatedPlot._id ? updatedPlot : p)));
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Buyer Properties</h1>
        <p className="text-xs text-gray-400 mt-0.5">Every buyer's plot and property details in one place.</p>
      </div>

      <div className="px-4 sm:px-6 py-6 max-w-full space-y-4">
        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-[#f0f8f7]">
                  <th className="text-left align-middle font-semibold text-[#1a4a45] text-xs uppercase tracking-wide px-4 py-3">Buyer</th>
                  <th className="text-left align-middle font-semibold text-[#1a4a45] text-xs uppercase tracking-wide px-4 py-3">Developer</th>
                  <th className="text-left align-middle font-semibold text-[#1a4a45] text-xs uppercase tracking-wide px-4 py-3">Development</th>
                  <th className="text-left align-middle font-semibold text-[#1a4a45] text-xs uppercase tracking-wide px-4 py-3">Plot No.</th>
                  <th className="text-left align-middle font-semibold text-[#1a4a45] text-xs uppercase tracking-wide px-4 py-3">House Type</th>
                  <th className="text-left align-middle font-semibold text-[#1a4a45] text-xs uppercase tracking-wide px-4 py-3">Beds</th>
                  <th className="text-left align-middle font-semibold text-[#1a4a45] text-xs uppercase tracking-wide px-4 py-3">Baths</th>
                  <th className="text-left align-middle font-semibold text-[#1a4a45] text-xs uppercase tracking-wide px-4 py-3">Floor Area</th>
                  <th className="text-left align-middle font-semibold text-[#1a4a45] text-xs uppercase tracking-wide px-4 py-3">Address</th>
                  <th className="text-left align-middle font-semibold text-[#1a4a45] text-xs uppercase tracking-wide px-4 py-3">Floor Plan</th>
                  <th className="text-left align-middle font-semibold text-[#1a4a45] text-xs uppercase tracking-wide px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plots.map((p) => (
                  <tr key={p._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition align-top">
                    <td className="text-left px-4 py-4">
                      <p className="font-medium text-gray-800">{p.buyer?.name || '—'}</p>
                      <p className="text-xs text-gray-400">{p.buyer?.email}</p>
                    </td>
                    <td className="text-left px-4 py-4 text-gray-600">{p.developer?.name || '—'}</td>
                    <td className="text-left px-4 py-4 text-gray-600">{p.development}</td>
                    <td className="text-left px-4 py-4 text-gray-600">{p.plotNumber}</td>
                    <td className="text-left px-4 py-4 text-gray-600">{p.houseType || '—'}</td>
                    <td className="text-left px-4 py-4 text-gray-600">{p.bedrooms || '—'}</td>
                    <td className="text-left px-4 py-4 text-gray-600">{p.bathrooms || '—'}</td>
                    <td className="text-left px-4 py-4 text-gray-600">{p.floorArea || '—'}</td>
                    <td className="text-left px-4 py-4 text-gray-600">{p.address}</td>
                    <td className="text-left px-4 py-4">
                      {p.floorPlanUrl ? (
                        <a href={p.floorPlanUrl} target="_blank" rel="noreferrer" className="block">
                          <img src={p.floorPlanUrl} alt="Floor plan" className="w-14 h-14 rounded-lg object-cover border border-gray-100" />
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300">Not uploaded</span>
                      )}
                    </td>
                    <td className="text-left px-4 py-4">
                      <button onClick={() => setEditingPlot(p)}
                        className="text-xs font-semibold text-[#1a4a45] hover:underline">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {plots.length === 0 && (
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400 text-sm whitespace-normal">No buyer properties yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingPlot && (
        <PropertyEditModal
          plot={editingPlot}
          developers={developers}
          onClose={() => setEditingPlot(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

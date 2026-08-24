/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import api from '../../services/api';

const STYLES = ['classic', 'minimalistic', 'bohemian', 'modern', 'cosy', 'scandinavian'];

const EMPTY_FORM = {
  name: '', description: '', category: '', subCategory: '', room: '',
  type: 'extra', style: '', price: '', supplier: '', tags: '',
};

function ProductForm({ initial, suppliers, onSubmit, saving, error }) {
  const [form, setForm] = useState(initial);
  const [formError, setFormError] = useState('');

  const handleChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleTypeChange = (e) => {
    const type = e.target.value;
    setForm((f) => ({ ...f, type, style: type === 'extra' ? f.style : '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) return setFormError('Product name is required.');
    if (!form.category.trim()) return setFormError('Category is required.');
    if (!form.supplier) return setFormError('Please select a supplier.');
    if (form.type === 'extra' && !form.style) return setFormError('Please select a style for this extra.');
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      {(formError || error) && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{formError || error}</p>
      )}

      <input placeholder="Product name" value={form.name} onChange={handleChange('name')}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
      <textarea placeholder="Description" value={form.description} onChange={handleChange('description')} rows={2}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none" />
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Category" value={form.category} onChange={handleChange('category')}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
        <input placeholder="Sub-category" value={form.subCategory} onChange={handleChange('subCategory')}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Room (e.g. Kitchen)" value={form.room} onChange={handleChange('room')}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
        <select value={form.type} onChange={handleTypeChange}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
          <option value="extra">Extra</option>
          <option value="choice">Choice</option>
        </select>
      </div>
      {form.type === 'extra' && (
        <select value={form.style} onChange={handleChange('style')}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm capitalize">
          <option value="">Select style…</option>
          {STYLES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      )}
      <div className="grid grid-cols-2 gap-3">
        <input type="number" min="0" placeholder="Price (£, optional)" value={form.price} onChange={handleChange('price')}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
        <select value={form.supplier} onChange={handleChange('supplier')}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
          <option value="">Select supplier…</option>
          {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>
      {suppliers.length === 0 && (
        <p className="text-xs text-amber-600">No supplier accounts exist yet — create one in Manage Users first.</p>
      )}
      <input placeholder="Tags (comma separated)" value={form.tags} onChange={handleChange('tags')}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />

      <button type="submit" disabled={saving}
        className="w-full bg-[#1a4a45] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
        {saving ? 'Saving…' : 'Save Product'}
      </button>
    </form>
  );
}

function ImageUploader({ product, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !product?._id) return;
    setUploading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('image', file);
      const { data } = await api.post(`/products/${product._id}/image`, body);
      onUploaded(data.product);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-2 pt-3 border-t border-gray-100">
      <p className="text-xs font-semibold tracking-widest text-gray-400">PRODUCT IMAGE</p>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden shrink-0">
          {product?.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl">🏠</div>
          )}
        </div>
        <label className="text-xs font-semibold text-[#1a4a45] border border-[#1a4a45] rounded-xl px-3 py-2 cursor-pointer hover:bg-[#e8f4f2] transition">
          {uploading ? 'Uploading…' : 'Upload Image'}
          <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function ProductModal({ product, suppliers, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedProduct, setSavedProduct] = useState(product);

  const initial = product
    ? {
        name: product.name, description: product.description || '', category: product.category,
        subCategory: product.subCategory || '', room: product.room || '', type: product.type,
        style: product.style || '',
        price: product.price, supplier: product.supplier?._id || product.supplier || '',
        tags: (product.tags || []).join(', '),
      }
    : EMPTY_FORM;

  const handleSubmit = async (form) => {
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      price: Number(form.price) || 0,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    try {
      let result;
      if (savedProduct?._id) {
        result = await api.patch(`/products/${savedProduct._id}`, payload);
      } else {
        result = await api.post('/products', payload);
      }
      setSavedProduct(result.data.product);
      await onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[999] p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{savedProduct?._id ? 'Edit Product' : 'New Product'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        <ProductForm initial={initial} suppliers={suppliers} onSubmit={handleSubmit} saving={saving} error={error} />

        {savedProduct?._id ? (
          <ImageUploader product={savedProduct} onUploaded={(p) => { setSavedProduct(p); onSaved(); }} />
        ) : (
          <p className="text-xs text-gray-400 pt-3 border-t border-gray-100">
            Save the product first, then you can upload its image.
          </p>
        )}
      </div>
    </div>
  );
}

export default function ManageProductsPage() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [roomFilter, setRoomFilter] = useState('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState('all');
  const [modalProduct, setModalProduct] = useState(undefined);

  const fetchAll = async () => {
    const [productsRes, suppliersRes] = await Promise.all([
      api.get('/products'),
      api.get('/users', { params: { role: 'supplier' } }),
    ]);
    setProducts(productsRes.data.products || []);
    setSuppliers(suppliersRes.data.users || []);
  };

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, []);

  const productsInType = typeFilter === 'all' ? products : products.filter((p) => p.type === typeFilter);

  const roomLabelByKey = new Map();
  productsInType.forEach((p) => {
    if (!p.room) return;
    const key = p.room.trim().toLowerCase();
    if (!roomLabelByKey.has(key)) roomLabelByKey.set(key, p.room.trim());
  });
  const rooms = [...roomLabelByKey.values()].sort();

  const roomKey = (r) => (r || '').trim().toLowerCase();
  const productsInRoom = roomFilter === 'all'
    ? productsInType
    : productsInType.filter((p) => roomKey(p.room) === roomKey(roomFilter));

  const subCategoryLabelByKey = new Map();
  productsInRoom.forEach((p) => {
    if (!p.subCategory) return;
    const key = p.subCategory.trim().toLowerCase();
    if (!subCategoryLabelByKey.has(key)) subCategoryLabelByKey.set(key, p.subCategory.trim());
  });
  const subCategories = [...subCategoryLabelByKey.values()].sort();

  const subCategoryKey = (s) => (s || '').trim().toLowerCase();
  const filteredProducts = subCategoryFilter === 'all'
    ? productsInRoom
    : productsInRoom.filter((p) => subCategoryKey(p.subCategory) === subCategoryKey(subCategoryFilter));

  const handleTypeFilter = (t) => {
    setTypeFilter(t);
    setRoomFilter('all');
    setSubCategoryFilter('all');
  };

  const handleRoomFilter = (r) => {
    setRoomFilter(r);
    setSubCategoryFilter('all');
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 sticky top-0 z-10 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900">Manage Products</h1>
        <button onClick={() => setModalProduct(null)}
          className="bg-[#1a4a45] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#2d6b62] transition">
          + New Product
        </button>
      </div>

      <div className="px-4 sm:px-6 py-6 max-w-full space-y-4">
        <div className="flex gap-2 flex-wrap">
          {['all', 'extra', 'choice'].map((t) => (
            <button key={t} onClick={() => handleTypeFilter(t)}
              className={`text-xs font-medium px-3 py-2 rounded-xl border capitalize transition ${
                typeFilter === t ? 'bg-[#1a4a45] text-white border-[#1a4a45]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1a4a45]'
              }`}>
              {t === 'all' ? 'All' : `${t}s`} {t !== 'all' && `(${products.filter((p) => p.type === t).length})`}
            </button>
          ))}
        </div>

        {rooms.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => handleRoomFilter('all')}
              className={`text-xs font-medium px-3 py-2 rounded-xl border transition ${
                roomFilter === 'all' ? 'bg-[#e8f4f2] text-[#1a4a45] border-[#1a4a45]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#1a4a45]'
              }`}>
              All Rooms
            </button>
            {rooms.map((room) => (
              <button key={room} onClick={() => handleRoomFilter(room)}
                className={`text-xs font-medium px-3 py-2 rounded-xl border transition ${
                  roomFilter === room ? 'bg-[#e8f4f2] text-[#1a4a45] border-[#1a4a45]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#1a4a45]'
                }`}>
                {room} ({productsInType.filter((p) => roomKey(p.room) === roomKey(room)).length})
              </button>
            ))}
          </div>
        )}

        {subCategories.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">Sub-category</label>
            <select value={subCategoryFilter} onChange={(e) => setSubCategoryFilter(e.target.value)}
              className="text-xs font-medium px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-[#1a4a45] transition">
              <option value="all">All Sub-categories</option>
              {subCategories.map((sc) => (
                <option key={sc} value={sc}>
                  {sc} ({productsInRoom.filter((p) => subCategoryKey(p.subCategory) === subCategoryKey(sc)).length})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-[#f0f8f7]">
                  <th className="text-left align-middle font-semibold text-[#1a4a45] text-xs uppercase tracking-wide px-5 py-3">Product</th>
                  <th className="text-left align-middle font-semibold text-[#1a4a45] text-xs uppercase tracking-wide px-5 py-3">Category</th>
                  <th className="text-left align-middle font-semibold text-[#1a4a45] text-xs uppercase tracking-wide px-5 py-3">Type</th>
                  <th className="text-left align-middle font-semibold text-[#1a4a45] text-xs uppercase tracking-wide px-5 py-3">Price</th>
                  <th className="text-left align-middle font-semibold text-[#1a4a45] text-xs uppercase tracking-wide px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition">
                    <td className="text-left px-5 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm">🏠</div>
                          )}
                        </div>
                        <p className="font-medium text-gray-800">{p.name}</p>
                      </div>
                    </td>
                    <td className="text-left px-5 py-4 align-middle text-gray-500">
                      {p.category}{p.subCategory ? ` · ${p.subCategory}` : ''}
                    </td>
                    <td className="text-left px-5 py-4 align-middle capitalize text-gray-500">
                      {p.type}{p.type === 'extra' && p.style ? ` · ${p.style}` : ''}
                    </td>
                    <td className="text-left px-5 py-4 align-middle font-semibold text-gray-700">£{Number(p.price || 0).toLocaleString()}</td>
                    <td className="text-left px-5 py-4 align-middle whitespace-nowrap">
                      <button onClick={() => setModalProduct(p)}
                        className="text-xs font-semibold text-[#1a4a45] hover:underline">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">No products in this category.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalProduct !== undefined && (
        <ProductModal
          product={modalProduct}
          suppliers={suppliers}
          onClose={() => setModalProduct(undefined)}
          onSaved={fetchAll}
        />
      )}
    </div>
  );
}

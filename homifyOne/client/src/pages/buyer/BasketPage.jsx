import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const ROOM_ICONS = {
  Kitchen: '🍳', 'Living Room': '🛋️', Bedroom: '🛏️',
  Bathroom: '🚿', Flooring: '🪵', Wardrobes: '🚪',
  Lighting: '💡', Garden: '🌿',
};

export default function BasketPage() {
  const [selections, setSelections] = useState([]);
  const [plot, setPlot]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [selRes, plotRes] = await Promise.all([
          api.get('/selections'),
          api.get('/plots/my'),
        ]);
        setSelections(selRes.data.selections);
        setPlot(plotRes.data.plot);
      } catch (err) {
        setError('Failed to load basket.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const allProducts = selections.flatMap(s =>
    (s.products || []).map(p => ({ ...p, room: s.room, category: s.category }))
  );

  const standardProducts = allProducts.filter(p => !p.price || p.price === 0);
  const upgradeProducts  = allProducts.filter(p => p.price && p.price > 0);
  const extrasTotal      = upgradeProducts.reduce((sum, p) => sum + p.price, 0);

  const byRoom = selections.reduce((acc, s) => {
    if (!s.products?.length) return acc;
    if (!acc[s.room]) acc[s.room] = [];
    s.products.forEach(p => acc[s.room].push({ ...p, category: s.category }));
    return acc;
  }, {});

  const handleRemove = async (room, category, productId) => {
    try {
        await api.post('/selections', { room, category, productId, action: 'remove' });
        setSelections(prev =>
        prev.map(s =>
            s.room === room && s.category === category
            ? { ...s, products: s.products.filter(p => p._id !== productId) }
            : s
        ).filter(s => s.products.length > 0)
        );
    } catch (err) {
        setError('Failed to remove item.');
    }
};

  const isAlreadySubmitted = plot?.status === 'selections_submitted' || plot?.status === 'selections_approved';

  const handleSubmit = async () => {
    if (!window.confirm('Submit your selections to the developer for review?')) return;
    setSubmitting(true);
    try {
      await api.post('/selections/submit');
      setSubmitted(true);
      setPlot(prev => ({ ...prev, status: 'selections_submitted' }));
    } catch (err) {
      setError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f7f4]">

      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Basket & Quote</h1>
            <p className="text-xs text-gray-400 mt-0.5">Review your selections before submitting</p>
          </div>
          <button
            onClick={() => navigate('/buyer/choices')}
            className="text-sm text-[#214f49] font-medium hover:underline"
          >
            ← Back to Choices
          </button>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {(submitted || isAlreadySubmitted) && (
          <div className="bg-[#eef7f5] border border-[#9ccdc4] text-[#214f49] px-5 py-4 rounded-2xl mb-6 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-sm">Selections Submitted</p>
              <p className="text-xs mt-0.5 text-[#2d6b62]">Your choices are under review by the developer. You'll be notified once approved.</p>
            </div>
          </div>
        )}

        {allProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-4xl mb-3">🛒</p>
            <p className="text-gray-500 font-medium">Your basket is empty</p>
            <p className="text-gray-400 text-sm mt-1">Go to Standard Choices to select your finishes.</p>
            <button
              onClick={() => navigate('/buyer/choices')}
              className="mt-5 bg-[#214f49] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2d6b62] transition"
            >
              Browse Choices
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <div className="lg:col-span-2 space-y-4">
              {Object.entries(byRoom).map(([room, products]) => (
                <div key={room} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50">
                    <span className="text-xl">{ROOM_ICONS[room] || '🏠'}</span>
                    <h3 className="font-bold text-gray-800 text-sm">{room}</h3>
                    <span className="ml-auto text-xs text-gray-400">{products.length} item{products.length > 1 ? 's' : ''}</span>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {products.map(p => (
                      <div key={p._id} className="flex items-center gap-4 px-5 py-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        {p.imageUrl
                        ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-lg">🏠</div>
                        }
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400 truncate">{p.subCategory || p.category}</p>
                    </div>

                    <div className="text-right shrink-0">
                        {!p.price || p.price === 0
                        ? <span className="text-xs font-semibold text-green-500 bg-green-50 px-2 py-0.5 rounded-full">Included</span>
                        : <span className="text-sm font-bold text-gray-800">£{p.price.toLocaleString()}</span>
                        }
                    </div>

                    {!isAlreadySubmitted && !submitted && (
                        <button
                        onClick={() => handleRemove(p.room, p.category, p._id)}
                        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-400 transition"
                        title="Remove"
                        >
                        ✕
                        </button>
                    )}
                    </div>
                    ))}
                  </div>
                </div>
              ))}

              {!isAlreadySubmitted && !submitted && (
                <button
                  onClick={() => navigate('/buyer/choices')}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-[#9ccdc4] hover:text-[#214f49] transition font-medium"
                >
                  + Edit or add more selections
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-24">
                <h3 className="font-bold text-gray-800 text-sm mb-4">Order Summary</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Standard choices</span>
                    <span className="font-medium text-gray-800">{standardProducts.length} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Upgrades selected</span>
                    <span className="font-medium text-gray-800">{upgradeProducts.length} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Standard inclusions</span>
                    <span className="font-semibold text-green-500">Included</span>
                  </div>

                  {extrasTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Upgrades cost</span>
                      <span className="font-medium text-gray-800">£{extrasTotal.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="border-t border-gray-100 pt-3 flex justify-between">
                    <span className="font-bold text-gray-800">Extras Total</span>
                    <span className="font-bold text-lg text-gray-900">
                      £{extrasTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {plot && (
                  <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 space-y-1">
                    <p>Plot <span className="font-semibold text-gray-600">{plot.plotNumber}</span></p>
                    <p>{plot.development}</p>
                    <p>{plot.address}</p>
                  </div>
                )}

                {!isAlreadySubmitted && !submitted ? (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || allProducts.length === 0}
                    className="mt-5 w-full bg-[#214f49] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#2d6b62] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting…' : 'Submit to Developer'}
                  </button>
                ) : (
                  <div className="mt-5 w-full bg-gray-100 text-gray-400 py-3 rounded-xl font-semibold text-sm text-center">
                    ✓ Submitted for Review
                  </div>
                )}

                <p className="text-xs text-gray-400 text-center mt-3 leading-relaxed">
                  Once submitted, your developer will review and approve your selections.
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
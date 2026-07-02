import { useEffect, useState } from 'react';
import { useNavigate }         from 'react-router-dom';
import api                     from '../../services/api';
import { useBasket }           from '../../context/BasketContext';

const ROOM_ICONS = {
  Kitchen: '🍳', 'Living Room': '🛋️', Bedroom: '🛏️',
  Bathroom: '🚿', Flooring: '🪵', Wardrobes: '🚪',
  Lighting: '💡', Garden: '🌿',
};

export default function BasketPage() {
  const [selections,  setSelections]  = useState([]);
  const [plot,        setPlot]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [error,       setError]       = useState('');
  const navigate = useNavigate();

  const {
    items, removeItem, clearBasket,
    subtotal, remaining, overBudget, usedPct, allowance, setAllowance,
  } = useBasket();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [selRes, plotRes] = await Promise.all([
          api.get('/selections'),
          api.get('/plots/my'),
        ]);
        setSelections(selRes.data.selections);

        const fetchedPlot = plotRes.data.plot;
        setPlot(fetchedPlot);

        if (fetchedPlot?.extrasAllowance) {
          setAllowance(fetchedPlot.extrasAllowance);
        }
      } catch (err) {
        setError('Failed to load basket.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const allProducts      = selections.flatMap(s =>
    (s.products || []).map(p => ({ ...p, room: s.room, category: s.category }))
  );
  const standardProducts = allProducts.filter(p => !p.price || p.price === 0);
  const byRoom           = selections.reduce((acc, s) => {
    if (!s.products?.length) return acc;
    if (!acc[s.room]) acc[s.room] = [];
    s.products.forEach(p => acc[s.room].push({ ...p, category: s.category }));
    return acc;
  }, {});

  const handleRemoveStandard = async (room, category, productId) => {
    try {
      await api.post('/selections', { room, category, productId, action: 'remove' });
      setSelections(prev =>
        prev.map(s =>
          s.room === room && s.category === category
            ? { ...s, products: s.products.filter(p => p._id !== productId) }
            : s
        ).filter(s => s.products.length > 0)
      );
    } catch {
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
      clearBasket();
    } catch {
      setError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isEmpty = items.length === 0 && standardProducts.length === 0;

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-10">

      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-md font-extrabold text-gray-900">Basket & Quote</h1>
            <p className="text-xs text-gray-400 mt-0.5">Review your selections before submitting</p>
          </div>
          {plot && (
            <div className="text-right text-xs text-gray-400">
              <p className="font-semibold text-gray-700">Plot {plot.plotNumber}</p>
              <p>{plot.development}</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {submitted ? (
          <div className="bg-white rounded-2xl p-8 shadow text-center space-y-3">
            <p className="text-4xl">🎉</p>
            <h2 className="text-xl font-extrabold text-gray-900">Selections Submitted</h2>
            <p className="text-sm text-gray-500">
              Your choices are under review by the developer. You'll be notified once approved.
            </p>
            <button onClick={() => navigate('/buyer/dashboard')}
              className="mt-2 bg-[#1a4a45] text-white px-6 py-3 rounded-xl font-semibold text-sm">
              Back to Dashboard
            </button>
          </div>
        ) : isAlreadySubmitted ? (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center space-y-1">
            <p className="text-sm font-semibold text-blue-700">📋 Selections already submitted</p>
            <p className="text-xs text-blue-500">Your choices are under review by the developer.</p>
          </div>
        ) : null}

        {allowance > 0 && (
          <div className={`rounded-2xl p-4 border ${
            overBudget ? 'bg-red-50 border-red-200' : 'bg-[#1a4a45]/5 border-[#1a4a45]/20'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-gray-500 font-medium">Your extras allowance</p>
                <p className="text-2xl font-extrabold text-[#1a4a45]">
                  £{allowance.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-medium">Extras total</p>
                <p className={`text-2xl font-extrabold ${overBudget ? 'text-red-500' : 'text-gray-900'}`}>
                  £{subtotal.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  overBudget ? 'bg-red-400' : usedPct > 80 ? 'bg-amber-400' : 'bg-[#1a4a45]'
                }`}
                style={{ width: `${Math.min(usedPct, 100)}%` }}
              />
            </div>
            <p className={`text-sm font-semibold ${overBudget ? 'text-red-500' : 'text-[#1a4a45]'}`}>
              {overBudget
                ? `⚠️ £${Math.abs(remaining).toLocaleString()} over your allowance`
                : `✓ £${remaining.toLocaleString()} remaining from your allowance`}
            </p>
          </div>
        )}

        {isEmpty ? (
          <div className="bg-white rounded-2xl p-10 text-center space-y-3 shadow-sm">
            <p className="text-4xl">🛒</p>
            <p className="font-semibold text-gray-700">Your basket is empty</p>
            <p className="text-sm text-gray-400">Go to Standard Choices or Extras to add items.</p>
            <div className="flex gap-3 justify-center pt-2">
              <button onClick={() => navigate('/buyer/choices')}
                className="bg-[#1a4a45] text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
                Standard Choices
              </button>
              <button onClick={() => navigate('/buyer/recommendations')}
                className="border border-[#1a4a45] text-[#1a4a45] px-5 py-2.5 rounded-xl text-sm font-semibold">
                Browse Extras
              </button>
            </div>
          </div>
        ) : (
          <>
            {items.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 tracking-widest mb-3">
                  ✨ Extras ({items.length})
                </h2>
                <div className="space-y-3">
                  {items.map((item, i) => (
                    <div key={i}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 p-4">
                      <div
                        onClick={() => {
                          const slug = item.name.toLowerCase().replace(/\s+/g, '-');
                          navigate(`/buyer/extras/${slug}`, { state: { product: item } });
                        }}
                        className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 cursor-pointer hover:opacity-80 transition">
                        {item.imageUrl || item.image_url ? (
                          <img src={item.imageUrl || item.image_url} alt={item.name}
                            className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            {ROOM_ICONS[item.category] || '🏠'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{item.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {item.category}{item.subCategory ? ` · ${item.subCategory}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <p className="font-extrabold text-[#1a4a45] text-sm">
                          £{Number(item.price).toLocaleString()}
                        </p>
                        <button onClick={() => removeItem(item.name)}
                          className="text-gray-300 hover:text-red-400 transition text-lg font-bold">
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(byRoom).length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 tracking-widest mb-3">
                  🏠 Standard Choices ({Object.values(byRoom).flat().length})
                </h2>
                <div className="space-y-3">
                  {Object.entries(byRoom).map(([room, products]) => (
                    products.map((p, i) => (
                      <div key={`${room}-${i}`}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 p-4">
                        <div
                          onClick={() => navigate('/buyer/choices', { state: { room } })}
                          className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 cursor-pointer hover:opacity-80 transition">
                          {p.imageUrl || p.image_url ? (
                            <img src={p.imageUrl || p.image_url} alt={p.name}
                              className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              {ROOM_ICONS[room] || '🏠'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{p.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {room}{p.subCategory ? ` · ${p.subCategory}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <button onClick={() => handleRemoveStandard(room, p.category, p._id)}
                            className="text-gray-300 hover:text-red-400 transition text-lg font-bold">
                            ×
                          </button>
                        </div>
                      </div>
                    ))
                  ))}
                </div>
              </div>
            )}

            {!isAlreadySubmitted && !submitted && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-700">Extras subtotal</span>
                  <span className="font-extrabold text-[#1a4a45]">£{subtotal.toLocaleString()}</span>
                </div>
                {overBudget && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600 font-medium">
                    ⚠️ Your extras exceed your allowance by £{Math.abs(remaining).toLocaleString()}.
                    You can still submit — your developer will review and confirm.
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  Once submitted, your developer will review and approve your selections.
                </p>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-4 bg-[#1a4a45] text-white rounded-2xl font-bold text-sm
                    hover:bg-[#153d38] transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {submitting ? 'Submitting…' : 'Submit Selections for Approval'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useBasket } from '../../context/BasketContext';
import api from '../../services/api';
import { buildProfile } from '../../utils/buildProfile';
import { useAuth } from '../../context/AuthContext';
import SelectionsLockedNotice from '../../components/SelectionsLockedNotice';

function ProductCard({ product }) {
  const navigate = useNavigate();
  const { addItem, removeItem, isInBasket } = useBasket();
  const inBasket = isInBasket(product.name);

  function goToDetail() {
    const slug = product.name.toLowerCase().replace(/\s+/g, '-');
    navigate(`/buyer/extras/${slug}`, { state: { product } });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      <div className="relative h-44 bg-gray-100 overflow-hidden cursor-pointer group" onClick={goToDetail}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🏠</div>
        )}
        <div className="absolute top-3 right-3 bg-[#1a4a45] text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
          {product.match_score}% match
        </div>
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-gray-600 px-2.5 py-1 rounded-full">
          {product.category}
        </div>
        {inBasket && (
          <div className="absolute bottom-3 right-3 bg-[#1a4a45] text-white text-[10px] font-bold px-2 py-1 rounded-full">✓</div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1 gap-3">
        <h3 className="font-bold text-gray-900 text-sm leading-snug">{product.name}</h3>
        <p className="text-2xl font-extrabold text-[#1a4a45]">£{Number(product.price).toLocaleString()}</p>
        <button
          onClick={() => inBasket ? removeItem(product.name) : addItem(product)}
          className={`mt-auto w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
            inBasket ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500' : 'bg-[#1a4a45] text-white hover:bg-[#153d38] active:scale-95'
          }`}
        >
          {inBasket ? '✓ In basket' : 'Add to basket'}
        </button>
      </div>
    </div>
  );
}

function CategoryTabs({ categories, active, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        onClick={() => onChange('all')}
        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
          active === 'all' ? 'bg-[#1a4a45] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >All</button>
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
            active === cat ? 'bg-[#1a4a45] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >{cat}</button>
      ))}
    </div>
  );
}

export default function MySelections() {
  const navigate = useNavigate();
  const { selectedPlot, plotLoading } = useApp();
  const { user } = useAuth();
  const { items, subtotal, finalTotal, cumulativeTotal, remaining, overBudget, usedPct, allowance } = useBasket();
  const [recommendations, setRecommendations] = useState([]);
  const [summaryMsg, setSummaryMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('match');

  useEffect(() => {
    if (plotLoading) return;
    if (selectedPlot?.selectionsLocked) { setLoading(false); return; }

    setRecommendations([]);
    setSummaryMsg('');
    setLoading(true);
    setError('');

    api.get('/questionnaire/recommendations')
      .then(async (r) => {
        if (!r.data.questionnaireCompleted || !r.data.answers) {
          setError('no-cache');
          return;
        }
        const profile = buildProfile(r.data.answers, selectedPlot); 
        const [recRes, understandRes] = await Promise.all([
          api.post('/recommendations/recommend', profile),
          api.post('/recommendations/understand', profile),
        ]);
        setRecommendations(recRes.data.recommendations || []);
        setSummaryMsg(understandRes.data.summary_message || '');
      })
      .catch(() => setError('no-cache'))
      .finally(() => setLoading(false));
  }, [user?._id, selectedPlot, plotLoading]);


  const categories = [...new Set(recommendations.map(p => p.category))].sort();
  const filtered = recommendations
    .filter(p => activeCategory === 'all' || p.category === activeCategory)
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      return b.match_score - a.match_score;
    });

  if (!plotLoading && selectedPlot?.selectionsLocked) {
    return <SelectionsLockedNotice />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 font-medium">Loading your selections…</p>
        </div>
      </div>
    );
  }

  if (error === 'no-cache') {
    return (
      <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow text-center space-y-4 max-w-sm">
          <p className="text-3xl">📋</p>
          <p className="text-gray-700 font-medium">No saved recommendations yet.</p>
          <button
            onClick={() => navigate('/buyer/questionnaire')}
            className="bg-[#1a4a45] text-white px-6 py-3 rounded-xl font-semibold"
          >
            Take the quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-md font-extrabold text-gray-900">My Recommendations</h1>
            {selectedPlot ? (
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedPlot.plotNumber} · {selectedPlot.development}
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">Your saved extras, based on your style quiz</p>
            )}
          </div>
          {items.length > 0 && (
            <button
              onClick={() => navigate('/buyer/basket')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold shadow-md transition-all ${
                overBudget ? 'bg-red-500 text-white' : 'bg-[#1a4a45] text-white hover:bg-[#153d38]'
              }`}
            >
              🛒 {items.length} · £{cumulativeTotal.toLocaleString()}
              {allowance > 0 && (
                <span className="text-xs font-medium opacity-80">
                  {overBudget ? '⚠️ over' : `· £${remaining.toLocaleString()} left`}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {allowance > 0 && (
        <div className={`border-b px-6 py-2 ${overBudget ? 'bg-red-50 border-red-100' : 'bg-[#1a4a45]/5 border-[#1a4a45]/10'}`}>
          <div className="max-w-5xl mx-auto flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${overBudget ? 'bg-red-400' : 'bg-[#1a4a45]'}`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <p className={`text-xs font-semibold flex-shrink-0 ${overBudget ? 'text-red-500' : 'text-[#1a4a45]'}`}>
              {overBudget
                ? `£${Math.abs(remaining).toLocaleString()} over`
                : `£${remaining.toLocaleString()} of £${allowance.toLocaleString()} remaining`}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {summaryMsg && (
          <div className="bg-[#1a4a45]/5 border border-[#1a4a45]/20 rounded-2xl px-5 py-4 flex gap-3">
            <span className="text-xl flex-shrink-0 mt-0.5">✨</span>
            <p className="text-sm text-[#1a4a45] font-medium leading-relaxed">{summaryMsg}</p>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="space-y-3">
            <CategoryTabs categories={categories} active={activeCategory} onChange={setActiveCategory} />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Sort:</span>
              {[
                { key: 'match', label: '⭐ Best match' },
                { key: 'price_asc', label: '£ Low → High' },
                { key: 'price_desc', label: '£ High → Low' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    sortBy === opt.key ? 'bg-[#1a4a45] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >{opt.label}</button>
              ))}
              <span className="ml-auto text-xs text-gray-400">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((product, i) => (
              <ProductCard key={product.id || i} product={product} />
            ))}
          </div>
        ) : recommendations.length > 0 ? (
          <div className="text-center py-20 text-gray-400 space-y-2">
            <p className="text-3xl">🔍</p>
            <p className="font-medium">No results in this category</p>
            <button onClick={() => setActiveCategory('all')} className="text-[#1a4a45] text-sm font-semibold underline">
              Show all
            </button>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400 space-y-2">
            <p className="text-3xl">🔍</p>
            <p className="font-medium">No selections saved yet</p>
          </div>
        )}

        <div className="text-center pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-2">Not happy with these recommendations?</p>
          <button
            onClick={() => {
              navigate('/buyer/questionnaire');
            }}
            className="text-sm text-[#1a4a45] font-medium hover:underline"
          >
            Retake the style quiz →
          </button>
        </div>
      </div>
    </div>
  );
}
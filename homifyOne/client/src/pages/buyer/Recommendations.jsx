import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useBasket } from '../../context/BasketContext';
import api from '../../services/api';

function buildProfile(answers, plot) {
  const styleMap = { modern: 'modern', minimal: 'minimal', classic: 'classic', scandi: 'scandi', cosy: 'cosy', bold: 'bold', unsure: '' };
  const budgetMap = { low: [0, 2000], little: [0, 5000], balanced: [0, 10000], invest: [0, 25000], unsure: [0, 0] };
  const [budgetMin, budgetMax] = budgetMap[answers?.budget] || [0, 0];
  const roomAnswers = answers?.roomDetails || {};
  return {
    buyer_type: answers?.household || '',
    household_size: answers?.household || '',
    build_stage: 'Handover / ready to move in',
    upgrade_categories: answers?.lifestyleTraits || [],
    priorities: answers?.priorities || [],
    preferred_style: styleMap[answers?.style] || '',
    budget_min: budgetMin,
    budget_max: budgetMax,
    home_area: answers?.primaryRoom || '',
    bedroom_users: answers?.household || '',
    wardrobe_need: roomAnswers['Storage & wardrobes'] || '',
    kitchen_usage: roomAnswers['Kitchen'] || '',
    bathroom_priority: roomAnswers['Bathroom'] || '',
    flooring_area: roomAnswers['Flooring throughout'] || '',
    garden_priority: roomAnswers['Garden / outdoor space'] || '',
    sustainability_interest: (answers?.lifestyleTraits || []).includes('eco') ? 'eco and sustainability' : '',
    smart_home_need: (answers?.lifestyleTraits || []).includes('smart_home') ? 'smart home' : '',
    additional_notes: answers?.buyerProfile || '',
  };
}

function ProductModal({ product, onClose }) {
  const { addItem, removeItem, isInBasket } = useBasket();
  const inBasket = isInBasket(product.name);

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col z-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-56 sm:h-64 bg-gray-100 flex-shrink-0">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">🏠</div>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center text-lg transition"
          >×</button>
          <div className="absolute top-4 left-4 bg-[#1a4a45] text-white text-xs font-bold px-3 py-1 rounded-full">
            {product.match_score}% match
          </div>
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm text-xs font-semibold text-gray-600 px-3 py-1 rounded-full">
            {product.category}{product.subCategory ? ` · ${product.subCategory}` : ''}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">{product.name}</h2>
            {product.style && (
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mt-0.5">
                {product.style}
              </p>
            )}
          </div>
          <p className="text-3xl font-extrabold text-[#1a4a45]">
            £{Number(product.price).toLocaleString()}
          </p>
          {product.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
          )}
          {product.why_points?.length > 0 && (
            <div className="bg-[#1a4a45]/5 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-[#1a4a45] uppercase tracking-widest">
                Why we recommend this
              </p>
              {product.why_points.map((pt, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-[#1a4a45] flex-shrink-0 mt-0.5">✓</span>
                  {pt}
                </div>
              ))}
            </div>
          )}
          {product.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.tags.slice(0, 8).map((tag, i) => (
                <span key={i} className="bg-gray-100 text-gray-500 text-xs px-2.5 py-1 rounded-full capitalize">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex-shrink-0 space-y-2">
          <button
            onClick={() => { inBasket ? removeItem(product.name) : addItem(product); onClose(); }}
            className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all ${
              inBasket
                ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500'
                : 'bg-[#1a4a45] text-white hover:bg-[#153d38] active:scale-95'
            }`}
          >
            {inBasket ? '✓ In basket — tap to remove' : 'Add to basket'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product }) {
  const navigate = useNavigate();
  const { addItem, removeItem, isInBasket } = useBasket();
  const { items, subtotal, remaining, overBudget, allowance } = useBasket();
console.log('BASKET DEBUG →', { items, subtotal, remaining, overBudget, allowance });
  const inBasket = isInBasket(product.name);

  function goToDetail() {
    const slug = product.name.toLowerCase().replace(/\s+/g, '-');
    navigate(`/buyer/extras/${slug}`, { state: { product } });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      <div className="relative h-44 bg-gray-100 overflow-hidden cursor-pointer group" onClick={goToDetail}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🏠</div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-xs font-semibold text-gray-700 px-3 py-1.5 rounded-full transition-all">
            View details
          </span>
        </div>
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
        <div>
          <h3 className="font-bold text-gray-900 text-sm leading-snug">{product.name}</h3>
          {product.style && (
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
              {product.style} {product.category}
            </span>
          )}
        </div>
        <p className="text-2xl font-extrabold text-[#1a4a45]">
          £{Number(product.price).toLocaleString()}
        </p>
        <button
          onClick={() => inBasket ? removeItem(product.name) : addItem(product)}
          className={`mt-auto w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
            inBasket
              ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500'
              : 'bg-[#1a4a45] text-white hover:bg-[#153d38] active:scale-95'
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

export default function Recommendations() {
  const navigate = useNavigate();
  const { selectedPlot } = useApp();
  const { items, subtotal, remaining, overBudget, allowance } = useBasket();
  const [answers, setAnswers] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [summaryMsg, setSummaryMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('match');
  const [modalProduct, setModalProduct] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const hasFetched = useRef(false);

  // 1. Load answers from localStorage once on mount
  useEffect(() => {
    const stored = localStorage.getItem('questionnaireAnswers');
    if (stored) {
      try { setAnswers(JSON.parse(stored)); }
      catch { console.error('Failed to parse stored answers'); }
    }
  }, []);

  // 2. Confirm questionnaire is complete, redirect if not
  useEffect(() => {
    api.get('/questionnaire/recommendations')
      .then(r => {
        if (!r.data.questionnaireCompleted) navigate('/buyer/questionnaire');
        else setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true)); // fail open
  }, [navigate]);

  // 3. Fetch function
  const fetchRecommendations = useCallback(async (answersData) => {
    setLoading(true);
    setError('');
    try {
      const profile = buildProfile(answersData, selectedPlot);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const [recRes, understandRes] = await Promise.all([
        api.post('/recommendations/recommend', profile, { signal: controller.signal }),
        api.post('/recommendations/understand', profile, { signal: controller.signal }),
      ]);
      clearTimeout(timeout);

      setRecommendations(recRes.data.recommendations || []);
      setSummaryMsg(understandRes.data.summary_message || '');
      
      localStorage.setItem('cachedRecommendations', JSON.stringify(recRes.data.recommendations || []));
      localStorage.setItem('cachedSummaryMsg', understandRes.data.summary_message || '');
    } catch (err) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        console.error('fetchRecommendations error:', err.response?.data || err.message);
      }
      setError("We couldn't load recommendations right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedPlot]);

  // 4. Trigger fetch once, guarded against double-fire
  useEffect(() => {
    if (!authChecked || !answers) return;
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchRecommendations(answers);
  }, [authChecked, answers, fetchRecommendations]);

  const handleRetake = () => {
    localStorage.removeItem('questionnaireAnswers');
    navigate('/buyer/questionnaire');
  };

  const categories = [...new Set(recommendations.map(p => p.category))].sort();
  const filtered = recommendations
    .filter(p => activeCategory === 'all' || p.category === activeCategory)
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      return b.match_score - a.match_score;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 font-medium">Finding your perfect extras…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow text-center space-y-4 max-w-sm">
          <p className="text-2xl">😕</p>
          <p className="text-gray-700 font-medium">{error}</p>
          <button
            onClick={() => { hasFetched.current = false; answers && fetchRecommendations(answers); }}
            className="bg-[#1a4a45] text-white px-6 py-3 rounded-xl font-semibold"
          >Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-md font-extrabold text-gray-900">Your Recommendations</h1>
            {selectedPlot && (
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedPlot.plotNumber} · {selectedPlot.development}
              </p>
            )}
          </div>
          {items.length > 0 && (
            <button
              onClick={() => navigate('/buyer/basket')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold shadow-md transition-all ${
                overBudget ? 'bg-red-500 text-white' : 'bg-[#1a4a45] text-white hover:bg-[#153d38]'
              }`}
            >
              🛒 {items.length} · £{subtotal.toLocaleString()}
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
                style={{ width: `${Math.min((subtotal / allowance) * 100, 100)}%` }}
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

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((product, i) => (
              <ProductCard key={product.id || i} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400 space-y-2">
            <p className="text-3xl">🔍</p>
            <p className="font-medium">No results in this category</p>
            <button onClick={() => setActiveCategory('all')} className="text-[#1a4a45] text-sm font-semibold underline">
              Show all
            </button>
          </div>
        )}

        <div className="text-center pt-4 pb-10">
          <button onClick={handleRetake} className="text-sm text-gray-400 hover:text-gray-600 underline">
            Retake questionnaire to update recommendations
          </button>
        </div>

        <div className="text-center pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-2">Not finding what you're looking for?</p>
          <button onClick={() => navigate('/buyer/questionnaire')} className="text-sm text-[#1a4a45] font-medium hover:underline">
            Retake the style quiz →
          </button>
        </div>
      </div>

      {modalProduct && (
        <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} />
      )}
    </div>
  );
}
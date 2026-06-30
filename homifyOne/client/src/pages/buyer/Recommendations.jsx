import { useState, useEffect, useCallback } from 'react';
import { useNavigate }                       from 'react-router-dom';
import { useApp }                            from '../../context/AppContext';
import axios                                 from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function buildProfile(answers, plot) {
  const styleMap = {
    modern: 'modern', minimal: 'minimal', classic: 'classic',
    scandi: 'scandi', cosy: 'cosy', bold: 'bold', unsure: '',
  };
  const budgetMap = {
    low: [0, 2000], little: [0, 5000], balanced: [0, 10000],
    invest: [0, 25000], unsure: [0, 0],
  };
  const [budgetMin, budgetMax] = budgetMap[answers.budget] || [0, 0];
  const roomAnswers = answers.roomDetails || {};

  return {
    buyer_type:              answers.household || '',
    household_size:          answers.household || '',
    build_stage:             'Handover / ready to move in',
    upgrade_categories:      answers.lifestyleTraits || [],
    priorities:              answers.priorities || [],
    preferred_style:         styleMap[answers.style] || '',
    budget_min:              budgetMin,
    budget_max:              budgetMax,
    home_area:               answers.primaryRoom || '',
    bedroom_users:           answers.household || '',
    wardrobe_need:           roomAnswers['Storage & wardrobes'] || '',
    kitchen_usage:           roomAnswers['Kitchen'] || '',
    bathroom_priority:       roomAnswers['Bathroom'] || '',
    flooring_area:           roomAnswers['Flooring throughout'] || '',
    garden_priority:         roomAnswers['Garden / outdoor space'] || '',
    sustainability_interest: (answers.lifestyleTraits || []).includes('eco') ? 'eco and sustainability' : '',
    smart_home_need:         (answers.lifestyleTraits || []).includes('smart_home') ? 'smart home' : '',
    additional_notes:        answers.buyerProfile || '',
  };
}

// ─── Product Modal ────────────────────────────────────────────────────────────
function ProductModal({ product, onClose, onAddToBasket, inBasket }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl
          shadow-2xl overflow-hidden max-h-[92vh] flex flex-col z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative h-56 sm:h-64 bg-gray-100 flex-shrink-0">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name}
              className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">🏠</div>
          )}
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-black/40 hover:bg-black/60
              text-white rounded-full flex items-center justify-center text-lg transition">
            ×
          </button>
          <div className="absolute top-4 left-4 bg-[#1a4a45] text-white text-xs
            font-bold px-3 py-1 rounded-full">
            {product.match_score}% match
          </div>
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm
            text-xs font-semibold text-gray-600 px-3 py-1 rounded-full">
            {product.category}{product.subCategory ? ` · ${product.subCategory}` : ''}
          </div>
        </div>

        {/* Scrollable body */}
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

        {/* Sticky footer */}
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={() => { onAddToBasket(product); onClose(); }}
            disabled={inBasket}
            className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all ${
              inBasket
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-[#1a4a45] text-white hover:bg-[#153d38] active:scale-95'
            }`}
          >
            {inBasket ? '✓ Already in basket' : 'Add to basket'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, onAddToBasket, inBasket, onImageClick }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      {/* Clickable image */}
      <div
        className="relative h-44 bg-gray-100 overflow-hidden cursor-pointer group"
        onClick={onImageClick}
      >
        {product.image_url ? (
          <img src={product.image_url} alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🏠</div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10
          transition-all flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-xs
            font-semibold text-gray-700 px-3 py-1.5 rounded-full transition-all">
            View details
          </span>
        </div>
        <div className="absolute top-3 right-3 bg-[#1a4a45] text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
          {product.match_score}% match
        </div>
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-gray-600 px-2.5 py-1 rounded-full">
          {product.category}
        </div>
      </div>

      {/* Body */}
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
        {/* {product.why_points?.length > 0 && (
          <ul className="space-y-1">
            {product.why_points.slice(0, expanded ? 5 : 2).map((pt, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                <span className="text-[#1a4a45] mt-0.5">✓</span>
                {pt}
              </li>
            ))}
          </ul>
        )}
        {product.why_points?.length > 2 && (
          <button onClick={() => setExpanded(e => !e)}
            className="text-xs text-[#1a4a45] font-semibold text-left">
            {expanded ? '↑ Show less' : `+ ${product.why_points.length - 2} more reasons`}
          </button>
        )} */}
        <button
          onClick={() => onAddToBasket(product)}
          disabled={inBasket}
          className={`mt-auto w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
            inBasket
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-[#1a4a45] text-white hover:bg-[#153d38] active:scale-95'
          }`}
        >
          {inBasket ? '✓ Added to basket' : 'Add to basket'}
        </button>
      </div>
    </div>
  );
}

// ─── Category Tabs ────────────────────────────────────────────────────────────
function CategoryTabs({ categories, active, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button onClick={() => onChange('all')}
        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
          active === 'all' ? 'bg-[#1a4a45] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}>
        All
      </button>
      {categories.map(cat => (
        <button key={cat} onClick={() => onChange(cat)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
            active === cat ? 'bg-[#1a4a45] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}>
          {cat}
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Recommendations() {
  const navigate               = useNavigate();
  const { selectedPlot }       = useApp();
  const [answers,              setAnswers]              = useState(null);
  const [recommendations,      setRecommendations]      = useState([]);
  const [summaryMsg,           setSummaryMsg]           = useState('');
  const [loading,              setLoading]              = useState(true);
  const [error,                setError]                = useState('');
  const [basket,               setBasket]               = useState([]);
  const [activeCategory,       setActiveCategory]       = useState('all');
  const [sortBy,               setSortBy]               = useState('match');
  const [modalProduct,         setModalProduct]         = useState(null); // ← modal state

  useEffect(() => {
    const saved = localStorage.getItem('questionnaireAnswers');
    if (!saved) { navigate('/buyer/questionnaire'); return; }
    setAnswers(JSON.parse(saved));
  }, [navigate]);

  const fetchRecommendations = useCallback(async (answersData) => {
    setLoading(true);
    setError('');
    try {
      const profile = buildProfile(answersData, selectedPlot);
      const [recRes, understandRes] = await Promise.all([
        axios.post(`${API}/recommendations/recommend`, profile),
        axios.post(`${API}/recommendations/understand`, profile),
      ]);
      setRecommendations(recRes.data.recommendations || []);
      setSummaryMsg(understandRes.data.summary_message || '');
    } catch (err) {
      console.error(err);
      setError("We couldn't load recommendations right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedPlot]);

  useEffect(() => {
    if (answers) fetchRecommendations(answers);
  }, [answers, fetchRecommendations]);

  const handleAddToBasket = (product) => {
    setBasket(prev => prev.find(p => p.id === product.id) ? prev : [...prev, product]);
  };

  const categories = [...new Set(recommendations.map(p => p.category))].sort();
  const filtered   = recommendations
    .filter(p => activeCategory === 'all' || p.category === activeCategory)
    .sort((a, b) => {
      if (sortBy === 'price_asc')  return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      return b.match_score - a.match_score;
    });
  const basketTotal = basket.reduce((sum, p) => sum + Number(p.price), 0);

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
          <button onClick={() => answers && fetchRecommendations(answers)}
            className="bg-[#1a4a45] text-white px-6 py-3 rounded-xl font-semibold">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f6]">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-extrabold text-gray-900">Your Recommendations</h1>
            {selectedPlot && (
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedPlot.plotNumber} · {selectedPlot.development}
              </p>
            )}
          </div>
          {basket.length > 0 && (
            <button onClick={() => navigate('/buyer/basket')}
              className="flex items-center gap-2 bg-[#1a4a45] text-white px-4 py-2 rounded-full text-sm font-bold shadow-md">
              🛒 {basket.length} · £{basketTotal.toLocaleString()}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        {/* AI Summary */}
        {summaryMsg && (
          <div className="bg-[#1a4a45]/5 border border-[#1a4a45]/20 rounded-2xl px-5 py-4 flex gap-3">
            <span className="text-xl flex-shrink-0 mt-0.5">✨</span>
            <p className="text-sm text-[#1a4a45] font-medium leading-relaxed">{summaryMsg}</p>
          </div>
        )}

        {/* Filters */}
        <div className="space-y-3">
          <CategoryTabs categories={categories} active={activeCategory} onChange={setActiveCategory} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Sort:</span>
            {[
              { key: 'match',      label: '⭐ Best match' },
              { key: 'price_asc',  label: '£ Low → High' },
              { key: 'price_desc', label: '£ High → Low' },
            ].map(opt => (
              <button key={opt.key} onClick={() => setSortBy(opt.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  sortBy === opt.key ? 'bg-[#1a4a45] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {opt.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((product, i) => (
              <ProductCard
                key={product.id || i}
                product={product}
                onAddToBasket={handleAddToBasket}
                inBasket={basket.some(p => p.id === product.id)}
                onImageClick={() => setModalProduct(product)}  
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400 space-y-2">
            <p className="text-3xl">🔍</p>
            <p className="font-medium">No results in this category</p>
            <button onClick={() => setActiveCategory('all')}
              className="text-[#1a4a45] text-sm font-semibold underline">
              Show all
            </button>
          </div>
        )}

        <div className="text-center pt-4 pb-10">
          <button onClick={() => navigate('/buyer/questionnaire')}
            className="text-sm text-gray-400 hover:text-gray-600 underline">
            Retake questionnaire to update recommendations
          </button>
        </div>
      </div>

      {/* Modal — rendered outside the grid so it overlays everything */}
      {modalProduct && (
        <ProductModal
          product={modalProduct}
          onClose={() => setModalProduct(null)}
          onAddToBasket={handleAddToBasket}
          inBasket={basket.some(p => p.id === modalProduct.id)}
        />
      )}

    </div>
  );
}
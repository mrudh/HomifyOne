import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBasket } from '../../context/BasketContext';
import api from '../../services/api';

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

export default function MySelections() {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [summaryMsg, setSummaryMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cachedRecs = localStorage.getItem('cachedRecommendations');
    const cachedSummary = localStorage.getItem('cachedSummaryMsg');

    if (cachedRecs) {
      try {
        setRecommendations(JSON.parse(cachedRecs));
        setSummaryMsg(cachedSummary || '');
        setLoading(false);
        return;
      } catch {
        console.error('Failed to parse cached recommendations');
      }
    }

    api.get('/questionnaire/recommendations')
      .then(r => {
        if (!r.data.questionnaireCompleted) {
          navigate('/buyer/questionnaire');
        } else {
          setError('no-cache');
        }
      })
      .catch(() => setError('no-cache'))
      .finally(() => setLoading(false));
  }, [navigate]);

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
            onClick={() => navigate('/buyer/extras')}
            className="bg-[#1a4a45] text-white px-6 py-3 rounded-xl font-semibold"
          >
            View recommended extras
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-lg font-extrabold text-gray-900">My Selections</h1>
          <p className="text-xs text-gray-400 mt-0.5">Your saved extras, based on your style quiz</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {summaryMsg && (
          <div className="bg-[#1a4a45]/5 border border-[#1a4a45]/20 rounded-2xl px-5 py-4 flex gap-3">
            <span className="text-xl flex-shrink-0 mt-0.5">✨</span>
            <p className="text-sm text-[#1a4a45] font-medium leading-relaxed">{summaryMsg}</p>
          </div>
        )}

        {recommendations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recommendations.map((product, i) => (
              <ProductCard key={product.id || i} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400 space-y-2">
            <p className="text-3xl">🔍</p>
            <p className="font-medium">No selections saved yet</p>
          </div>
        )}

        {/* ✅ The link you asked for */}
        <div className="text-center pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-2">Not happy with these recommendations?</p>
          <button
            onClick={() => {
              localStorage.removeItem('questionnaireAnswers');
              localStorage.removeItem('cachedRecommendations');
              localStorage.removeItem('cachedSummaryMsg');
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
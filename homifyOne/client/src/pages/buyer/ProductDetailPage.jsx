import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import WhyAccordion from '../../components/WhyAccordion';
import { useBasket } from '../../context/BasketContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TABS = ['Overview', 'Specifications', 'Good to know'];

export default function ProductDetailPage() {
  const { slug }    = useParams();
  const navigate    = useNavigate();
  const location    = useLocation();
  const [product,   setProduct]  = useState(location.state?.product || null);
  const [tab,       setTab]      = useState('Overview');
  const [loading,   setLoading]  = useState(!location.state?.product);

  const { addItem, removeItem, isInBasket, subtotal, remaining, overBudget, allowance } = useBasket();
  const inBasket = product ? isInBasket(product.name) : false;

  useEffect(() => {
    if (product) return;
    axios.get(`${API}/extras/${slug}`)
      .then(r => setProduct(r.data))
      .catch(() => navigate('/buyer/recommendations'))
      .finally(() => setLoading(false));
  }, [slug, product, navigate]);

  if (loading) return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!product) return null;

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-32 sm:pb-10">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1.5
              border border-gray-200 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 transition flex-shrink-0">
            ← Back
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-gray-400 truncate">
              {product.category}{product.subCategory ? ` › ${product.subCategory}` : ''}
            </p>
            <h1 className="text-sm font-bold text-gray-900 truncate">{product.name}</h1>
          </div>
          <p className="text-base sm:text-lg font-extrabold text-[#1a4a45] flex-shrink-0">
            £{Number(product.price).toLocaleString()}
          </p>
        </div>
      </div>

      {allowance > 0 && (
        <div className={`px-4 sm:px-6 py-2.5 border-b text-xs font-medium flex items-center justify-between gap-4 ${
          overBudget ? 'bg-red-50 border-red-100 text-red-600' : 'bg-[#1a4a45]/5 border-[#1a4a45]/10 text-[#1a4a45]'
        }`}>
          <span>
            {overBudget
              ? `⚠️ £${Math.abs(remaining).toLocaleString()} over your allowance`
              : `🎁 £${remaining.toLocaleString()} remaining from your £${allowance.toLocaleString()} allowance`}
          </span>
          <span className="text-gray-400 flex-shrink-0">Basket: £{subtotal.toLocaleString()}</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8 items-start">

          <div className="lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-100 shadow-sm aspect-square relative">
              {product.imageUrl || product.image_url ? (
                <img src={product.imageUrl || product.image_url} alt={product.name}
                  className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-7xl bg-gray-50">🏠</div>
              )}
              {product.match_score && (
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-[#1a4a45] text-white
                  text-xs font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow">
                  {product.match_score}% match
                </div>
              )}
              {(product.style || product.category) && (
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white/90 backdrop-blur-sm
                  text-xs font-semibold text-gray-500 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-gray-200">
                  {product.style || product.category}
                </div>
              )}
              {inBasket && (
                <div className="absolute bottom-3 left-3 bg-[#1a4a45] text-white
                  text-xs font-bold px-3 py-1.5 rounded-full shadow flex items-center gap-1.5">
                  ✓ In basket
                </div>
              )}
            </div>

            {product.tags?.length > 0 && (
              <div className="hidden sm:flex flex-wrap gap-1.5 mt-4">
                {product.tags.slice(0, 8).map((tag, i) => (
                  <span key={i} className="bg-white border border-gray-200 text-gray-500
                    text-xs px-2.5 py-1 rounded-full capitalize">{tag}</span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">{product.name}</h2>
              {product.style && (
                <p className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase tracking-widest mt-0.5">
                  {product.style} · {product.category}
                </p>
              )}
              <p className="text-3xl sm:text-4xl font-extrabold text-[#1a4a45] mt-2 sm:mt-3">
                £{Number(product.price).toLocaleString()}
              </p>
            </div>

            {product.highlights?.length > 0 && (
              <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                {product.highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-[#1a4a45]/5
                    border border-[#1a4a45]/10 rounded-xl px-3 py-2">
                    <span className="text-[#1a4a45] text-xs font-bold flex-shrink-0">✓</span>
                    <span className="text-xs text-gray-700 font-medium">{h}</span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <div className="flex gap-0 border-b border-gray-200 mb-4 overflow-x-auto scrollbar-hide">
                {TABS.map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-shrink-0 px-3 sm:px-4 py-2.5 text-sm font-semibold border-b-2
                      transition-all -mb-px whitespace-nowrap ${
                        tab === t
                          ? 'border-[#1a4a45] text-[#1a4a45]'
                          : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}>
                    {t}
                  </button>
                ))}
              </div>

              {tab === 'Overview' && (
                <div className="space-y-4">
                  {product.description && (
                    <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
                  )}
                  {product.why_points?.length > 0 && (
                    <WhyAccordion points={product.why_points} />
                  )}
                  {product.installStage && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50
                      rounded-xl px-4 py-3 border border-gray-100">
                      <span>🏗️</span>
                      <span>Best installed at: <strong>{product.installStage}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {tab === 'Specifications' && (
                <div>
                  {product.specs && Object.keys(product.specs).length > 0 ? (
                    <div className="rounded-2xl border border-gray-100 overflow-hidden">
                      {Object.entries(product.specs).map(([key, val], i) => (
                        <div key={key}
                          className={`flex items-start justify-between gap-4 px-4 py-3
                            text-sm ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                          <span className="font-semibold text-gray-700 flex-shrink-0 w-32 sm:w-40">{key}</span>
                          <span className="text-gray-600 text-right">{val}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">
                      Detailed specifications are available on request from your sales consultant.
                    </p>
                  )}
                </div>
              )}

              {tab === 'Good to know' && (
                <div>
                  {product.goodToKnow?.length > 0 ? (
                    <ul className="space-y-3">
                      {product.goodToKnow.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-gray-700
                          bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                          <span className="flex-shrink-0 mt-0.5">ℹ️</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No additional notes for this product.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 sm:static bg-white sm:bg-transparent
        border-t border-gray-100 sm:border-0 px-4 sm:px-6 py-3 sm:py-0
        sm:max-w-5xl sm:mx-auto sm:mt-2 z-30 space-y-2">
        <button
          onClick={() => inBasket ? removeItem(product.name) : addItem(product)}
          className={`w-full py-3.5 sm:py-4 rounded-2xl text-sm font-bold transition-all shadow-md ${
            inBasket
              ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500 border border-gray-200'
              : overBudget
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-[#1a4a45] text-white hover:bg-[#153d38] hover:-translate-y-0.5 hover:shadow-lg active:scale-95'
          }`}>
          {inBasket
            ? '✓ In basket — tap to remove'
            : overBudget
              ? `Add anyway — £${Math.abs(remaining - Number(product.price)).toLocaleString()} over allowance`
              : `Add to basket — £${Number(product.price).toLocaleString()}`}
        </button>
        <button onClick={() => navigate(-1)}
          className="hidden sm:block w-full py-3 rounded-2xl text-sm font-semibold
            text-gray-500 border border-gray-200 hover:bg-gray-50 transition">
          ← Back to recommendations
        </button>
      </div>
    </div>
  );
}
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useBasket } from '../../context/BasketContext';

const QUICK_PROMPTS = [
  "What's my current budget status?",
  'Recommend kitchen extras for a family',
  'What is personalisation credit?',
  'Has my order been approved yet?',
];

function ProductCard({ product, onClick }) {
  return (
    <button
      onClick={() => onClick(product)}
      className="w-40 shrink-0 text-left bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-[#1a4a45] hover:shadow-md transition"
    >
      <div className="w-full h-24 bg-gray-100">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🏠</div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-semibold text-gray-800 truncate">{product.name}</p>
        <p className="text-xs font-bold text-[#1a4a45] mt-0.5">£{Number(product.price || 0).toLocaleString()}</p>
      </div>
    </button>
  );
}

function MessageBubble({ role, content, products, onProductClick }) {
  const mine = role === 'user';
  return (
    <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'} gap-2`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-left ${
          mine
            ? 'bg-[#1a4a45] text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
        }`}
      >
        {content}
      </div>
      {!mine && products?.length > 0 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1 max-w-full">
          {products.map((p) => (
            <ProductCard key={p.name} product={p} onClick={onProductClick} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AssistantPage() {
  const navigate = useNavigate();
  const { items: basketItems } = useBasket();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hi! I'm the HomifyOne assistant. Ask me about extras, your budget, or how your order is progressing.",
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setSending(true);
    setError('');

    try {
      const { data } = await api.post('/assistant/chat', {
        message: trimmed,
        history,
        basket: basketItems,
      });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply, products: data.products || [], suggestions: data.suggestions || [] },
      ]);
    } catch (err) {
      setError(err.response?.data?.message || 'The assistant is unavailable right now.');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  const handleProductClick = (product) => {
    const slug = product.name.toLowerCase().replace(/\s+/g, '-');
    navigate(`/buyer/extras/${slug}`, { state: { product } });
  };

  // Follow-up
  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
  const activePrompts = lastAssistantMessage?.suggestions?.length
    ? lastAssistantMessage.suggestions
    : QUICK_PROMPTS;

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex flex-col">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-0 sticky top-0 z-10">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900">Ask HomifyOne ✨</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Your Guide
        </p>
      </div>

      <div className="flex-1 px-4 sm:px-6 py-6 max-w-3xl mx-auto w-full flex flex-col gap-4">
        <div className="flex-1 bg-white rounded-2xl border border-[#1a4a45] shadow-sm flex flex-col min-h-[50vh] overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {messages.map((m, i) => (
              <MessageBubble
                key={i}
                role={m.role}
                content={m.content}
                products={m.products}
                onProductClick={handleProductClick}
              />
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-400 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          <div className="flex gap-2 flex-wrap px-4 sm:px-5 pb-4 sm:pb-5 pt-2 border-t border-gray-100">
            {activePrompts.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                disabled={sending}
                className="text-xs font-medium px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-[#1a4a45] hover:text-[#1a4a45] transition disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about extras, your budget, or your order..."
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4a45]/20"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="bg-[#1a4a45] text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-[#2d6b62] transition disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

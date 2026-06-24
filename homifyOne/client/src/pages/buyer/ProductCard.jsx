export default function ProductCard({ product, isSelected, isComparing, onSelect, onZoom, onCompare }) {
  const isStandard = !product.price || product.price === 0;

  return (
    <div className={`bg-white rounded-2xl overflow-hidden border-2 transition-all shadow-sm hover:shadow-md
      ${isSelected ? 'border-[#214f49] ring-2 ring-[#a8d5cf]' : 'border-gray-100 hover:border-gray-300'}`}>

      <div className="relative aspect-square bg-gray-100 overflow-hidden group">
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">🏠</div>
        }
        <button
          onClick={e => { e.stopPropagation(); onZoom(); }}
          className="absolute top-2 left-2 bg-black/50 hover:bg-black/70 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm transition"
        >
          🔍
        </button>
        <button
          onClick={e => { e.stopPropagation(); onCompare(); }}
          className={`absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition
            ${isComparing ? 'bg-[#214f49] text-white' : 'bg-black/50 hover:bg-black/70 text-white'}`}
        >
          ⚖
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-green-500 text-xs font-semibold">
            {isStandard ? '● Included' : ''}
          </span>
          <span className="text-gray-500 text-sm cursor-pointer hover:text-gray-700" onClick={onZoom}>ⓘ</span>
        </div>
        <p className="font-bold text-gray-800 text-sm leading-tight">{product.name}</p>
        <p className="text-xs text-gray-700 mt-0.5">{product.subCategory}</p>

        {!isStandard && (
          <p className="text-gray-700 text-sm font-semibold mt-2">+ £{product.price?.toLocaleString()}</p>
        )}
        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{product.description}</p>

        <button
          onClick={onSelect}
          className={`w-full mt-3 py-2 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2
            ${isSelected
              ? 'bg-[#eef7f5] text-[#214f49] border border-[#2d6b62]'
              : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-[#eef7f5] hover:text-[#214f49] hover:border-[#9ccdc4]'}`}
        >
          {isSelected ? <>Selected <span>✓</span></> : 'Select'}
        </button>
      </div>
    </div>
  );
}
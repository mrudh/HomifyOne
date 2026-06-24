export default function ProductModal({ product, isSelected, onSelect, onClose }) {
  const isStandard = !product.price || product.price === 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex">
          <div className="w-1/2 bg-gray-100">
            {product.imageUrl
              ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              : <div className="w-full h-64 flex items-center justify-center text-6xl text-gray-300">🏠</div>
            }
          </div>
          <div className="w-1/2 p-8 flex flex-col justify-between">
            <div>
              <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl float-right">✕</button>
              <span className={`text-xs font-bold uppercase tracking-widest ${isStandard ? 'text-[#1a4a45]' : 'text-amber-500'}`}>
                {isStandard ? 'Standard — Included' : 'Upgrade'}
              </span>
              <h2 className="text-2xl font-bold text-gray-800 mt-2">{product.name}</h2>
              <p className="text-sm text-gray-400 mt-1">{product.subCategory}</p>
              <p className="text-gray-600 text-sm mt-4 leading-relaxed">{product.description}</p>
              {product.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {product.tags.map(tag => (
                    <span key={tag} className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-6">
              {!isStandard && (
                <p className="text-2xl font-bold text-gray-800 mb-4">+ £{product.price?.toLocaleString()}</p>
              )}
              <button
                onClick={onSelect}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition
                  ${isSelected
                    ? 'bg-[#1a4a45] text-white'
                    : 'bg-[#1a4a45] text-white hover:bg-[#2d6b62]'}`}
              >
                {isSelected ? '✓ Selected' : 'Select This Option'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
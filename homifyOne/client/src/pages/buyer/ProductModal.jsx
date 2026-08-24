import { useState } from 'react';

function SpecsView({ specifications, onBack }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto pr-1">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-semibold text-[#1a4a45] hover:text-[#2d6b62] transition-colors mb-4"
      >
        <span aria-hidden="true">←</span> Back
      </button>
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Specifications</p>
      <table className="w-full text-sm text-left">
        <tbody>
          {specifications.map((spec, i) => (
            <tr key={spec.label ?? i} className="border-b border-gray-50 last:border-0">
              <td className="align-top text-gray-400 whitespace-nowrap w-px pr-6 py-2">{spec.label}</td>
              <td className="align-top text-gray-700 font-medium py-2">{spec.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailsView({ product, isStandard, hasSpecs, onShowSpecs }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto pr-1">
      <div className="pr-8">
        <span className={`text-xs font-bold uppercase tracking-widest ${isStandard ? 'text-[#1a4a45]' : 'text-amber-500'}`}>
          {isStandard ? 'Standard - Included' : 'Upgrade'}
        </span>
        <h2 className="text-2xl font-bold text-gray-800 mt-2">{product.name}</h2>
      </div>
      <p className="text-sm text-gray-400 mt-1">{product.subCategory}</p>
      <p className="text-gray-600 text-sm mt-4 leading-relaxed">{product.description}</p>
      {product.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {product.tags.map(tag => (
            <span key={tag} className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">{tag}</span>
          ))}
        </div>
      )}
      {hasSpecs && (
        <button
          type="button"
          onClick={onShowSpecs}
          className="w-full mt-5 flex items-center justify-between gap-3 px-4 py-3 border border-[#1a4a45]/20 rounded-2xl
            bg-[#1a4a45]/5 hover:bg-[#1a4a45]/10 transition-colors text-left"
        >
          <span className="text-xs font-bold uppercase tracking-widest text-[#1a4a45]">Specifications</span>
          <span className="text-[#1a4a45] font-bold text-lg flex-shrink-0">+</span>
        </button>
      )}
    </div>
  );
}

export default function ProductModal({ product, isSelected, onSelect, onClose }) {
  const isStandard = !product.price || product.price === 0;
  const hasSpecs = product.specifications?.length > 0;
  const [showSpecs, setShowSpecs] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[92vh]
          flex flex-col sm:flex-row sm:h-[34rem]"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-full h-48 shrink-0 sm:w-1/2 sm:h-full bg-gray-100">
          {product.imageUrl
            ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300">🏠</div>
          }
        </div>
        <div className="w-full sm:w-1/2 p-5 sm:p-8 flex flex-col sm:h-full relative">
          <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-300 hover:text-gray-500 text-xl leading-none z-10">✕</button>

          {showSpecs
            ? <SpecsView specifications={product.specifications} onBack={() => setShowSpecs(false)} />
            : <DetailsView product={product} isStandard={isStandard} hasSpecs={hasSpecs} onShowSpecs={() => setShowSpecs(true)} />
          }

          <div className="mt-6 shrink-0">
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
  );
}

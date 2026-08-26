export default function CompareDrawer({ products, selections, activeRoom, activeCategory, onSelect, onClose }) {

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg text-left font-bold text-gray-800">Compare Options</h2>
            <p className="text-xs text-gray-400 mt-0.5">Comparing {products.length} products side by side</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition text-lg"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto overflow-x-auto flex-1 px-6 py-5">
          <table className="w-full min-w-[420px]">
            <thead>
              <tr>
                <td className="w-24 pr-4" />
                {products.map(p => (
                  <td key={p._id} className="pb-4 px-2 text-center align-top">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-xl overflow-hidden bg-gray-100 mb-2">
                      {p.imageUrl
                        ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">🏠</div>
                      }
                    </div>
                    <p className="text-xs font-bold text-gray-800 leading-snug">{p.name}</p>
                  </td>
                ))}
              </tr>
            </thead>

            <tbody>
              <tr className="border-t border-gray-100">
                <td className="py-3 pr-4 text-xs font-bold text-gray-400 uppercase tracking-widest align-middle">Type</td>
                {products.map(p => (
                  <td key={p._id} className="py-3 px-2 text-center align-middle">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                      ${!p.price ? 'bg-[#eef7f5] text-[#214f49]' : 'bg-amber-50 text-amber-600'}`}>
                      {!p.price ? 'Standard' : 'Upgrade'}
                    </span>
                  </td>
                ))}
              </tr>

              <tr className="border-t border-gray-100">
                <td className="py-3 pr-4 text-xs font-bold text-gray-400 uppercase tracking-widest align-middle">Price</td>
                {products.map(p => (
                  <td key={p._id} className="py-3 px-2 text-center align-middle">
                    <span className="text-sm font-bold text-gray-800">
                      {!p.price ? <span className="text-green-500">Included</span> : `£${p.price.toLocaleString()}`}
                    </span>
                  </td>
                ))}
              </tr>

              <tr className="border-t border-gray-100">
                <td className="py-3 pr-4 text-xs font-bold text-gray-400 uppercase tracking-widest align-middle">Category</td>
                {products.map(p => (
                  <td key={p._id} className="py-3 px-2 text-center align-middle">
                    <span className="text-xs text-gray-500">{p.subCategory || p.category}</span>
                  </td>
                ))}
              </tr>

              <tr className="border-t border-gray-100">
                <td className="py-3 pr-4 text-xs font-bold text-gray-400 uppercase tracking-widest align-top pt-4">Details</td>
                {products.map(p => (
                  <td key={p._id} className="py-3 px-2 text-center align-top">
                    <span className="text-xs text-gray-500 leading-relaxed">{p.description}</span>
                  </td>
                ))}
              </tr>

              <tr className="border-t border-gray-100">
                <td className="pt-4 pr-4" />
                {products.map(p => {
                  const isSelected = (selections[`${activeRoom}||${activeCategory}`] || []).includes(p._id);
                  return (
                    <td key={p._id} className="pt-4 px-2 text-center">
                      <button
                        onClick={() => { onSelect(p._id); onClose(); }}
                        className={`w-full py-2 rounded-xl text-xs font-semibold transition
                          ${isSelected
                            ? 'bg-[#214f49] text-white'
                            : 'border border-gray-200 text-gray-700 hover:bg-[#eef7f5] hover:text-[#214f49] hover:border-[#9ccdc4]'}`}
                      >
                        {isSelected ? '✓ Selected' : 'Select'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
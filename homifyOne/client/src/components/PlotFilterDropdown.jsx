import { useEffect, useRef, useState } from 'react';

export default function PlotFilterDropdown({ plots, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 border rounded-xl px-4 py-2.5 text-sm font-medium transition ${
          selected.length ? 'border-[#9ccdc4] text-[#214f49] bg-[#eef7f5]' : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'
        }`}
      >
        <span>📍</span> All Plots
        {selected.length > 0 && (
          <span className="bg-[#214f49] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {selected.length}
          </span>
        )}
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-12 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 w-72 max-h-80 overflow-y-auto">
          <button
            onClick={() => onChange([])}
            className="w-full text-left px-4 py-3 text-sm font-semibold text-[#214f49] hover:bg-gray-50 border-b border-gray-100 sticky top-0 bg-white"
          >
            Clear filters (show all)
          </button>
          <div className="p-2">
            {plots.map((plot) => (
              <label
                key={plot._id}
                className="flex items-center gap-2 text-sm text-gray-700 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(plot._id)}
                  onChange={() => toggle(plot._id)}
                  className="rounded accent-[#2d6b62]"
                />
                Plot {plot.plotNumber} - {plot.development} {plot.buyer?.name ? `(${plot.buyer.name})` : ''}
              </label>
            ))}
            {plots.length === 0 && (
              <p className="text-xs text-gray-400 px-2 py-2">No plots available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

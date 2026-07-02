import { useState } from 'react';

export default function WhyAccordion({ points, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  if (!points?.length) return null;

  return (
    <div className="border border-[#1a4a45]/20 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5
          bg-[#1a4a45]/5 hover:bg-[#1a4a45]/10 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[#1a4a45] text-base">✨</span>
          <span className="text-sm font-bold text-[#1a4a45]">
            Why we recommend this for you
          </span>
        </div>
        <span className={`text-[#1a4a45] font-bold text-lg flex-shrink-0 transition-transform duration-200 ${
          open ? 'rotate-45' : 'rotate-0'
        }`}>
          +
        </span>
      </button>

      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
        open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <ul className="px-4 py-3 space-y-2.5 bg-white">
          {points.map((pt, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
              <span className="text-[#1a4a45] font-bold flex-shrink-0 mt-0.5">✓</span>
              <span className="leading-snug">{pt}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
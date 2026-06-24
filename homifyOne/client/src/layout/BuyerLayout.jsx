import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import BuyerSidebar from '../components/BuyerSidebar';

export default function BuyerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8f7f4] font-sans">
      <BuyerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-60 flex flex-col min-h-screen">

        <div className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col gap-1.5 p-1"
            aria-label="Open menu"
          >
            <span className="w-5 h-0.5 bg-gray-700 rounded" />
            <span className="w-5 h-0.5 bg-gray-700 rounded" />
            <span className="w-5 h-0.5 bg-gray-700 rounded" />
          </button>
          <span className="font-semibold text-gray-800 text-sm">HomifyOne</span>
        </div>

        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
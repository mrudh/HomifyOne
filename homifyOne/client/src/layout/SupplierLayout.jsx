import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SupplierSidebar from './../components/SupplierSidebar';

export default function SupplierLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <SupplierSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-60">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-20 bg-white shadow-md rounded-xl p-2.5 text-gray-600"
        >
          ☰
        </button>
        <Outlet />
      </div>
    </div>
  );
}
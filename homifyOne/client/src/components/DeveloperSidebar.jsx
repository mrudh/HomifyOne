import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { label: "Dashboard", icon: "⊞", path: "/developer/dashboard" },
  { label: "Plots & Buyers", icon: "🏠", path: "/developer/plots" },
  { label: "Selections Review", icon: "📋", path: "/developer/orders" },
  { label: 'Selection Summary', icon: '📄', path: '/developer/selection-summary' },
  { label: "Purchase Orders", icon: "📦", path: "/developer/purchase-orders" },
  { label: "Calendar", icon: "📅", path: "/developer/calendar" },
//   { label: "Messages", icon: "✉️", path: "/developer/messages" },
//   { label: "Notifications", icon: "🔔", path: "/developer/notifications" },
//   { label: "Help & Support", icon: "❓", path: "/developer/help" },
];

export default function DeveloperSidebar({ open, onClose }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleNav = (path) => {
        navigate(path);
        onClose?.();
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-[#1a4a45]">

        <div className="flex items-center justify-between px-5 py-5 border-b border-[#2d6b62]">
            <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 9.75L12 3l9 6.75V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.75z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 21V12h6v9" />
            </svg>
            <span className="text-white font-semibold text-base">HomifyOne</span>
            </div>
            <button onClick={onClose}
            className="lg:hidden text-[#a8d5cf] hover:text-white text-xl leading-none">
            ✕
            </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
            {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
                <button key={item.label} onClick={() => handleNav(item.path)}
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-all
                    ${active
                    ? 'bg-[#2d6b62] text-white font-semibold border-r-4 border-[#a8d5cf]'
                    : 'text-[#a8d5cf] hover:bg-[#2d6b62] hover:text-white'}`}>
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span>{item.label}</span>
                </button>
            );
            })}
        </nav>

        <div className="px-5 py-4 border-t border-[#2d6b62] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#a8d5cf] text-[#1a4a45] font-bold text-sm flex items-center justify-center flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-[#a8d5cf] text-xs">Developer</p>
            </div>
            <button onClick={handleLogout} title="Logout"
            className="text-[#a8d5cf] hover:text-white text-sm transition">
            ↩
            </button>
        </div>
        </div>
    );

    return (
        <>
        <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 lg:left-0 z-30">
            <SidebarContent />
        </aside>

        {open && (
            <>
            <div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={onClose}
            />
            <div className="fixed inset-y-0 left-0 w-64 z-50 lg:hidden">
                <SidebarContent />
            </div>
            </>
        )}
        </>
    );
    }
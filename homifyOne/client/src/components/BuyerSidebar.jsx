import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useChat } from '../context/ChatContext';

const navItems = [
  { label: 'Dashboard', icon: '⊞', path: '/buyer/dashboard' },
  { label: 'My Property', icon: '🏠', path: '/buyer/property' },
  { label: 'Included Choices', description:
      'Choose the finishes and home personalisation options which are already included in the price of your home.', icon: '✅', path: '/buyer/choices' },
  {
    label: "Explore Upgrades",
    description: 'Browse optional paid upgrades and extras to personalise your home.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
    path: "/buyer/questionnaire",
    highlight: true,
  },
  { label: 'My Recommendations', icon: '📋', path: '/buyer/my-selections' },
  { label: 'Basket & Quote', icon: '🛒', path: '/buyer/basket' },
  { label: 'Orders & Status', icon: '📦', path: '/buyer/orders' },
  { label: 'Selection Summary', icon: '📄', path: '/buyer/selection-summary' },
  { label: 'Calendar', icon: '📅', path: '/buyer/calendar' },
  { label: 'Messages', icon: '💬', path: '/buyer/messages' },
  { label: 'Ask HomifyOne', icon: '✨', path: '/buyer/assistant' },
  { label: 'Notifications', icon: '🔔', path: '/buyer/notifications' },
];

function InfoTooltipIcon({ description }) {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const iconRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const visible = hovered || clicked;

  useEffect(() => {
    if (!clicked) return;
    const handleOutsideClick = (e) => {
      if (iconRef.current && !iconRef.current.contains(e.target)) {
        setClicked(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [clicked]);

  const updateCoords = () => {
    const rect = iconRef.current.getBoundingClientRect();
    setCoords({ top: rect.top + rect.height / 2, left: rect.right + 8 });
  };

  return (
    <>
      <button
        ref={iconRef}
        type="button"
        onMouseEnter={() => { updateCoords(); setHovered(true); }}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); updateCoords(); setClicked(prev => !prev); }}
        className="ml-1 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center
          text-[10px] text-[#a8d5cf] border border-[#a8d5cf]/50 hover:bg-white hover:text-[#1a4a45]
          transition-colors"
      >
        i
      </button>

      {visible && createPortal(
        <div
          className="fixed z-[100] w-56 bg-gray-900 text-white text-xs leading-relaxed rounded-lg px-3 py-2 shadow-lg"
          style={{ top: coords.top, left: coords.left, transform: 'translateY(-50%)' }}
        >
          {description}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
        </div>,
        document.body
      )}
    </>
  );
}

function SidebarContent({
  user,
  unreadCount,
  chatUnreadCount,
  location,
  navigate,
  onClose,
  logout,
}) {
  const handleNav = (path) => {
    navigate(path);
    onClose?.();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
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
          const isNotifications = item.label === 'Notifications';
          const isMessages = item.label === 'Messages';
          const badgeCount = isNotifications ? unreadCount : isMessages ? chatUnreadCount : 0;
          return (
            <div key={item.label}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-all
                ${active
                  ? 'bg-[#2d6b62] text-white font-semibold border-r-4 border-[#a8d5cf]'
                  : 'text-[#a8d5cf] hover:bg-[#2d6b62] hover:text-white'}`}>
              <button onClick={() => handleNav(item.path)} className="flex items-center gap-3 flex-1 text-left">
                <span className="text-base w-5 text-center relative">{item.icon}</span>
                <span className='flex items-center gap-3'>{item.label}
                  {badgeCount > 0 && (
                    <span className="relative left-1.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                </span>
              </button>
              {item.description && <InfoTooltipIcon description={item.description} />}
            </div>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-[#2d6b62] flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#a8d5cf] text-[#1a4a45] font-bold text-sm flex items-center justify-center flex-shrink-0">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{user?.name}</p>
          <p className="text-[#a8d5cf] text-xs">Home Buyer</p>
        </div>
        <button onClick={handleLogout} title="Logout"
          className="text-[#a8d5cf] hover:text-white text-sm transition">
          ↩
        </button>
      </div>
    </div>
  );
}

export default function BuyerSidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { unreadCount: chatUnreadCount } = useChat();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 lg:left-0 z-30">
        <SidebarContent
          user={user}
          unreadCount={unreadCount}
          chatUnreadCount={chatUnreadCount}
          location={location}
          navigate={navigate}
          onClose={onClose}
          logout={logout}
        />
      </aside>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
          <div className="fixed inset-y-0 left-0 w-64 z-50 lg:hidden">
            <SidebarContent
              user={user}
              unreadCount={unreadCount}
              chatUnreadCount={chatUnreadCount}
              location={location}
              navigate={navigate}
              onClose={onClose}
              logout={logout}
            />
          </div>
        </>
      )}
    </>
  );
}
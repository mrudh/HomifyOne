import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

const TYPE_ICON = {
  order_submitted: '📋',
  order_approved: '✅',
  order_rejected: '⚠️',
  purchase_order_created: '📦',
  purchase_order_status_changed: '🚚',
  invoice_submitted: '🧾',
  deadline_reminder: '⏰',
  selection_overdue: '⚠️',
  purchase_order_stale: '📦',
  delivery_update: '🚚',
};

export default function NotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  const handleClick = (n) => {
    if (!n.read) markRead(n._id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-10">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 px-4 sm:px-6 py-4">
        <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
          <div>
            <h1 className="text-md font-extrabold text-gray-900">Notifications</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="text-sm text-[#1a4a45] font-semibold hover:underline whitespace-nowrap shrink-0">
              Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 text-center space-y-3">
            <p className="text-3xl">🔔</p>
            <p className="text-gray-700 font-medium">No notifications yet.</p>
            <p className="text-xs text-gray-400">
              You'll see updates here as things happen on your account.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => (
              <button
                key={n._id}
                onClick={() => handleClick(n)}
                className={`w-full text-left bg-white rounded-2xl border shadow-sm px-5 py-4 flex items-start gap-4
                  transition-all hover:shadow-md hover:-translate-y-0.5
                  ${!n.read ? 'border-l-4 border-l-[#1a4a45] border-y-gray-100 border-r-gray-100' : 'border-gray-100'}`}
              >
                <span className="text-2xl shrink-0 mt-0.5">
                  {TYPE_ICON[n.type] || '🔔'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className={`text-sm font-semibold ${n.read ? 'text-gray-700' : 'text-gray-900'}`}>
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-[#1a4a45] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.message}</p>
                  <p className="text-[11px] text-gray-400 mt-2">
                    {new Date(n.createdAt).toLocaleString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
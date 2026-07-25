import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);
const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

export function ChatProvider({ children }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(() => {
    if (!user) return;
    api.get('/chat/conversations')
      .then(({ data }) => {
        const total = (data.conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setUnreadCount(total);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user || !token) {
      setSocket(null);
      setUnreadCount(0);
      return;
    }

    const s = io(SOCKET_URL, { auth: { token } });
    setSocket(s);
    refreshUnread();

    s.on('chat:message', () => refreshUnread());

    return () => s.disconnect();
  }, [user, token, refreshUnread]);

  return (
    <ChatContext.Provider value={{ socket, unreadCount, refreshUnread }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);

import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
}

function formatTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ROLE_LABEL = { buyer: 'Home Buyer', developer: 'Developer', supplier: 'Supplier', admin: 'Admin' };

const ROLE_EMPTY_STATE = {
  buyer: 'Your assigned developer will appear here once your plot is set up.',
  developer: 'Buyers on your plots and suppliers you raise purchase orders with will appear here.',
  supplier: 'Developers who send you purchase orders will appear here.',
};

const SEARCH_PLACEHOLDER = {
  developer: 'Search buyer, plot, development, or supplier...',
  supplier: 'Search developer...',
};

function matchesQuery(contact, query) {
  const haystack = [contact.name, contact.plot?.plotNumber, contact.plot?.development]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function AttachmentChip({ messageId, attachment, mine }) {
  const [loading, setLoading] = useState(false);
  const isImage = attachment.fileType?.startsWith('image/');

  const openAttachment = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/chat/messages/${messageId}/attachment-url`);
      window.open(data.url, '_blank', 'noopener');
    } catch {
      // 
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={openAttachment}
      disabled={loading}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition text-left disabled:opacity-60
        ${mine ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
    >
      <span className="text-base flex-shrink-0">{isImage ? '🖼️' : '📄'}</span>
      <span className="min-w-0">
        <span className="block truncate max-w-[180px]">{attachment.fileName}</span>
        <span className={`block text-[10px] ${mine ? 'text-[#d5ecE8]' : 'text-gray-400'}`}>
          {loading ? 'Opening…' : formatSize(attachment.fileSize)}
        </span>
      </span>
    </button>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { socket, refreshUnread } = useChat();

  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeContact, setActiveContact] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [exporting, setExporting] = useState(false);

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeConversationIdRef = useRef(null);
  const conversationsRef = useRef([]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const loadContactsAndConversations = useCallback(async () => {
    try {
      const [contactsRes, convosRes] = await Promise.all([
        api.get('/chat/contacts'),
        api.get('/chat/conversations'),
      ]);
      setContacts(contactsRes.data.contacts || []);
      setConversations(convosRes.data.conversations || []);
    } catch {
      // 
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadContactsAndConversations();
  }, [loadContactsAndConversations]);

  
  const showSearch = user?.role !== 'buyer';
  const trimmedQuery = query.trim().toLowerCase();
  const isSearching = showSearch && trimmedQuery.length > 0;

  const conversationItems = conversations
    .filter(c => c.otherUser)
    .slice()
    .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))
    .map(c => ({ contact: c.otherUser, conversation: c }));

  const items = !showSearch
    ? contacts.map(contact => ({
        contact,
        conversation: conversations.find(c => c.otherUser?._id === contact._id) || null,
      }))
    : isSearching
      ? contacts
          .filter(c => matchesQuery(c, trimmedQuery))
          .map(contact => ({
            contact,
            conversation: conversations.find(c => c.otherUser?._id === contact._id) || null,
          }))
      : conversationItems;

  const openConversation = async (contact) => {
    setActiveContact(contact);
    setMessages([]);
    setMessagesLoading(true);
    setUploadError('');
    try {
      const { data } = await api.post('/chat/conversations', { userId: contact._id });
      const conversationId = data.conversation._id;
      setActiveConversationId(conversationId);

      const [msgsRes] = await Promise.all([
        api.get(`/chat/conversations/${conversationId}/messages`),
        api.patch(`/chat/conversations/${conversationId}/read`).catch(() => {}),
      ]);
      setMessages(msgsRes.data.messages || []);

      setConversations(prev => {
        const exists = prev.some(c => c._id === conversationId);
        if (exists) {
          return prev.map(c => (c._id === conversationId ? { ...c, unreadCount: 0 } : c));
        }
        return [
          ...prev,
          {
            _id: conversationId,
            otherUser: contact,
            lastMessage: data.conversation.lastMessage || '',
            lastMessageAt: data.conversation.lastMessageAt || null,
            unreadCount: 0,
          },
        ];
      });
      refreshUnread();
    } catch {
      // 
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (msg) => {
      const isActive = msg.conversation === activeConversationIdRef.current;
      const isMine = String(msg.sender) === String(user?._id);
      const known = conversationsRef.current.some(c => c._id === msg.conversation);

      if (isActive) {
        setMessages(prev => [...prev, msg]);
        if (!isMine) api.patch(`/chat/conversations/${msg.conversation}/read`).catch(() => {});
      }

      if (known) {
        setConversations(prev => prev.map(c => (
          c._id === msg.conversation
            ? {
                ...c,
                lastMessage: msg.attachment?.fileKey ? `📎 ${msg.attachment.fileName}` : msg.content,
                lastMessageAt: msg.createdAt,
                unreadCount: isActive || isMine ? c.unreadCount : c.unreadCount + 1,
              }
            : c
        )));
      } else {
        loadContactsAndConversations();
      }

      refreshUnread();
    };

    socket.on('chat:message', handleIncoming);
    return () => socket.off('chat:message', handleIncoming);
  }, [socket, user, refreshUnread, loadContactsAndConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || !activeConversationId || !socket) return;
    setSending(true);
    socket.emit('chat:send', { conversationId: activeConversationId, content }, (ack) => {
      setSending(false);
      if (ack?.success) setInput('');
    });
  };

  const handleExportPdf = async () => {
    if (!activeConversationId || exporting) return;
    setExporting(true);
    try {
      const response = await api.get(`/chat/conversations/${activeConversationId}/export-pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chat-${(activeContact?.name || 'conversation').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setUploadError('Could not export this conversation — please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleAttachClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeConversationId) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File is too large — 10MB max.');
      return;
    }

    setUploadError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/chat/conversations/${activeConversationId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed — only PDF, JPG, and PNG are supported.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-[#f8f8f6]">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex-shrink-0">
        <h1 className="text-md font-extrabold text-gray-900">Messages</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {user?.role === 'buyer' && 'Chat with your assigned developer'}
          {user?.role === 'developer' && 'Chat with your buyers and suppliers'}
          {user?.role === 'supplier' && 'Chat with the developers you work with'}
        </p>
      </div>

      <div className="flex-1 flex min-h-0 max-w-5xl w-full mx-auto">
        <div className={`${activeContact ? 'hidden sm:flex' : 'flex'} flex-col w-full sm:w-80 flex-shrink-0 border-r border-gray-100 bg-white overflow-y-auto`}>
          {showSearch && (
            <div className="p-3 border-b border-gray-100 sticky top-0 bg-white z-10">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={SEARCH_PLACEHOLDER[user?.role] || 'Search...'}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9ccdc4]"
              />
            </div>
          )}

          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">
              {isSearching
                ? 'No matches found.'
                : showSearch
                  ? 'Search above to find a buyer, plot, or supplier to message.'
                  : (ROLE_EMPTY_STATE[user?.role] || 'No contacts to message yet.')}
            </div>
          ) : items.map(({ contact, conversation }) => {
            const active = activeContact?._id === contact._id;
            return (
              <button
                key={contact._id}
                onClick={() => openConversation(contact)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-gray-50 transition
                  ${active ? 'bg-[#eef7f5]' : 'hover:bg-gray-50'}`}
              >
                <div className="w-10 h-10 rounded-full bg-[#1a4a45] text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {initials(contact.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-gray-900 truncate">{contact.name}</p>
                    {conversation?.lastMessageAt && (
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{formatDay(conversation.lastMessageAt)}</span>
                    )}
                  </div>
                  {contact.plot && (
                    <p className="text-[10px] text-gray-400 truncate">
                      Plot {contact.plot.plotNumber} · {contact.plot.development}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 truncate">
                    {conversation?.lastMessage || ROLE_LABEL[contact.role] || contact.role}
                  </p>
                </div>
                {conversation?.unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                    {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className={`${activeContact ? 'flex' : 'hidden sm:flex'} flex-1 flex-col min-w-0`}>
          {!activeContact ? (
            <div className="flex-1 flex items-center justify-center text-center px-6">
              <div>
                <p className="text-3xl mb-2">💬</p>
                <p className="text-gray-500 font-medium text-sm">Select a conversation to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-3">
                <button
                  onClick={() => setActiveContact(null)}
                  className="sm:hidden text-gray-400 hover:text-gray-700 text-lg leading-none"
                >
                  ←
                </button>
                <div className="w-9 h-9 rounded-full bg-[#1a4a45] text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                  {initials(activeContact.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-gray-900 truncate">{activeContact.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {activeContact.plot
                      ? `Plot ${activeContact.plot.plotNumber} · ${activeContact.plot.development}`
                      : ROLE_LABEL[activeContact.role] || activeContact.role}
                  </p>
                </div>
                <button
                  onClick={handleExportPdf}
                  disabled={exporting || messages.length === 0}
                  title="Export this conversation as a PDF"
                  className="flex-shrink-0 w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-[#1a4a45] hover:border-[#9ccdc4] transition flex items-center justify-center disabled:opacity-40"
                >
                  {exporting ? (
                    <span className="w-4 h-4 border-2 border-gray-300 border-t-[#1a4a45] rounded-full animate-spin" />
                  ) : '⬇️'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {messagesLoading ? (
                  <div className="flex justify-center pt-10">
                    <div className="w-6 h-6 border-2 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 pt-10">No messages yet - say hello 👋</p>
                ) : messages.map((m, i) => {
                  const mine = String(m.sender) === String(user?._id);
                  const hasAttachment = !!m.attachment?.fileKey;
                  return (
                    <div key={m._id || i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm space-y-1.5
                        ${mine ? 'bg-[#1a4a45] text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'} text-left`}>
                        {hasAttachment && (
                          <AttachmentChip messageId={m._id} attachment={m.attachment} mine={mine} />
                        )}
                        {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                        <p className={`text-[10px] ${mine ? 'text-[#a8d5cf]' : 'text-gray-400'}`}>
                          {formatTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {uploadError && (
                <div className="px-5 pb-2 flex-shrink-0">
                  <p className="text-xs text-red-500">{uploadError}</p>
                </div>
              )}

              <form onSubmit={handleSend} className="bg-white border-t border-gray-100 p-3 flex gap-2 items-center flex-shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/jpg,application/pdf"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={handleAttachClick}
                  disabled={uploading}
                  title="Attach an image or PDF"
                  className="flex-shrink-0 w-10 h-10 rounded-xl border border-gray-200 text-gray-500 hover:text-[#1a4a45] hover:border-[#9ccdc4] transition flex items-center justify-center disabled:opacity-40"
                >
                  {uploading ? (
                    <span className="w-4 h-4 border-2 border-gray-300 border-t-[#1a4a45] rounded-full animate-spin" />
                  ) : '📎'}
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9ccdc4]"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="bg-[#1a4a45] text-white px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-[#153d38] transition"
                >
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

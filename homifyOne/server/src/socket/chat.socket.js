const Conversation = require('../models/Conversation');
const { sendMessage, emitMessage } = require('../services/chat.service');

function registerChatHandlers(io, socket) {
  socket.on('chat:send', async ({ conversationId, content } = {}, ack) => {
    try {
      const trimmed = (content || '').trim();
      if (!conversationId || !trimmed) {
        if (typeof ack === 'function') ack({ success: false, message: 'A conversation and message content are required.' });
        return;
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.some(p => String(p) === String(socket.userId))) {
        if (typeof ack === 'function') ack({ success: false, message: 'Not authorised for this conversation.' });
        return;
      }

      const message = await sendMessage({ conversationId, senderId: socket.userId, content: trimmed });
      const payload = { ...message.toObject(), conversation: conversationId };

      emitMessage(conversation, payload);

      if (typeof ack === 'function') ack({ success: true, message: payload });
    } catch (err) {
      if (typeof ack === 'function') ack({ success: false, message: 'Failed to send message.' });
    }
  });
}

module.exports = { registerChatHandlers };

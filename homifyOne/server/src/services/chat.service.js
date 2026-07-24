const Plot = require('../models/Plot');
const PurchaseOrder = require('../models/PurchaseOrder');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const CONTACT_FIELDS = 'name email role';

let io = null;
function setIO(instance) { io = instance; }
function emitMessage(conversation, payload) {
  if (!io) return;
  conversation.participants.forEach((participantId) => {
    io.to(String(participantId)).emit('chat:message', payload);
  });
}

function toContact(userDoc, plot = null) {
  return {
    _id: userDoc._id,
    name: userDoc.name,
    email: userDoc.email,
    role: userDoc.role,
    plot: plot ? { plotNumber: plot.plotNumber, development: plot.development } : null,
  };
}

async function getContactsForUser(user) {
  if (user.role === 'buyer') {
    const plot = await Plot.findOne({ buyer: user._id }).populate('developer', CONTACT_FIELDS);
    return plot?.developer ? [toContact(plot.developer)] : [];
  }

  if (user.role === 'developer') {
    const [plots, purchaseOrders] = await Promise.all([
      Plot.find({ developer: user._id, buyer: { $ne: null } }).populate('buyer', CONTACT_FIELDS),
      PurchaseOrder.find({ developer: user._id }).populate('supplier', CONTACT_FIELDS),
    ]);

    const byId = new Map();
    plots.forEach(p => { if (p.buyer) byId.set(String(p.buyer._id), toContact(p.buyer, p)); });
    purchaseOrders.forEach(po => { if (po.supplier) byId.set(String(po.supplier._id), toContact(po.supplier)); });
    return [...byId.values()];
  }

  if (user.role === 'supplier') {
    const purchaseOrders = await PurchaseOrder.find({ supplier: user._id }).populate('developer', CONTACT_FIELDS);
    const byId = new Map();
    purchaseOrders.forEach(po => { if (po.developer) byId.set(String(po.developer._id), toContact(po.developer)); });
    return [...byId.values()];
  }

  return [];
}

async function isValidContact(user, otherUserId) {
  const contacts = await getContactsForUser(user);
  return contacts.some(c => String(c._id) === String(otherUserId));
}

function keyFor(userAId, userBId) {
  return [String(userAId), String(userBId)].sort().join('_');
}

async function getOrCreateConversation(userAId, userBId) {
  const participantsKey = keyFor(userAId, userBId);
  let conversation = await Conversation.findOne({ participantsKey });
  if (!conversation) {
    try {
      conversation = await Conversation.create({
        participants: [userAId, userBId],
        participantsKey,
      });
    } catch (err) {
      // Race condition
      if (err.code === 11000) {
        conversation = await Conversation.findOne({ participantsKey });
      } else {
        throw err;
      }
    }
  }
  return conversation;
}

async function sendMessage({ conversationId, senderId, content }) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new Error('Conversation not found.');
  if (!conversation.participants.some(p => String(p) === String(senderId))) {
    throw new Error('Not a participant in this conversation.');
  }

  const message = await Message.create({ conversation: conversationId, sender: senderId, content });

  conversation.lastMessage = content;
  conversation.lastMessageAt = message.createdAt;
  conversation.lastSender = senderId;
  await conversation.save();

  return message;
}

module.exports = {
  setIO,
  emitMessage,
  getContactsForUser,
  isValidContact,
  getOrCreateConversation,
  sendMessage,
};

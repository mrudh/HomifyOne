const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const {
  getContactsForUser,
  isValidContact,
  getOrCreateConversation,
  emitMessage,
} = require('../services/chat.service');
const { streamConversationPdf } = require('../services/chatExport.service');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

exports.getContacts = async (req, res, next) => {
  try {
    const contacts = await getContactsForUser(req.user);
    res.json({ success: true, contacts });
  } catch (err) { next(err); }
};

exports.getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'name email role')
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    const withUnread = await Promise.all(conversations.map(async (c) => {
      const unreadCount = await Message.countDocuments({
        conversation: c._id,
        sender: { $ne: req.user._id },
        readAt: null,
      });
      const otherUser = c.participants.find(p => String(p._id) !== String(req.user._id)) || null;
      return {
        _id: c._id,
        otherUser,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt,
        unreadCount,
      };
    }));

    res.json({ success: true, conversations: withUnread });
  } catch (err) { next(err); }
};


exports.openConversation = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required.' });

    const allowed = await isValidContact(req.user, userId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'You are not permitted to message this user.' });
    }

    const conversation = await getOrCreateConversation(req.user._id, userId);
    await conversation.populate('participants', 'name email role');
    res.json({ success: true, conversation });
  } catch (err) { next(err); }
};

exports.getMessages = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !conversation.participants.some(p => String(p) === String(req.user._id))) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const messages = await Message.find({ conversation: conversation._id }).sort({ createdAt: 1 });
    res.json({ success: true, messages });
  } catch (err) { next(err); }
};


exports.uploadAttachment = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !conversation.participants.some(p => String(p) === String(req.user._id))) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'A file is required.' });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      content: (req.body.caption || '').trim(),
      attachment: {
        fileKey: req.file.key,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
      },
    });

    conversation.lastMessage = `📎 ${req.file.originalname}`;
    conversation.lastMessageAt = message.createdAt;
    conversation.lastSender = req.user._id;
    await conversation.save();

    const payload = { ...message.toObject(), conversation: conversation._id };
    emitMessage(conversation, payload);

    res.status(201).json({ success: true, message: payload });
  } catch (err) { next(err); }
};


exports.getAttachmentUrl = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message || !message.attachment?.fileKey) {
      return res.status(404).json({ success: false, message: 'Attachment not found.' });
    }

    const conversation = await Conversation.findById(message.conversation);
    if (!conversation || !conversation.participants.some(p => String(p) === String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Not authorised.' });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: message.attachment.fileKey,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 300 }); 

    res.json({
      success: true,
      url,
      fileName: message.attachment.fileName,
      fileType: message.attachment.fileType,
    });
  } catch (err) { next(err); }
};


exports.exportConversationPdf = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id).populate('participants', 'name email role');
    if (!conversation || !conversation.participants.some(p => String(p._id) === String(req.user._id))) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const messages = await Message.find({ conversation: conversation._id }).sort({ createdAt: 1 });

    const participantsById = {};
    conversation.participants.forEach((p) => { participantsById[String(p._id)] = p; });

    const otherUser = conversation.participants.find(p => String(p._id) !== String(req.user._id));
    const safeName = (otherUser?.name || 'conversation').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="chat-${safeName}.pdf"`);

    streamConversationPdf(res, { participantsById, messages, requester: req.user });
  } catch (err) { next(err); }
};


exports.markRead = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !conversation.participants.some(p => String(p) === String(req.user._id))) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    await Message.updateMany(
      { conversation: conversation._id, sender: { $ne: req.user._id }, readAt: null },
      { $set: { readAt: new Date() } }
    );

    res.json({ success: true });
  } catch (err) { next(err); }
};

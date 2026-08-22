jest.mock('../../models/Conversation');
jest.mock('../../models/Message');
jest.mock('../../services/chat.service');
jest.mock('../../services/chatExport.service');
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  GetObjectCommand: jest.fn().mockImplementation((args) => args),
}));
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');
const {
  getContactsForUser,
  isValidContact,
  getOrCreateConversation,
  emitMessage,
} = require('../../services/chat.service');
const { streamConversationPdf } = require('../../services/chatExport.service');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const chatController = require('../../controllers/chat.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  return res;
}

describe('chat.controller getContacts', () => {
  it('returns contacts for the current user', async () => {
    getContactsForUser.mockResolvedValue([{ _id: 'c1', name: 'Jane' }]);
    const res = mockRes();
    await chatController.getContacts({ user: { _id: 'me' } }, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ success: true, contacts: [{ _id: 'c1', name: 'Jane' }] });
  });

  it('forwards errors to next()', async () => {
    getContactsForUser.mockRejectedValue(new Error('boom'));
    const res = mockRes();
    const next = jest.fn();
    await chatController.getContacts({ user: { _id: 'me' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('chat.controller getConversations', () => {
  it('computes unread count and the other participant for each conversation', async () => {
    const conversations = [{
      _id: 'conv1',
      participants: [{ _id: 'me' }, { _id: 'them' }],
      lastMessage: 'Hi',
      lastMessageAt: new Date(),
    }];
    Conversation.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue(conversations) }),
    });
    Message.countDocuments.mockResolvedValue(3);

    const res = mockRes();
    await chatController.getConversations({ user: { _id: 'me' } }, res, jest.fn());

    const payload = res.json.mock.calls[0][0];
    expect(payload.conversations[0].unreadCount).toBe(3);
    expect(payload.conversations[0].otherUser).toEqual({ _id: 'them' });
  });
});

describe('chat.controller openConversation', () => {
  it('returns 400 when userId is missing', async () => {
    const res = mockRes();
    await chatController.openConversation({ user: { _id: 'me' }, body: {} }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 403 when messaging this user is not allowed', async () => {
    isValidContact.mockResolvedValue(false);
    const res = mockRes();
    await chatController.openConversation({ user: { _id: 'me' }, body: { userId: 'them' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('opens or creates a conversation and returns it populated', async () => {
    isValidContact.mockResolvedValue(true);
    const conversation = { populate: jest.fn().mockResolvedValue(true) };
    getOrCreateConversation.mockResolvedValue(conversation);

    const res = mockRes();
    await chatController.openConversation({ user: { _id: 'me' }, body: { userId: 'them' } }, res, jest.fn());

    expect(getOrCreateConversation).toHaveBeenCalledWith('me', 'them');
    expect(res.json).toHaveBeenCalledWith({ success: true, conversation });
  });
});

describe('chat.controller getMessages', () => {
  it('returns 404 when the conversation does not exist or the user is not a participant', async () => {
    Conversation.findById.mockResolvedValue(null);
    const res = mockRes();
    await chatController.getMessages({ user: { _id: 'me' }, params: { id: 'conv1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns messages sorted for a real participant', async () => {
    Conversation.findById.mockResolvedValue({ _id: 'conv1', participants: ['me', 'them'] });
    Message.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([{ _id: 'm1' }]) });

    const res = mockRes();
    await chatController.getMessages({ user: { _id: 'me' }, params: { id: 'conv1' } }, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ success: true, messages: [{ _id: 'm1' }] });
  });
});

describe('chat.controller uploadAttachment', () => {
  it('returns 404 when not a participant', async () => {
    Conversation.findById.mockResolvedValue(null);
    const res = mockRes();
    await chatController.uploadAttachment({ user: { _id: 'me' }, params: { id: 'conv1' }, body: {} }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 when no file is attached', async () => {
    Conversation.findById.mockResolvedValue({ participants: ['me'] });
    const res = mockRes();
    await chatController.uploadAttachment({ user: { _id: 'me' }, params: { id: 'conv1' }, body: {} }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates a message with the attachment, updates the conversation, and emits it', async () => {
    const conversation = { _id: 'conv1', participants: ['me'], save: jest.fn().mockResolvedValue(true) };
    Conversation.findById.mockResolvedValue(conversation);
    const message = { toObject: jest.fn().mockReturnValue({ _id: 'm1', content: '' }), createdAt: new Date() };
    Message.create.mockResolvedValue(message);

    const req = {
      user: { _id: 'me' },
      params: { id: 'conv1' },
      body: {},
      file: { key: 'k1', originalname: 'photo.png', mimetype: 'image/png', size: 1000 },
    };
    const res = mockRes();
    await chatController.uploadAttachment(req, res, jest.fn());

    expect(Message.create).toHaveBeenCalledWith(expect.objectContaining({
      conversation: 'conv1',
      sender: 'me',
      attachment: expect.objectContaining({ fileKey: 'k1', fileName: 'photo.png' }),
    }));
    expect(conversation.lastMessage).toBe('📎 photo.png');
    expect(conversation.save).toHaveBeenCalled();
    expect(emitMessage).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('chat.controller getAttachmentUrl', () => {
  it('returns 404 when the message or its attachment does not exist', async () => {
    Message.findById.mockResolvedValue(null);
    const res = mockRes();
    await chatController.getAttachmentUrl({ user: { _id: 'me' }, params: { messageId: 'm1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when the requester is not a participant of the conversation', async () => {
    Message.findById.mockResolvedValue({ conversation: 'conv1', attachment: { fileKey: 'k1' } });
    Conversation.findById.mockResolvedValue({ participants: ['someone-else'] });
    const res = mockRes();
    await chatController.getAttachmentUrl({ user: { _id: 'me' }, params: { messageId: 'm1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns a signed URL for a valid attachment', async () => {
    Message.findById.mockResolvedValue({ conversation: 'conv1', attachment: { fileKey: 'k1', fileName: 'a.png', fileType: 'image/png' } });
    Conversation.findById.mockResolvedValue({ participants: ['me'] });
    getSignedUrl.mockResolvedValue('https://x/signed');

    const res = mockRes();
    await chatController.getAttachmentUrl({ user: { _id: 'me' }, params: { messageId: 'm1' } }, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ success: true, url: 'https://x/signed', fileName: 'a.png', fileType: 'image/png' });
  });
});

describe('chat.controller exportConversationPdf', () => {
  it('returns 404 when not a participant', async () => {
    Conversation.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    const res = mockRes();
    await chatController.exportConversationPdf({ user: { _id: 'me' }, params: { id: 'conv1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('sets PDF headers and streams the conversation for a real participant', async () => {
    const conversation = {
      participants: [{ _id: 'me' }, { _id: 'them', name: 'Jane Buyer' }],
    };
    Conversation.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(conversation) });
    Message.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([{ _id: 'm1' }]) });

    const res = mockRes();
    await chatController.exportConversationPdf({ user: { _id: 'me' }, params: { id: 'conv1' } }, res, jest.fn());

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('chat-jane-buyer.pdf'));
    expect(streamConversationPdf).toHaveBeenCalledWith(res, expect.objectContaining({ messages: [{ _id: 'm1' }] }));
  });
});

describe('chat.controller markRead', () => {
  it('returns 404 when not a participant', async () => {
    Conversation.findById.mockResolvedValue(null);
    const res = mockRes();
    await chatController.markRead({ user: { _id: 'me' }, params: { id: 'conv1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('marks unread messages from the other participant as read', async () => {
    Conversation.findById.mockResolvedValue({ _id: 'conv1', participants: ['me'] });
    Message.updateMany.mockResolvedValue({});

    const res = mockRes();
    await chatController.markRead({ user: { _id: 'me' }, params: { id: 'conv1' } }, res, jest.fn());

    expect(Message.updateMany).toHaveBeenCalledWith(
      { conversation: 'conv1', sender: { $ne: 'me' }, readAt: null },
      { $set: { readAt: expect.any(Date) } }
    );
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});

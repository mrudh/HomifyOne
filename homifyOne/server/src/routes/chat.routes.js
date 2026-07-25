const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const chatUpload = require('../middleware/chatUpload');
const ctrl = require('../controllers/chat.controller');

router.use(verifyToken);

router.get('/contacts', ctrl.getContacts);
router.get('/conversations', ctrl.getConversations);
router.post('/conversations', ctrl.openConversation);
router.get('/conversations/:id/messages', ctrl.getMessages);
router.post('/conversations/:id/attachments', chatUpload.single('file'), ctrl.uploadAttachment);
router.get('/messages/:messageId/attachment-url', ctrl.getAttachmentUrl);
router.patch('/conversations/:id/read', ctrl.markRead);

module.exports = router;

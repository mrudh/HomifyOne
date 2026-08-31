/**
 * @swagger
 * tags:
 *   - name: Chat
 *     description: Real-time messaging between roles
 *   - name: Assistant
 *     description: AI buyer assistant (Gemini-backed)
 *   - name: Analytics
 *     description: Admin-only platform analytics
 *   - name: Health
 *     description: Service health check
 */

/**
 * @swagger
 * /chat/contacts:
 *   get:
 *     summary: List people the logged-in user can start a conversation with
 *     tags: [Chat]
 *     responses:
 *       200: { description: List of contacts }
 */

/**
 * @swagger
 * /chat/conversations:
 *   get:
 *     summary: List the logged-in user's conversations
 *     tags: [Chat]
 *     responses:
 *       200: { description: List of conversations }
 *   post:
 *     summary: Start/open a new conversation
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               recipientId: { type: string }
 *     responses:
 *       201: { description: Conversation opened }
 */

/**
 * @swagger
 * /chat/conversations/{id}/messages:
 *   get:
 *     summary: Get the messages in a conversation
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of messages }
 */

/**
 * @swagger
 * /chat/conversations/{id}/export-pdf:
 *   get:
 *     summary: Download a conversation as a PDF
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf: {}
 */

/**
 * @swagger
 * /chat/conversations/{id}/attachments:
 *   post:
 *     summary: Upload a file attachment into a conversation
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       201: { description: Attachment uploaded }
 */

/**
 * @swagger
 * /chat/messages/{messageId}/attachment-url:
 *   get:
 *     summary: Get a link to download a message's attachment
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Signed attachment URL }
 */

/**
 * @swagger
 * /chat/conversations/{id}/read:
 *   patch:
 *     summary: Mark a conversation's messages as read
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Conversation marked as read }
 */

/**
 * @swagger
 * /assistant/chat:
 *   post:
 *     summary: Send a message to the AI buyer assistant and get a reply
 *     tags: [Assistant]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string, maxLength: 600 }
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role: { type: string, enum: [user, assistant] }
 *                     content: { type: string }
 *               basket: { type: array, items: { type: object } }
 *     responses:
 *       200: { description: Assistant reply, with any matched products and follow-up suggestions }
 *       400: { description: A message is required }
 *       500: { description: Assistant is unavailable right now }
 */

/**
 * @swagger
 * /analytics/overview:
 *   get:
 *     summary: Get platform-wide analytics for the admin dashboard
 *     tags: [Analytics]
 *     responses:
 *       200: { description: Analytics overview }
 *       403: { description: Admin access required }
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check confirming the server is running
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200: { description: Server is up }
 */

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Login, logout, and password reset
 *   - name: Users
 *     description: Admin-only user account management
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate and return a signed JWT
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, role]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               role: { type: string, enum: [buyer, developer, supplier, admin] }
 *     responses:
 *       200: { description: Login successful - sets an httpOnly cookie and also returns the token in the response body }
 *       400: { description: Validation failed (missing/invalid email, password, or role) }
 *       401: { description: Invalid email, password, or role }
 *       429: { description: Too many login attempts - rate limited }
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Clear the auth cookie
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200: { description: Logged out successfully }
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Return the currently logged-in user's own profile
 *     tags: [Auth]
 *     responses:
 *       200: { description: The requesting user's profile }
 *       401: { description: Not authenticated }
 */

/**
 * @swagger
 * /auth/dev-only:
 *   get:
 *     summary: Sample route confirming developer-role access works
 *     tags: [Auth]
 *     responses:
 *       200: { description: Developer access confirmed }
 *       403: { description: Access denied - not a developer }
 */

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Email a password reset OTP to the account, if it exists
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: "Always returns the same generic message, whether or not the email exists, to avoid revealing which accounts are registered" }
 */

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Verify a one-time code and set a new password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, newPassword]
 *             properties:
 *               email: { type: string, format: email }
 *               otp: { type: string, minLength: 6, maxLength: 6 }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Password reset successfully }
 *       400: { description: Invalid or expired reset code }
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List all user accounts
 *     tags: [Users]
 *     responses:
 *       200: { description: List of users }
 *       403: { description: Admin access required }
 *   post:
 *     summary: Create a new user account
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, passwordHash, role]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               passwordHash: { type: string, description: Plain password - hashed automatically on save }
 *               role: { type: string, enum: [buyer, developer, supplier, admin] }
 *     responses:
 *       201: { description: User created }
 *       403: { description: Admin access required }
 */

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get one user's details
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User details }
 *       404: { description: User not found }
 *   patch:
 *     summary: Update a user's details
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       200: { description: User updated }
 *       404: { description: User not found }
 */

/**
 * @swagger
 * /users/{id}/password:
 *   patch:
 *     summary: Reset a user's password (admin action)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword: { type: string }
 *     responses:
 *       200: { description: Password reset }
 */

/**
 * @swagger
 * /users/{id}/developer:
 *   patch:
 *     summary: Reassign a buyer to a different developer
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               developerId: { type: string }
 *     responses:
 *       200: { description: Developer reassigned }
 */

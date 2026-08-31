/**
 * @swagger
 * tags:
 *   - name: Calendar
 *     description: Deadlines, meetings, and delivery ETAs as calendar events
 *   - name: Meetings
 *     description: Developer-scheduled meetings synced to the calendar
 *   - name: Notifications
 *     description: In-app notifications
 */

/**
 * @swagger
 * /calendar:
 *   get:
 *     summary: List the logged-in user's upcoming calendar events
 *     tags: [Calendar]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: List of calendar events }
 */

/**
 * @swagger
 * /calendar/export.ics:
 *   get:
 *     summary: Download the logged-in user's calendar as an .ics file
 *     tags: [Calendar]
 *     responses:
 *       200:
 *         description: iCalendar file
 *         content:
 *           text/calendar: {}
 */

/**
 * @swagger
 * /calendar/feed/{userId}/{token}:
 *   get:
 *     summary: Public calendar feed URL for subscribing in an external calendar app
 *     tags: [Calendar]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: iCalendar feed
 *         content:
 *           text/calendar: {}
 */

/**
 * @swagger
 * /meetings:
 *   post:
 *     summary: Schedule a new meeting and sync it to the calendar (developer)
 *     tags: [Meetings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       201: { description: Meeting created }
 */

/**
 * @swagger
 * /meetings/{id}/cancel:
 *   patch:
 *     summary: Cancel a scheduled meeting
 *     tags: [Meetings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Meeting cancelled }
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get the logged-in user's most recent notifications (up to 50)
 *     tags: [Notifications]
 *     responses:
 *       200: { description: List of notifications }
 */

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark one notification as read
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Notification marked as read }
 */

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all of the user's notifications as read
 *     tags: [Notifications]
 *     responses:
 *       200: { description: All notifications marked as read }
 */

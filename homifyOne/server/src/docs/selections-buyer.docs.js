/**
 * @swagger
 * tags:
 *   - name: Selections
 *     description: Buyer's product selections, submission, and developer review
 *   - name: Questionnaire
 *     description: Buyer lifestyle questionnaire and its AI recommendations
 *   - name: Recommendations
 *     description: Direct pass-through to the AI recommendation microservice
 *   - name: Extras
 *     description: Extras product catalogue (buyer-facing, static data)
 *   - name: Promo
 *     description: Promo code validation
 */

/**
 * @swagger
 * /selections:
 *   get:
 *     summary: Get the buyer's current in-progress selection
 *     tags: [Selections]
 *     responses:
 *       200: { description: Current selection }
 *   post:
 *     summary: Save or update an item in the buyer's selection
 *     tags: [Selections]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       200: { description: Selection saved }
 */

/**
 * @swagger
 * /selections/my:
 *   get:
 *     summary: Get the buyer's current in-progress selection (alias of GET /selections)
 *     tags: [Selections]
 *     responses:
 *       200: { description: Current selection }
 */

/**
 * @swagger
 * /selections/pending:
 *   get:
 *     summary: Get the buyer's selection still awaiting developer approval
 *     tags: [Selections]
 *     responses:
 *       200: { description: Pending selection }
 */

/**
 * @swagger
 * /selections/approved-spend:
 *   get:
 *     summary: Get the buyer's total spend from approved orders
 *     tags: [Selections]
 *     responses:
 *       200: { description: Approved spend total }
 */

/**
 * @swagger
 * /selections/submit:
 *   post:
 *     summary: Submit the buyer's full selection for developer review
 *     tags: [Selections]
 *     responses:
 *       200: { description: Selection submitted }
 */

/**
 * @swagger
 * /selections/order:
 *   get:
 *     summary: Get the buyer's most recent order
 *     tags: [Selections]
 *     responses:
 *       200: { description: Most recent order }
 */

/**
 * @swagger
 * /selections/orders:
 *   get:
 *     summary: List all of the buyer's past orders
 *     tags: [Selections]
 *     responses:
 *       200: { description: List of orders }
 */

/**
 * @swagger
 * /selections/orders/{id}:
 *   get:
 *     summary: Get one specific order's details
 *     tags: [Selections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Order details }
 *       404: { description: Order not found }
 */

/**
 * @swagger
 * /selections/orders/{id}/summary-pdf:
 *   get:
 *     summary: Download a PDF summary of an order
 *     tags: [Selections]
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
 * /selections/developer/orders:
 *   get:
 *     summary: List all orders submitted to the logged-in developer
 *     tags: [Selections]
 *     responses:
 *       200: { description: List of submitted orders }
 */

/**
 * @swagger
 * /selections/developer/summaries:
 *   get:
 *     summary: Get summaries of all orders the developer has approved
 *     tags: [Selections]
 *     responses:
 *       200: { description: Approved order summaries }
 */

/**
 * @swagger
 * /selections/developer/orders/{id}/approve:
 *   patch:
 *     summary: Approve a buyer's submitted order
 *     tags: [Selections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Order approved - triggers purchase order generation }
 */

/**
 * @swagger
 * /selections/developer/orders/{id}/reject:
 *   patch:
 *     summary: Reject a buyer's submitted order, with a reason
 *     tags: [Selections]
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
 *             required: [reason]
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200: { description: Order rejected }
 */

/**
 * @swagger
 * /selections/developer/orders/{id}/regenerate-pdf:
 *   post:
 *     summary: Regenerate the PDF summary for an approved order
 *     tags: [Selections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: PDF regenerated }
 */

/**
 * @swagger
 * /questionnaire/reward:
 *   get:
 *     summary: Get the promo/credit reward for completing the questionnaire
 *     tags: [Questionnaire]
 *     responses:
 *       200: { description: Reward details }
 */

/**
 * @swagger
 * /questionnaire/submit:
 *   post:
 *     summary: Submit the buyer's lifestyle questionnaire answers
 *     tags: [Questionnaire]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               household: { type: string }
 *               lifestyleTraits: { type: array, items: { type: string } }
 *               priorities: { type: array, items: { type: string } }
 *               style: { type: string }
 *               budget: { type: string }
 *               primaryRoom: { type: string }
 *               roomDetails: { type: object }
 *     responses:
 *       200: { description: Questionnaire saved }
 */

/**
 * @swagger
 * /questionnaire/recommendations:
 *   get:
 *     summary: Get AI recommendations generated from the questionnaire
 *     tags: [Questionnaire]
 *     responses:
 *       200: { description: Ranked recommendations }
 */

/**
 * @swagger
 * /recommendations/recommend:
 *   post:
 *     summary: Forward a recommendation request to the Python AI microservice
 *     tags: [Recommendations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, description: Buyer profile - forwarded as-is to the AI service's /recommend endpoint }
 *     responses:
 *       200: { description: Ranked recommendations from the AI service }
 *       500: { description: Recommendation engine unavailable }
 */

/**
 * @swagger
 * /recommendations/understand:
 *   post:
 *     summary: Forward buyer intent/lifestyle text to the AI service for interpretation
 *     tags: [Recommendations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       200: { description: Interpreted profile summary }
 *       500: { description: Understand endpoint unavailable }
 */

/**
 * @swagger
 * /extras:
 *   get:
 *     summary: List extras products, optionally filtered by category or style
 *     tags: [Extras]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: style
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of extras products }
 */

/**
 * @swagger
 * /extras/{slug}:
 *   get:
 *     summary: Get one extras product by its name-based slug
 *     tags: [Extras]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Extras product details }
 *       404: { description: Not found }
 */

/**
 * @swagger
 * /promo/validate:
 *   post:
 *     summary: Check whether a promo code is valid
 *     tags: [Promo]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string }
 *     responses:
 *       200: { description: Promo code validity and details }
 */

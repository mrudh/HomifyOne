/**
 * @swagger
 * tags:
 *   - name: Purchase Orders
 *     description: Supplier fulfilment of developer-generated purchase orders
 *   - name: Invoices
 *     description: Supplier invoice upload, review, and payment status
 */

/**
 * @swagger
 * /purchase-orders/developer/all:
 *   get:
 *     summary: List all purchase orders for the logged-in developer
 *     tags: [Purchase Orders]
 *     parameters:
 *       - in: query
 *         name: plotId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of purchase orders }
 */

/**
 * @swagger
 * /purchase-orders/developer/{id}:
 *   get:
 *     summary: Get one purchase order's details (developer)
 *     tags: [Purchase Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Purchase order details }
 *       404: { description: Order not found }
 */

/**
 * @swagger
 * /purchase-orders:
 *   get:
 *     summary: List all purchase orders for the logged-in supplier
 *     tags: [Purchase Orders]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of purchase orders }
 */

/**
 * @swagger
 * /purchase-orders/{id}:
 *   get:
 *     summary: Get one purchase order's details (supplier)
 *     tags: [Purchase Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Purchase order details }
 *       404: { description: Order not found }
 */

/**
 * @swagger
 * /purchase-orders/{id}/acknowledge:
 *   patch:
 *     summary: Supplier confirms/acknowledges a purchase order
 *     tags: [Purchase Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Order acknowledged }
 *       404: { description: Order not found }
 */

/**
 * @swagger
 * /purchase-orders/{id}/status:
 *   patch:
 *     summary: Update a purchase order's status
 *     tags: [Purchase Orders]
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [acknowledged, sent, fulfilled] }
 *     responses:
 *       200: { description: Status updated }
 *       400: { description: Invalid status }
 *       404: { description: Order not found }
 */

/**
 * @swagger
 * /purchase-orders/{id}/eta:
 *   patch:
 *     summary: Set a delivery ETA for a purchase order and sync it to the developer's calendar
 *     tags: [Purchase Orders]
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
 *             required: [eta]
 *             properties:
 *               eta: { type: string, format: date }
 *     responses:
 *       200: { description: ETA set }
 *       400: { description: ETA date required }
 *       404: { description: Order not found }
 */

/**
 * @swagger
 * /purchase-orders/{id}/invoices:
 *   post:
 *     summary: Supplier uploads an invoice file for a purchase order
 *     tags: [Invoices]
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
 *             required: [invoice, amount]
 *             properties:
 *               invoice: { type: string, format: binary, description: "PDF, JPG, or PNG, up to 10MB" }
 *               amount: { type: number }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Invoice created }
 *       400: { description: Invoice file is required }
 *       404: { description: Purchase order not found }
 *   get:
 *     summary: List invoices submitted for one purchase order (supplier)
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of invoices }
 *       404: { description: Purchase order not found }
 */

/**
 * @swagger
 * /invoices/{invoiceId}/download:
 *   get:
 *     summary: Get a temporary signed download link for an invoice file
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "Signed URL, valid for 5 minutes" }
 *       403: { description: Not authorised - must be the invoice's supplier or its developer }
 *       404: { description: Invoice not found }
 */

/**
 * @swagger
 * /invoices/{invoiceId}/summarise:
 *   post:
 *     summary: Ask the AI service to extract/summarise an invoice's details
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: AI-extracted summary attached to the invoice }
 *       404: { description: Invoice not found }
 *       422: { description: Couldn't reliably extract structured data from this invoice }
 *       502: { description: The AI summariser is unavailable right now }
 */

/**
 * @swagger
 * /invoices/my:
 *   get:
 *     summary: List all of the logged-in supplier's invoices, grouped by plot
 *     tags: [Invoices]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200: { description: Invoices grouped by plot }
 */

/**
 * @swagger
 * /purchase-orders/{id}/invoices/developer:
 *   get:
 *     summary: List invoices submitted for one purchase order (developer)
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of invoices }
 *       404: { description: Purchase order not found }
 */

/**
 * @swagger
 * /invoices/{invoiceId}/status:
 *   patch:
 *     summary: Update an invoice's status (developer)
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [submitted, pending, paid, flagged] }
 *               flagReason: { type: string, description: Required when status is "flagged" }
 *     responses:
 *       200: { description: Status updated }
 *       400: { description: Invalid status, or a reason is required to flag an invoice }
 *       404: { description: Invoice not found }
 */

/**
 * @swagger
 * /invoices/{invoiceId}:
 *   delete:
 *     summary: Delete an invoice that's still awaiting review (supplier)
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Invoice deleted }
 *       400: { description: Only invoices still pending review can be deleted }
 *       404: { description: Invoice not found }
 */

/**
 * @swagger
 * /developer/invoices/all:
 *   get:
 *     summary: List all invoices across every plot the developer manages, grouped by plot
 *     tags: [Invoices]
 *     responses:
 *       200: { description: Invoices grouped by plot, with submission-completeness flags }
 */

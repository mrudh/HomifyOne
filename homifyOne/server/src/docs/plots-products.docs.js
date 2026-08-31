/**
 * @swagger
 * tags:
 *   - name: Plots
 *     description: Plot records, buyer assignment, deadlines, and floor plans
 *   - name: Products
 *     description: Choice/extras product catalogue management
 */

/**
 * @swagger
 * /plots:
 *   get:
 *     summary: List all plots (admin)
 *     tags: [Plots]
 *     responses:
 *       200: { description: List of plots }
 *   post:
 *     summary: Create a new plot (developer)
 *     tags: [Plots]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       201: { description: Plot created }
 */

/**
 * @swagger
 * /plots/buyer/{buyerId}:
 *   get:
 *     summary: Get the plot linked to a specific buyer (admin)
 *     tags: [Plots]
 *     parameters:
 *       - in: path
 *         name: buyerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Plot details }
 *   put:
 *     summary: Create or update a buyer's plot details (admin)
 *     tags: [Plots]
 *     parameters:
 *       - in: path
 *         name: buyerId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       200: { description: Plot upserted }
 */

/**
 * @swagger
 * /plots/buyer/{buyerId}/floorplan:
 *   post:
 *     summary: Upload a floor plan image for a buyer's plot (admin)
 *     tags: [Plots]
 *     parameters:
 *       - in: path
 *         name: buyerId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               floorPlan: { type: string, format: binary }
 *     responses:
 *       200: { description: Floor plan uploaded }
 *       400: { description: A floor plan image is required }
 *       404: { description: "Plot not found - save the property details first" }
 */

/**
 * @swagger
 * /plots/my:
 *   get:
 *     summary: Get the logged-in buyer's own plot
 *     tags: [Plots]
 *     responses:
 *       200: { description: The buyer's plot }
 */

/**
 * @swagger
 * /plots/developer:
 *   get:
 *     summary: List all plots assigned to the logged-in developer
 *     tags: [Plots]
 *     responses:
 *       200: { description: List of the developer's plots }
 */

/**
 * @swagger
 * /plots/{id}/assign-buyer:
 *   patch:
 *     summary: Assign a buyer to a plot (admin)
 *     tags: [Plots]
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
 *               buyerId: { type: string }
 *     responses:
 *       200: { description: Buyer assigned }
 */

/**
 * @swagger
 * /plots/{id}/allowance:
 *   patch:
 *     summary: Set a plot's extras allowance (developer)
 *     tags: [Plots]
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
 *               extrasAllowance: { type: number }
 *     responses:
 *       200: { description: Allowance updated }
 */

/**
 * @swagger
 * /plots/{id}/delivery-update:
 *   post:
 *     summary: Send a delivery status update to the buyer (developer)
 *     tags: [Plots]
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
 *             required: [message]
 *             properties:
 *               message: { type: string }
 *     responses:
 *       200: { description: Update sent to buyer }
 */

/**
 * @swagger
 * /plots/{id}/deadline:
 *   patch:
 *     summary: Set or update a plot's selection deadline and sync it to the calendar (developer)
 *     tags: [Plots]
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
 *             required: [deadline]
 *             properties:
 *               deadline: { type: string, format: date-time }
 *     responses:
 *       200: { description: Deadline updated }
 *       404: { description: Plot not found }
 */

/**
 * @swagger
 * /products/grouped:
 *   get:
 *     summary: Get products grouped by category, for the buyer's selection screen
 *     tags: [Products]
 *     responses:
 *       200: { description: Grouped products }
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: List all products (admin)
 *     tags: [Products]
 *     responses:
 *       200: { description: List of products }
 *   post:
 *     summary: Create a new product (admin)
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               category: { type: string }
 *               subCategory: { type: string }
 *               price: { type: number }
 *               type: { type: string, enum: [choice, extra] }
 *               description: { type: string }
 *     responses:
 *       201: { description: Product created }
 */

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get one product's details (admin)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product details }
 *       404: { description: Product not found }
 *   patch:
 *     summary: Update a product (admin)
 *     tags: [Products]
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
 *       200: { description: Product updated }
 *   delete:
 *     summary: Delete a product (admin)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product deleted }
 */

/**
 * @swagger
 * /products/{id}/image:
 *   post:
 *     summary: Upload or replace a product's image (admin)
 *     tags: [Products]
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
 *               image: { type: string, format: binary }
 *     responses:
 *       200: { description: Image uploaded }
 *       400: { description: An image file is required }
 *       404: { description: Product not found }
 */

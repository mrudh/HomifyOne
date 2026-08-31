const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const invoiceRoutes = require('./routes/invoices.routes');


const app = express();

app.use(helmet());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/plots', require('./routes/plot.routes'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/selections', require('./routes/selection.routes'));
app.use('/api/questionnaire', require('./routes/questionnaire.routes'));
app.use('/api/recommendations', require('./routes/recommendation.routes'));
app.use('/api/extras', require('./routes/extras.routes'));
app.use('/api/promo', require('./routes/promo.routes'));
app.use('/api/purchase-orders', require('./routes/purchaseOrders.routes'));
app.use('/api', invoiceRoutes);
app.use('/api/calendar', require('./routes/calendar.routes'));
app.use('/api/meetings', require('./routes/meetings.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/assistant', require('./routes/assistant.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(require('./middleware/errorHandler'));

module.exports = app;

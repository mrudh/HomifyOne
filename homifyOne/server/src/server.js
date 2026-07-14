require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const invoiceRoutes = require('./routes/invoices.routes');
const path = require('path');


const app = express();

connectDB();

app.use(helmet());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('dev'));
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

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
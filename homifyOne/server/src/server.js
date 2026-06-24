const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
require('dotenv').config();

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

app.use(require('./middleware/errorHandler'));

app.use('/api/products',   require('./routes/product.routes'));
app.use('/api/selections', require('./routes/selection.routes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
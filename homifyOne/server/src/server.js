require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const invoiceRoutes = require('./routes/invoices.routes');
const { setIO } = require('./services/notification.service');
const { setIO: setChatIO } = require('./services/chat.service');
const { registerChatHandlers } = require('./socket/chat.socket');
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
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/chat', require('./routes/chat.routes'));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(require('./middleware/errorHandler'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', credentials: true },
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('unauthorized'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.join(String(socket.userId));
  registerChatHandlers(io, socket);
});

setIO(io);
setChatIO(io);

require('./jobs/scheduler')();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
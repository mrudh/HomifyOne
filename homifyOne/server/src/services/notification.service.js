const Notification = require('../models/Notification');
let io = null;
exports.setIO = (instance) => { io = instance; };

exports.notify = async ({ recipient, type, title, message = '', link = '', meta = {} }) => {
  try {
    const notification = await Notification.create({ recipient, type, title, message, link, meta });
    if (io) io.to(String(recipient)).emit('notification:new', notification);
    return notification;
  } catch (err) {
    console.error(`notify() failed for type="${type}", recipient=${recipient}:`, err.message);
  }
};
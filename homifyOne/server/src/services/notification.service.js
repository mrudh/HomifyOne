const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendNotificationEmail } = require('../utils/emailService');

let io = null;
exports.setIO = (instance) => { io = instance; };

exports.notify = async ({ recipient, type, title, message = '', link = '', meta = {} }) => {
  let notification;
  try {
    notification = await Notification.create({ recipient, type, title, message, link, meta });
    if (io) io.to(String(recipient)).emit('notification:new', notification);
  } catch (err) {
    console.error(`notify() failed for type="${type}", recipient=${recipient}:`, err.message);
    return;
  }

  try {
    const user = await User.findById(recipient).select('name email');
    if (user?.email) {
      await sendNotificationEmail(user.email, user.name || 'there', title, message);
    }
  } catch (err) {
    console.error(`notify() email fallback failed for type="${type}", recipient=${recipient}:`, err.message);
  }

  return notification;
};
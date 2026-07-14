const Notification = require('../models/Notification');

async function createNotification({ user, type, message, relatedId = null, relatedModel = null }) {
  if (!user) return null; // guard against undefined participants (e.g. missing developer/buyer)

  const notification = await Notification.create({
    user,
    type,
    message,
    relatedId,
    relatedModel,
    read: false,
  });

  return notification;
}

async function getUserNotifications(userId, { unreadOnly = false } = {}) {
  const query = { user: userId };
  if (unreadOnly) query.read = false;
  return Notification.find(query).sort({ createdAt: -1 });
}

async function markAsRead(notificationId) {
  return Notification.findByIdAndUpdate(notificationId, { read: true }, { new: true });
}

module.exports = { createNotification, getUserNotifications, markAsRead };
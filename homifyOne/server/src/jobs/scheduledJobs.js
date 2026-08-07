const Plot = require('../models/Plot');
const PurchaseOrder = require('../models/PurchaseOrder');
const { notify } = require('../services/notification.service');

const DEADLINE_THRESHOLDS = [7, 3, 1];
const STALE_PO_HOURS = 48;

const SELECTIONS_NOT_SUBMITTED = { $nin: ['selections_submitted', 'selections_approved', 'completed'] };


function daysUntil(date) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const now = new Date();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date);
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((targetMidnight - nowMidnight) / msPerDay);
}


exports.sendDeadlineReminders = async () => {
  const plots = await Plot.find({
    status: SELECTIONS_NOT_SUBMITTED,
    deadline: { $ne: null },
    buyer: { $ne: null },
  }).populate('buyer', 'name email');

  let sent = 0;
  for (const plot of plots) {
    if (!plot.buyer || !plot.deadline) continue;

    const diff = daysUntil(plot.deadline);
    if (!DEADLINE_THRESHOLDS.includes(diff)) continue;
    if (plot.deadlineRemindersSent?.includes(diff)) continue;

    const dayWord = diff === 1 ? 'day' : 'days';
    const title = `Selection deadline in ${diff} ${dayWord}`;
    const message = `Your selection deadline for Plot ${plot.plotNumber} is in ${diff} ${dayWord}. Please complete and submit your choices before then.`;

    await notify({
      recipient: plot.buyer._id,
      type: 'deadline_reminder',
      title,
      message,
      link: '/buyer/dashboard',
    });

    plot.deadlineRemindersSent = [...(plot.deadlineRemindersSent || []), diff];
    await plot.save();
    sent++;
  }
  return sent;
};


exports.flagOverdueSelections = async () => {
  const plots = await Plot.find({
    status: SELECTIONS_NOT_SUBMITTED,
    deadline: { $lt: new Date() },
    overdueFlagged: { $ne: true },
    buyer: { $ne: null },
  }).populate('developer', 'name email').populate('buyer', 'name');

  let flagged = 0;
  for (const plot of plots) {
    if (!plot.developer) continue;

    const title = `Selection deadline passed — Plot ${plot.plotNumber}`;
    const message = `Plot ${plot.plotNumber}'s selection deadline has passed and ${plot.buyer?.name || 'the buyer'} still hasn't submitted their choices.`;

    await notify({
      recipient: plot.developer._id,
      type: 'selection_overdue',
      title,
      message,
      link: '/developer/plots',
    });

    plot.overdueFlagged = true;
    await plot.save();
    flagged++;
  }
  return flagged;
};


exports.flagStalePurchaseOrders = async () => {
  const cutoff = new Date(Date.now() - STALE_PO_HOURS * 60 * 60 * 1000);
  const orders = await PurchaseOrder.find({
    status: 'pending',
    createdAt: { $lt: cutoff },
    staleAlertSent: { $ne: true },
  }).populate('supplier', 'name email').populate('developer', 'name email').populate('plot', 'plotNumber');

  let flagged = 0;
  for (const order of orders) {
    const ref = `#${String(order._id).slice(-6).toUpperCase()}`;
    const plotLabel = order.plot?.plotNumber ? `Plot ${order.plot.plotNumber}` : 'its plot';
    const message = `Purchase order ${ref} for ${plotLabel} has been awaiting acknowledgement for more than 48 hours.`;

    if (order.supplier) {
      await notify({
        recipient: order.supplier._id,
        type: 'purchase_order_stale',
        title: `Purchase order ${ref} needs acknowledgement`,
        message,
        link: '/supplier/purchase-orders',
      });
    }

    if (order.developer) {
      await notify({
        recipient: order.developer._id,
        type: 'purchase_order_stale',
        title: `Purchase order ${ref} still unacknowledged`,
        message,
        link: '/developer/purchase-orders',
      });
    }

    order.staleAlertSent = true;
    await order.save();
    flagged++;
  }
  return flagged;
};

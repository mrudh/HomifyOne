const CalendarEvent = require('../models/CalendarEvent');
const { notify } = require('../services/notification.service'); 

async function upsertEvent({ sourceType, sourceId, ...data }) {
  const existing = await CalendarEvent.findOne({ sourceType, sourceId });

  if (existing) {
    Object.assign(existing, data, { status: 'updated' });
    await existing.save();
    return existing;
  }

  return CalendarEvent.create({ sourceType, sourceId, ...data, status: 'scheduled' });
}

async function cancelEvent(sourceType, sourceId) {
  return CalendarEvent.findOneAndUpdate(
    { sourceType, sourceId },
    { status: 'cancelled' },
    { new: true }
  );
}

async function syncMeeting(meeting) {
  const event = await upsertEvent({
    sourceType: 'meeting',
    sourceId: meeting._id,
    type: 'meeting',
    title: meeting.title || 'Buyer-Developer Meeting',
    description: meeting.notes,
    startTime: meeting.scheduledAt,
    endTime: new Date(meeting.scheduledAt.getTime() + (meeting.durationMinutes || 30) * 60000),
    participants: [meeting.buyer, meeting.developer],
    plot: meeting.plot,
    meeting: meeting._id,
    createdBy: meeting.developer,
  });

  await Promise.all([
    notify({
      user: meeting.buyer,
      type: 'meeting_scheduled',
      message: `A meeting has been scheduled for ${meeting.scheduledAt.toLocaleDateString('en-GB')}.`,
    }),
    notify({
      user: meeting.developer,
      type: 'meeting_scheduled',
      message: `Meeting with buyer confirmed for ${meeting.scheduledAt.toLocaleDateString('en-GB')}.`,
    }),
  ]);

  return event;
}

async function syncPlotDeadline(plot) {
  if (!plot.deadline) return cancelEvent('plot_deadline', plot._id);

  const event = await upsertEvent({
    sourceType: 'plot_deadline',
    sourceId: plot._id,
    type: 'deadline',
    title: `Selection Deadline — Plot ${plot.plotNumber}`,
    description: 'Final date to submit your extras selection.',
    startTime: plot.deadline,
    allDay: true,
    participants: [plot.buyer, plot.developer].filter(Boolean),
    plot: plot._id,
    createdBy: plot.developer,
  });

  return event;
}

async function syncSupplierEta(purchaseOrder) {
  if (!purchaseOrder.eta) return cancelEvent('po_eta', purchaseOrder._id);

  const event = await upsertEvent({
    sourceType: 'po_eta',
    sourceId: purchaseOrder._id,
    type: 'supplier_eta',
    title: `Delivery ETA — Plot ${purchaseOrder.plot?.plotNumber || ''}`,
    description: `Expected delivery for PO #${purchaseOrder._id.toString().slice(-6)} · Supplier: ${purchaseOrder.supplier?.name || 'Unknown'}`,
    startTime: purchaseOrder.eta,
    allDay: true,
    participants: [purchaseOrder.developer, purchaseOrder.supplier].filter(Boolean),
    purchaseOrder: purchaseOrder._id,
    plot: purchaseOrder.plot?._id || purchaseOrder.plot,
    createdBy: purchaseOrder.supplier,
  });

  await notify({
    user: purchaseOrder.developer,
    type: 'eta_updated',
    message: `Supplier set delivery ETA to ${purchaseOrder.eta.toLocaleDateString('en-GB')}.`,
  });

  return event;
}

module.exports = { syncMeeting, syncPlotDeadline, syncSupplierEta, cancelEvent };
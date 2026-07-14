const ical = require('ical-generator').default;
const CalendarEvent = require('../models/CalendarEvent');

async function generateUserFeed(userId) {
  const events = await CalendarEvent.find({
    participants: userId,
    status: { $ne: 'cancelled' },
  }).populate('plot', 'plotNumber development');

  const calendar = ical({ name: 'HomifyOne Calendar' });

  events.forEach((ev) => {
    calendar.createEvent({
      start: ev.startTime,
      end: ev.endTime || ev.startTime,
      allDay: ev.allDay,
      summary: ev.title,
      description: ev.description || '',
      location: ev.plot ? `Plot ${ev.plot.plotNumber}, ${ev.plot.development}` : undefined,
      id: ev._id.toString(),
    });
  });

  return calendar;
}

module.exports = { generateUserFeed };
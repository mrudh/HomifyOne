import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TYPE_STYLES = {
  meeting: { label: 'Meeting', dot: 'bg-blue-500', cls: 'bg-blue-100 text-blue-700', icon: '🤝' },
  deadline: { label: 'Deadline', dot: 'bg-red-500', cls: 'bg-red-100 text-red-700', icon: '⏰' },
  supplier_eta: { label: 'Delivery ETA', dot: 'bg-green-500', cls: 'bg-green-100 text-green-700', icon: '🚚' },
};

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function dateKey(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
}

function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; 
  const gridStart = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

export default function CalendarPage() {
  const { user } = useAuth();
  const isDeveloper = user?.role === 'developer';

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);

  const [showModal, setShowModal] = useState(false);
  const [plots, setPlots] = useState([]);
  const [form, setForm] = useState({
    plot: '', title: '', notes: '', scheduledAt: '', durationMinutes: 30, location: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get('/calendar');
        setEvents(res.data.events || []);
      } catch (err) {
        console.error('Calendar load error:', err.message);
        setError('Unable to load your calendar right now. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!isDeveloper) return;
    const fetchPlots = async () => {
      try {
        const res = await api.get('/plots/developer');
        setPlots((res.data.plots || []).filter((p) => p.buyer));
      } catch (err) {
        console.error('Plots load error:', err.message);
      }
    };
    fetchPlots();
  }, [isDeveloper]);

  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      const key = dateKey(new Date(ev.startTime));
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [events]);

  const grid = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const selectedEvents = eventsByDay[dateKey(selectedDate)] || [];

  const goPrevMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const goNextMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  const goToday = () => {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  const openModal = () => {
    setForm({ plot: '', title: '', notes: '', scheduledAt: '', durationMinutes: 30, location: '' });
    setFormError('');
    setShowModal(true);
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (!form.plot || !form.scheduledAt) {
      setFormError('Plot and date/time are required.');
      return;
    }
    const plotObj = plots.find((p) => p._id === form.plot);
    if (!plotObj?.buyer) {
      setFormError('Selected plot has no buyer assigned.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const res = await api.post('/meetings', {
        plot: form.plot,
        buyer: plotObj.buyer._id || plotObj.buyer,
        title: form.title || 'Buyer-Developer Meeting',
        notes: form.notes,
        scheduledAt: new Date(form.scheduledAt),
        durationMinutes: Number(form.durationMinutes) || 30,
        location: form.location,
      });

      const refreshed = await api.get('/calendar');
      setEvents(refreshed.data.events || []);
      setShowModal(false);
      setSelectedDate(new Date(form.scheduledAt));
      setCursor(new Date(new Date(form.scheduledAt).getFullYear(), new Date(form.scheduledAt).getMonth(), 1));
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to schedule meeting.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10">
        <div className="text-left">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-xs text-gray-400 mt-0.5">Meetings, deadlines and delivery ETAs</p>
        </div>
        {isDeveloper && (
          <button
            onClick={openModal}
            className="bg-[#1a4a45] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2d6b62] transition whitespace-nowrap shrink-0"
          >
            + Add Meeting
          </button>
        )}
      </div>

      <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center mb-6">
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Month grid */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button onClick={goPrevMonth} className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 font-bold">‹</button>
                <h2 className="text-base font-bold text-gray-800 w-40 text-center">
                  {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
                </h2>
                <button onClick={goNextMonth} className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 font-bold">›</button>
              </div>
              <button onClick={goToday} className="text-xs font-semibold text-[#1a4a45] border border-[#1a4a45] rounded-lg px-3 py-1.5 hover:bg-[#f0f7f6]">
                Today
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-xs font-semibold text-gray-400 text-center py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {grid.map((day) => {
                const inMonth = day.getMonth() === cursor.getMonth();
                const isToday = dateKey(day) === dateKey(today);
                const isSelected = dateKey(day) === dateKey(selectedDate);
                const dayEvents = eventsByDay[dateKey(day)] || [];
                const uniqueTypes = [...new Set(dayEvents.map((e) => e.type))];

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`aspect-square rounded-xl p-1.5 flex flex-col items-center justify-start text-sm transition
                      ${isSelected ? 'bg-[#1a4a45] text-white' : isToday ? 'bg-[#eef7f5] text-[#1a4a45] font-bold' : inMonth ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-300 hover:bg-gray-50'}`}
                  >
                    <span>{day.getDate()}</span>
                    {uniqueTypes.length > 0 && (
                      <div className="flex gap-0.5 mt-1">
                        {uniqueTypes.slice(0, 3).map((t) => (
                          <span key={t} className={`w-1.5 h-1.5 rounded-full ${TYPE_STYLES[t]?.dot || 'bg-gray-400'}`} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
              {Object.entries(TYPE_STYLES).map(([key, s]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          {/* Day detail panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-fit">
            <p className="text-xs font-semibold tracking-widest text-gray-400 mb-3 text-left">
              {selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
            </p>

            {selectedEvents.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-3xl mb-2">📅</p>
                <p className="text-sm text-gray-400">No events on this day.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((ev) => {
                  const s = TYPE_STYLES[ev.type] || TYPE_STYLES.meeting;
                  return (
                    <div key={ev._id} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-lg shrink-0">{s.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{ev.title}</p>
                          {ev.description && <p className="text-xs text-gray-400 mt-0.5">{ev.description}</p>}
                          {ev.plot && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              Plot {ev.plot.plotNumber} · {ev.plot.development}
                            </p>
                          )}
                          {!ev.allDay && (
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(ev.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mt-2 ${s.cls}`}>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 text-left">Schedule Meeting</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-xl mb-3">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateMeeting} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Plot / Buyer</label>
                <select
                  value={form.plot}
                  onChange={(e) => setForm({ ...form, plot: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="">Select a plot</option>
                  {plots.map((p) => (
                    <option key={p._id} value={p._id}>
                      Plot {p.plotNumber} — {p.buyer?.name || 'No buyer'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Buyer-Developer Meeting"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Duration (min)</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Office, video call link, etc."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#1a4a45] text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-[#2d6b62] transition disabled:opacity-50"
              >
                {saving ? 'Scheduling...' : 'Schedule Meeting'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
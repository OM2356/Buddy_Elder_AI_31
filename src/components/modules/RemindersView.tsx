import React, { useEffect, useState } from 'react';
import { Bell, CalendarClock, CheckCircle2, Edit3, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiRequest } from '../../lib/api';
import type { Reminder } from '../../types';

export const RemindersView: React.FC = () => {
  const { preferences } = useApp();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Medication');
  const [scheduledTime, setScheduledTime] = useState(() => {
    const d = new Date(Date.now() + 3600000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly'>('daily');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<string>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [error, setError] = useState('');

  const timezone = preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

  const loadReminders = async () => {
    try {
      const data = await apiRequest<{ reminders: Reminder[] }>('/api/reminders');
      setReminders(data.reminders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load reminders.');
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const isoTime = new Date(scheduledTime).toISOString();
      if (editingId) {
        await apiRequest(`/api/reminders/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({ title, category, scheduledTime: isoTime, recurrence }),
        });
        setEditingId(null);
      } else {
        await apiRequest('/api/reminders', {
          method: 'POST',
          body: JSON.stringify({ title, category, scheduledTime: isoTime, recurrence, timezone }),
        });
      }
      setTitle('');
      loadReminders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reminder.');
    }
  };

  const toggleCompleted = async (r: Reminder) => {
    await apiRequest(`/api/reminders/${r.id}`, {
      method: 'PUT',
      body: JSON.stringify({ completed: !r.completed }),
    });
    loadReminders();
  };

  const removeReminder = async (id: string) => {
    await apiRequest(`/api/reminders/${id}`, { method: 'DELETE' });
    loadReminders();
  };

  const startEdit = (r: Reminder) => {
    setEditingId(r.id);
    setTitle(r.title);
    setCategory(r.category);
    setRecurrence(r.recurrence);
    const d = new Date(r.scheduled_time);
    setScheduledTime(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  };

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      setNotifPermission('unsupported');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-[#0F3D5E] dark:text-white">Smart Reminders</h1>
        <p className="text-lg text-[#4A5A68] dark:text-slate-300 tabular-nums">
          Schedule medicine, hydration, walks, doctor appointments, and family events. Active timezone: {timezone}.
        </p>
      </header>

      {/* Honest Browser Notification Status */}
      <div className="p-4 rounded-2xl bg-[#F3EFE6] dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-[#0D7377]" />
          <p className="text-base">
            <strong>Browser Notification Status:</strong>{' '}
            {notifPermission === 'granted'
              ? 'Enabled for this browser session.'
              : notifPermission === 'denied'
              ? 'Blocked in browser settings (reminders still display inside your dashboard).'
              : notifPermission === 'unsupported'
              ? 'Browser push notifications unavailable here; reminders remain visible in-app.'
              : 'Not yet granted. Tap Enable to allow browser alerts when open.'}
          </p>
        </div>
        {notifPermission === 'default' && (
          <button
            type="button"
            onClick={requestNotificationPermission}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0D7377] text-white font-bold"
          >
            Enable Browser Alerts
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 text-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSave}
          className="lg:col-span-5 bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl p-6 space-y-4"
        >
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Plus className="w-6 h-6 text-[#0D7377]" />
            <span>{editingId ? 'Edit Reminder' : 'New Reminder'}</span>
          </h2>

          <div>
            <label htmlFor="rem-title" className="block text-base font-bold mb-1">Reminder Title</label>
            <input
              id="rem-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning BP tablet & glass of water"
              className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg"
            />
          </div>

          <div>
            <label htmlFor="rem-cat" className="block text-base font-bold mb-1">Category</label>
            <select
              id="rem-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg font-semibold"
            >
              {['Medication', 'Water', 'Exercise', 'Appointment', 'Learning', 'Family Event', 'Custom'].map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rem-time" className="block text-base font-bold mb-1">Date &amp; Time</label>
            <input
              id="rem-time"
              type="datetime-local"
              required
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg tabular-nums"
            />
          </div>

          <div>
            <label htmlFor="rem-rec" className="block text-base font-bold mb-1">Repeat Schedule</label>
            <select
              id="rem-rec"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as 'none' | 'daily' | 'weekly')}
              className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg font-semibold"
            >
              <option value="none">One-time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 min-h-[52px] px-5 py-3 rounded-xl bg-[#0F3D5E] hover:bg-[#0B2D47] dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-bold text-lg"
            >
              {editingId ? 'Save Changes' : 'Create Reminder'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setTitle('');
                }}
                className="min-h-[52px] px-4 rounded-xl border border-[#D8CEB8] dark:border-slate-700 font-bold"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <section className="lg:col-span-7 bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-[#0D7377]" />
            <span>Your Scheduled Reminders ({reminders.length})</span>
          </h2>

          {reminders.length === 0 ? (
            <p className="text-base text-[#4A5A68] dark:text-slate-400">
              No reminders created yet. Add your first medication, hydration, or appointment reminder on the left.
            </p>
          ) : (
            <ul className="divide-y divide-[#E5DEC9] dark:divide-slate-800">
              {reminders.map((r) => (
                <li key={r.id} className="py-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleCompleted(r)}
                      aria-label={r.completed ? 'Mark reminder pending' : 'Mark reminder completed'}
                      className={`mt-1 p-1.5 rounded-lg border ${
                        r.completed
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-[#CFC6B2] dark:border-slate-600 text-transparent hover:border-[#0D7377]'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <div>
                      <p className={`text-lg font-bold ${r.completed ? 'line-through opacity-60' : ''}`}>{r.title}</p>
                      <p className="text-sm text-[#4A5A68] dark:text-slate-400 tabular-nums">
                        {r.category} · {new Date(r.scheduled_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · Repeat: {r.recurrence}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(r)}
                      aria-label="Edit reminder"
                      className="p-2.5 rounded-lg hover:bg-[#F3EFE6] dark:hover:bg-slate-800"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeReminder(r.id)}
                      aria-label="Delete reminder"
                      className="p-2.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

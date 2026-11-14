import React, { useEffect, useState } from 'react';
import { Droplets, HeartPulse, Moon, Smile, Activity, Pill } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import type { PrivacyLevel, WellnessEntry } from '../../types';

export const WellnessView: React.FC = () => {
  const [entries, setEntries] = useState<WellnessEntry[]>([]);
  const [mood, setMood] = useState<WellnessEntry['mood']>('happy');
  const [hydration, setHydration] = useState(6);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [activityMinutes, setActivityMinutes] = useState(25);
  const [medicationTaken, setMedicationTaken] = useState(true);
  const [notes, setNotes] = useState('');
  const [visibility, setVisibility] = useState<PrivacyLevel>('LIMITED');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [imgErr, setImgErr] = useState(false);

  const loadEntries = async () => {
    try {
      const data = await apiRequest<{ entries: WellnessEntry[] }>('/api/wellness');
      setEntries(data.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load wellness history.');
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSavedMsg('');
    try {
      await apiRequest('/api/wellness', {
        method: 'POST',
        body: JSON.stringify({
          mood,
          hydrationGlasses: hydration,
          sleepHours,
          activityMinutes,
          medicationTaken,
          notes,
          visibility,
        }),
      });
      setNotes('');
      setSavedMsg('Today’s wellness check-in has been saved safely.');
      loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save wellness entry.');
    } finally {
      setSaving(false);
    }
  };

  const weekly = entries.slice(0, 7);
  const avgWater = weekly.length ? (weekly.reduce((a, b) => a + b.hydration_glasses, 0) / weekly.length).toFixed(1) : '—';
  const avgSleep = weekly.length ? (weekly.reduce((a, b) => a + b.sleep_hours, 0) / weekly.length).toFixed(1) : '—';
  const avgActivity = weekly.length ? Math.round(weekly.reduce((a, b) => a + b.activity_minutes, 0) / weekly.length) : '—';

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-[#0F3D5E] dark:text-white">Wellness Center</h1>
        <p className="text-lg text-[#4A5A68] dark:text-slate-300">
          Track daily mood, hydration, sleep, gentle movement, and medication routine. You decide what stays private.
        </p>
        <p className="text-sm font-medium text-[#0D7377] dark:text-teal-300">
          Note: Wellness tracking supports healthy daily habits and does not provide medical diagnoses or prescribe medication.
        </p>
      </header>

      {/* Weekly Summary Strip */}
      <section className="grid sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800">
          <p className="text-sm text-[#4A5A68] dark:text-slate-400">7-Day Avg Hydration</p>
          <p className="text-3xl font-bold mt-1 tabular-nums">{avgWater} glasses</p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800">
          <p className="text-sm text-[#4A5A68] dark:text-slate-400">7-Day Avg Sleep</p>
          <p className="text-3xl font-bold mt-1 tabular-nums">{avgSleep} hours</p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800">
          <p className="text-sm text-[#4A5A68] dark:text-slate-400">7-Day Avg Activity</p>
          <p className="text-3xl font-bold mt-1 tabular-nums">{avgActivity} min/day</p>
        </div>
      </section>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl p-6 space-y-6"
        >
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Smile className="w-6 h-6 text-[#0D7377]" />
            <span>How are you feeling today?</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(['happy', 'okay', 'sad', 'stressed', 'tired'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(m)}
                className={`min-h-[54px] px-3 py-3 rounded-xl border text-lg font-bold capitalize transition-colors ${
                  mood === m
                    ? 'bg-[#0F3D5E] text-white border-[#0F3D5E] dark:bg-sky-500 dark:text-slate-950'
                    : 'bg-[#FAF8F4] dark:bg-slate-900 border-[#D8CEB8] dark:border-slate-700'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-slate-900 border border-[#E5DEC9] dark:border-slate-800">
              <label htmlFor="well-water" className="flex items-center gap-2 text-base font-bold mb-2">
                <Droplets className="w-5 h-5 text-[#0D7377]" />
                <span>Water (glasses)</span>
              </label>
              <input
                id="well-water"
                type="number"
                min={0}
                max={25}
                value={hydration}
                onChange={(e) => setHydration(Number(e.target.value))}
                className="w-full min-h-[48px] px-3 rounded-lg border border-[#CFC6B2] dark:border-slate-700 bg-white dark:bg-slate-800 text-xl font-bold tabular-nums"
              />
            </div>

            <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-slate-900 border border-[#E5DEC9] dark:border-slate-800">
              <label htmlFor="well-sleep" className="flex items-center gap-2 text-base font-bold mb-2">
                <Moon className="w-5 h-5 text-[#0D7377]" />
                <span>Sleep (hours)</span>
              </label>
              <input
                id="well-sleep"
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={sleepHours}
                onChange={(e) => setSleepHours(Number(e.target.value))}
                className="w-full min-h-[48px] px-3 rounded-lg border border-[#CFC6B2] dark:border-slate-700 bg-white dark:bg-slate-800 text-xl font-bold tabular-nums"
              />
            </div>

            <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-slate-900 border border-[#E5DEC9] dark:border-slate-800">
              <label htmlFor="well-activity" className="flex items-center gap-2 text-base font-bold mb-2">
                <Activity className="w-5 h-5 text-[#0D7377]" />
                <span>Walk / Yoga (min)</span>
              </label>
              <input
                id="well-activity"
                type="number"
                min={0}
                max={300}
                value={activityMinutes}
                onChange={(e) => setActivityMinutes(Number(e.target.value))}
                className="w-full min-h-[48px] px-3 rounded-lg border border-[#CFC6B2] dark:border-slate-700 bg-white dark:bg-slate-800 text-xl font-bold tabular-nums"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 p-4 rounded-xl bg-[#FAF8F4] dark:bg-slate-900 border border-[#E5DEC9] dark:border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={medicationTaken}
              onChange={(e) => setMedicationTaken(e.target.checked)}
              className="w-6 h-6 accent-[#0D7377]"
            />
            <Pill className="w-5 h-5 text-[#0D7377]" />
            <span className="text-lg font-semibold">I followed my planned daily medication routine</span>
          </label>

          <div>
            <label htmlFor="well-notes" className="block text-base font-bold mb-2">
              Personal Notes (Optional)
            </label>
            <textarea
              id="well-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any reflections about energy, walk, or rest today..."
              className="w-full p-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg"
            />
          </div>

          <div>
            <label htmlFor="well-vis" className="block text-base font-bold mb-2">
              Who can see this check-in?
            </label>
            <select
              id="well-vis"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as PrivacyLevel)}
              className="w-full min-h-[48px] px-4 py-2 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg font-semibold"
            >
              <option value="PRIVATE">PRIVATE — Only me</option>
              <option value="LIMITED">LIMITED — Summary only if caregiver has wellness permission</option>
              <option value="AUTHORIZED">AUTHORIZED — Share with approved caregivers</option>
            </select>
          </div>

          {error && (
            <div role="alert" className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 text-red-900 dark:text-red-200">
              {error}
            </div>
          )}
          {savedMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-900 dark:text-emerald-200 font-semibold">
              {savedMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-[56px] px-6 py-3.5 rounded-xl bg-[#0F3D5E] hover:bg-[#0B2D47] dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 text-xl font-bold transition-colors"
          >
            {saving ? 'Saving...' : 'Save Today’s Check-In'}
          </button>
        </form>

        <aside className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl overflow-hidden border border-[#E5DEC9] dark:border-slate-800 bg-white dark:bg-[#121F2C]">
            {!imgErr ? (
              <img
                src="/src/assets/images/wellness_morning_care_1794661355626.jpg"
                alt="Morning herbal tea, fresh water, and daily wellness planner"
                referrerPolicy="no-referrer"
                onError={() => setImgErr(true)}
                className="w-full h-52 object-cover"
              />
            ) : (
              <div className="w-full h-40 bg-[#F3EFE6] dark:bg-slate-800 flex items-center justify-center">
                <HeartPulse className="w-10 h-10 text-[#0D7377]" />
              </div>
            )}
            <div className="p-5">
              <h2 className="text-xl font-bold">Daily Gentle Routine</h2>
              <p className="text-base text-[#4A5A68] dark:text-slate-300 mt-1">
                Morning water, light stretching or a 20-minute walk, and calm evening rest help sustain energy and mood.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 space-y-3">
            <h2 className="text-xl font-bold">Wellness History</h2>
            {entries.length === 0 ? (
              <p className="text-base text-[#4A5A68] dark:text-slate-400">No check-ins yet. Log your first check-in on the left.</p>
            ) : (
              <ul className="divide-y divide-[#E5DEC9] dark:divide-slate-800 max-h-[380px] overflow-y-auto">
                {entries.map((entry) => (
                  <li key={entry.id} className="py-3 space-y-1">
                    <div className="flex justify-between items-center text-base font-bold">
                      <span className="capitalize">Mood: {entry.mood}</span>
                      <span className="text-sm font-normal text-[#4A5A68] dark:text-slate-400 tabular-nums">
                        {new Date(entry.created_at).toLocaleDateString('en-IN')} · {entry.visibility}
                      </span>
                    </div>
                    <p className="text-sm text-[#4A5A68] dark:text-slate-300 tabular-nums">
                      {entry.hydration_glasses} glasses · {entry.sleep_hours}h sleep · {entry.activity_minutes} min active
                    </p>
                    {entry.notes && <p className="text-base italic mt-1">{entry.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

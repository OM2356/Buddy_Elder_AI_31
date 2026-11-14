import React, { useEffect, useState } from 'react';
import { Lock, PhoneCall, UserCheck } from 'lucide-react';
import { apiRequest } from '../../lib/api';

interface SeniorLink {
  id: string;
  senior_id: string;
  senior_name: string;
  senior_email: string;
  senior_phone: string;
  relationship: string;
  privacy_level: 'PRIVATE' | 'LIMITED' | 'AUTHORIZED';
  caregiver_notes: string;
}

interface SeniorOverview {
  connection: SeniorLink;
  privacyNotice?: string;
  wellness: Array<{ id: string; mood: string; hydration_glasses: number; sleep_hours: number; activity_minutes: number; created_at: string }> | null;
  reminders: Array<{ id: string; title: string; category: string; scheduled_time: string; completed: number }> | null;
  learning: Array<{ title: string; category: string; status: string; progress_percent: number; quiz_score: number | null }> | null;
  scamAlerts: Array<{ id: string; input_type: string; risk_level: string; risk_score: number; created_at: string }> | null;
  emergencyContacts: Array<{ id: string; name: string; relationship: string; phone: string }> | null;
}

export const CaregiverDashboardView: React.FC = () => {
  const [seniors, setSeniors] = useState<SeniorLink[]>([]);
  const [selectedSeniorId, setSelectedSeniorId] = useState<string | null>(null);
  const [overview, setOverview] = useState<SeniorOverview | null>(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [error, setError] = useState('');

  const loadSeniors = async () => {
    try {
      const data = await apiRequest<{ seniors: SeniorLink[] }>('/api/caregiver/seniors');
      setSeniors(data.seniors);
      if (data.seniors.length > 0 && !selectedSeniorId) {
        setSelectedSeniorId(data.seniors[0].senior_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load connected seniors.');
    }
  };

  useEffect(() => {
    loadSeniors();
  }, []);

  useEffect(() => {
    if (!selectedSeniorId) return;
    apiRequest<SeniorOverview>(`/api/caregiver/seniors/${selectedSeniorId}/overview`)
      .then((d) => {
        setOverview(d);
        setNotes(d.connection.caregiver_notes || '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load senior overview.'));
  }, [selectedSeniorId]);

  const saveCaregiverNotes = async () => {
    if (!overview) return;
    setSavingNotes(true);
    setSavedMsg('');
    try {
      await apiRequest(`/api/caregiver/connections/${overview.connection.id}/notes`, {
        method: 'PATCH',
        body: JSON.stringify({ caregiverNotes: notes }),
      });
      setSavedMsg('Caregiver notes saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-[#0F3D5E] dark:text-white">Caregiver Dashboard (Consent-Gated)</h1>
        <p className="text-lg text-[#4A5A68] dark:text-slate-300">
          View only the updates each connected senior explicitly authorized. Private AI chats and restricted records are never exposed.
        </p>
      </header>

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 text-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      {seniors.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 space-y-2">
          <h2 className="text-2xl font-bold">No Approved Senior Connections Yet</h2>
          <p className="text-lg text-[#4A5A68] dark:text-slate-300">
            Ask your family senior to open <strong>Family Hub</strong> and invite your registered caregiver email address.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          <aside className="lg:col-span-4 space-y-3">
            {seniors.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSeniorId(s.senior_id)}
                className={`w-full text-left p-5 rounded-2xl border transition-colors ${
                  selectedSeniorId === s.senior_id
                    ? 'bg-[#F3EFE6] dark:bg-slate-800 border-[#0D7377] dark:border-teal-400'
                    : 'bg-white dark:bg-[#121F2C] border-[#E5DEC9] dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xl">
                  <UserCheck className="w-5 h-5 text-[#0D7377]" />
                  <span>{s.senior_name}</span>
                </div>
                <p className="text-sm text-[#4A5A68] dark:text-slate-400 mt-1">
                  {s.relationship} · Privacy: {s.privacy_level}
                </p>
              </button>
            ))}
          </aside>

          <section className="lg:col-span-8 space-y-6">
            {overview && (
              <>
                {overview.privacyNotice && (
                  <div className="p-6 rounded-2xl bg-[#F3EFE6] dark:bg-slate-800 border border-[#D8CEB8] dark:border-slate-700 flex items-start gap-3">
                    <Lock className="w-6 h-6 text-[#0F3D5E] dark:text-sky-300 shrink-0 mt-1" />
                    <p className="text-lg font-medium">{overview.privacyNotice}</p>
                  </div>
                )}

                {overview.wellness !== null && (
                  <div className="p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 space-y-3">
                    <h2 className="text-xl font-bold">Approved Wellness Summaries</h2>
                    {overview.wellness.length === 0 ? (
                      <p className="text-base text-[#4A5A68]">No shareable wellness check-ins logged yet.</p>
                    ) : (
                      <ul className="divide-y divide-[#E5DEC9] dark:divide-slate-800">
                        {overview.wellness.map((w) => (
                          <li key={w.id} className="py-2.5 flex justify-between items-center text-base tabular-nums">
                            <span className="capitalize font-semibold">Mood: {w.mood} · {w.hydration_glasses} water · {w.sleep_hours}h sleep</span>
                            <span className="text-sm text-[#4A5A68] dark:text-slate-400">{new Date(w.created_at).toLocaleDateString('en-IN')}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {overview.reminders !== null && (
                  <div className="p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 space-y-3">
                    <h2 className="text-xl font-bold">Authorized Reminders</h2>
                    {overview.reminders.length === 0 ? (
                      <p className="text-base text-[#4A5A68]">No reminders scheduled.</p>
                    ) : (
                      <ul className="divide-y divide-[#E5DEC9] dark:divide-slate-800">
                        {overview.reminders.map((r) => (
                          <li key={r.id} className="py-2.5 flex justify-between items-center text-base">
                            <span className={r.completed ? 'line-through opacity-60' : 'font-semibold'}>{r.title} ({r.category})</span>
                            <span className="text-sm tabular-nums text-[#4A5A68] dark:text-slate-400">
                              {r.completed ? 'Done' : new Date(r.scheduled_time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {overview.learning !== null && (
                  <div className="p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 space-y-3">
                    <h2 className="text-xl font-bold">Shared Learning Progress</h2>
                    {overview.learning.length === 0 ? (
                      <p className="text-base text-[#4A5A68]">No courses started yet.</p>
                    ) : (
                      <ul className="divide-y divide-[#E5DEC9] dark:divide-slate-800">
                        {overview.learning.map((l, idx) => (
                          <li key={idx} className="py-2.5 flex justify-between items-center text-base tabular-nums">
                            <span className="font-semibold">{l.title}</span>
                            <span className="text-sm">{l.status} · {l.progress_percent}%</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {overview.emergencyContacts !== null && overview.emergencyContacts.length > 0 && (
                  <div className="p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 space-y-3">
                    <h2 className="text-xl font-bold">Shared Emergency Contacts</h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {overview.emergencyContacts.map((ec) => (
                        <a
                          key={ec.id}
                          href={`tel:${ec.phone}`}
                          className="p-3 rounded-xl bg-[#FAF8F4] dark:bg-slate-900 border border-[#E5DEC9] dark:border-slate-800 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold">{ec.name}</p>
                            <p className="text-sm text-[#4A5A68]">{ec.relationship}</p>
                          </div>
                          <PhoneCall className="w-5 h-5 text-[#0D7377]" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Caregiver Private Notes */}
                <div className="p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 space-y-4">
                  <h2 className="text-xl font-bold">Caregiver Coordination Notes</h2>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Record doctor follow-up reminders or family visit notes..."
                    className="w-full p-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg"
                  />
                  {savedMsg && <p className="text-emerald-700 dark:text-emerald-300 font-semibold">{savedMsg}</p>}
                  <button
                    type="button"
                    disabled={savingNotes}
                    onClick={saveCaregiverNotes}
                    className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#0F3D5E] text-white font-bold"
                  >
                    {savingNotes ? 'Saving...' : 'Save Caregiver Notes'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

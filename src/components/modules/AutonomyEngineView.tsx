import React, { useEffect, useState } from 'react';
import { CheckCircle2, Lock, ShieldCheck, XCircle } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import type { CaregiverConnection, ConsentEvent } from '../../types';

export const AutonomyEngineView: React.FC = () => {
  const [events, setEvents] = useState<ConsentEvent[]>([]);
  const [connections, setConnections] = useState<CaregiverConnection[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = async () => {
    try {
      const data = await apiRequest<{ events: ConsentEvent[]; connections: CaregiverConnection[] }>('/api/autonomy/consents');
      setEvents(data.events);
      setConnections(data.connections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load autonomy settings.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const recordDecision = async (module: string, action: string, decision: 'approved' | 'rejected' | 'revoked', details: string) => {
    setError('');
    setNotice('');
    try {
      await apiRequest('/api/autonomy/consents', {
        method: 'POST',
        body: JSON.stringify({ module, action, decision, details }),
      });
      setNotice(`Consent preference "${decision}" recorded for ${module}.`);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record consent.');
    }
  };

  const revokeCaregiver = async (connId: string) => {
    try {
      await apiRequest(`/api/family/connections/${connId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'revoked', privacyLevel: 'PRIVATE' }),
      });
      setNotice('Caregiver access revoked and set to PRIVATE.');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to revoke access.');
    }
  };

  const safeguards = [
    {
      module: 'Scam Shield',
      rule: 'Messages are checked locally first. AI explanation runs ONLY when you tick the AI Consent checkbox.',
      action: 'Local-first fraud protection',
    },
    {
      module: 'Audio Reader & OCR',
      rule: 'Camera and OCR run directly on your device; camera turns on only when you tap Use Camera.',
      action: 'Camera & OCR permission guard',
    },
    {
      module: 'Wellness Center',
      rule: 'Each mood check-in has its own PRIVATE, LIMITED, or AUTHORIZED visibility setting.',
      action: 'Per-entry wellness privacy',
    },
    {
      module: 'Emergency Assistance',
      rule: 'SOS requires double confirmation. Location sharing and phone calls never start automatically.',
      action: 'Double-confirm SOS & GPS guard',
    },
    {
      module: 'Smart Reminders',
      rule: 'Browser alerts appear only if you explicitly grant notification permission.',
      action: 'Verified notification delivery',
    },
    {
      module: 'Encrypted Backup',
      rule: 'Backups require explicit consent and are encrypted with AES-256-GCM before download.',
      action: 'User-controlled encrypted export',
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-[#0F3D5E] dark:text-white">Autonomy &amp; Consent Engine</h1>
        <p className="text-lg text-[#4A5A68] dark:text-slate-300">
          You remain in complete command of your digital companion. Every personal share, AI inspection, or SOS alert requires your clear approval.
        </p>
      </header>

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 text-red-900 dark:text-red-200">
          {error}
        </div>
      )}
      {notice && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-900 dark:text-emerald-200 font-semibold">
          {notice}
        </div>
      )}

      {/* Module Autonomy Safeguards */}
      <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {safeguards.map((item) => (
          <div
            key={item.module}
            className="p-5 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 flex flex-col justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 text-[#0D7377] dark:text-teal-300 font-bold">
                <Lock className="w-5 h-5" />
                <span>{item.module}</span>
              </div>
              <p className="text-base mt-2 leading-relaxed text-[#374754] dark:text-slate-300">{item.rule}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => recordDecision(item.module, item.action, 'approved', 'Confirmed by senior')}
                className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-[#F3EFE6] dark:bg-slate-800 hover:bg-[#0D7377] hover:text-white text-sm font-bold transition-colors"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={() => recordDecision(item.module, item.action, 'revoked', 'Restricted by senior')}
                className="flex-1 min-h-[42px] px-3 py-2 rounded-xl border border-[#D8CEB8] dark:border-slate-700 hover:bg-red-600 hover:text-white text-sm font-bold transition-colors"
              >
                Restrict
              </button>
            </div>
          </div>
        ))}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Caregiver Grants */}
        <section className="p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#0D7377]" />
            <span>Active Family Sharing Grants</span>
          </h2>
          {connections.length === 0 ? (
            <p className="text-base text-[#4A5A68] dark:text-slate-400">No family caregivers currently connected.</p>
          ) : (
            <ul className="divide-y divide-[#E5DEC9] dark:divide-slate-800">
              {connections.map((c) => (
                <li key={c.id} className="py-4 flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <p className="text-lg font-bold">{c.caregiver_name || c.caregiver_email}</p>
                    <p className="text-sm text-[#4A5A68] dark:text-slate-400">
                      Status: {c.status.toUpperCase()} · Privacy: {c.privacy_level}
                    </p>
                  </div>
                  {c.status === 'approved' && (
                    <button
                      type="button"
                      onClick={() => revokeCaregiver(c.id)}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm"
                    >
                      Revoke Permission
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Consent Audit History */}
        <section className="p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 space-y-4">
          <h2 className="text-2xl font-bold">Consent Decision History</h2>
          {events.length === 0 ? (
            <p className="text-base text-[#4A5A68] dark:text-slate-400">No consent events logged yet.</p>
          ) : (
            <ul className="divide-y divide-[#E5DEC9] dark:divide-slate-800 max-h-[420px] overflow-y-auto">
              {events.map((ev) => (
                <li key={ev.id} className="py-3 flex items-start gap-3">
                  {ev.decision === 'approved' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-1" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-1" />
                  )}
                  <div>
                    <p className="text-base font-bold">
                      {ev.module} · {ev.decision.toUpperCase()}
                    </p>
                    <p className="text-sm text-[#4A5A68] dark:text-slate-300">
                      {ev.action} {ev.details ? `— ${ev.details}` : ''}
                    </p>
                    <p className="text-xs text-[#4A5A68] dark:text-slate-400 tabular-nums mt-0.5">
                      {new Date(ev.created_at).toLocaleString('en-IN')}
                    </p>
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

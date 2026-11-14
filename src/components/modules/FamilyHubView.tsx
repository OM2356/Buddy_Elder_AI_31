import React, { useEffect, useState } from 'react';
import { Shield, Trash2, UserPlus, Users } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import type { CaregiverConnection, PrivacyLevel, TrustedContact } from '../../types';

export const FamilyHubView: React.FC = () => {
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [connections, setConnections] = useState<CaregiverConnection[]>([]);
  const [cName, setCName] = useState('');
  const [cRel, setCRel] = useState('Daughter / Son');
  const [cPhone, setCPhone] = useState('');
  const [cEmergency, setCEmergency] = useState(true);

  const [invEmail, setInvEmail] = useState('');
  const [invName, setInvName] = useState('');
  const [invRel, setInvRel] = useState('Family Caregiver');
  const [invPrivacy, setInvPrivacy] = useState<PrivacyLevel>('LIMITED');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = async () => {
    try {
      const [ct, cn] = await Promise.all([
        apiRequest<{ contacts: TrustedContact[] }>('/api/family/contacts'),
        apiRequest<{ connections: CaregiverConnection[] }>('/api/family/connections'),
      ]);
      setContacts(ct.contacts);
      setConnections(cn.connections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load family data.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiRequest('/api/family/contacts', {
        method: 'POST',
        body: JSON.stringify({ name: cName, relationship: cRel, phone: cPhone, isEmergency: cEmergency }),
      });
      setCName('');
      setCPhone('');
      setNotice('Trusted contact saved.');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add contact.');
    }
  };

  const deleteContact = async (id: string) => {
    await apiRequest(`/api/family/contacts/${id}`, { method: 'DELETE' });
    loadData();
  };

  const inviteCaregiver = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiRequest('/api/family/connections/invite', {
        method: 'POST',
        body: JSON.stringify({
          caregiverEmail: invEmail,
          caregiverName: invName,
          relationship: invRel,
          privacyLevel: invPrivacy,
        }),
      });
      setInvEmail('');
      setInvName('');
      setNotice('Caregiver invited and consent preference recorded.');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to invite caregiver.');
    }
  };

  const updateConnection = async (id: string, patch: Record<string, unknown>) => {
    setError('');
    try {
      await apiRequest(`/api/family/connections/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update permission.');
    }
  };

  const removeConnection = async (id: string) => {
    await apiRequest(`/api/family/connections/${id}`, { method: 'DELETE' });
    loadData();
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-[#0F3D5E] dark:text-white">Family Hub &amp; Caregiver Permissions</h1>
        <p className="text-lg text-[#4A5A68] dark:text-slate-300">
          Add trusted family contacts and control exactly what caregivers may view. Caregivers can never bypass your consent.
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

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Invite Caregiver & Manage Privacy */}
        <section className="bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl p-6 space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-[#0D7377]" />
            <span>Invite a Family Caregiver</span>
          </h2>

          <form onSubmit={inviteCaregiver} className="space-y-4">
            <div>
              <label htmlFor="cg-email" className="block text-base font-bold mb-1">Caregiver Email</label>
              <input
                id="cg-email"
                type="email"
                required
                value={invEmail}
                onChange={(e) => setInvEmail(e.target.value)}
                placeholder="caregiver@example.com"
                className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="cg-name" className="block text-base font-bold mb-1">Caregiver Name</label>
                <input
                  id="cg-name"
                  type="text"
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  placeholder="e.g., Priya Sharma"
                  className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg"
                />
              </div>
              <div>
                <label htmlFor="cg-rel" className="block text-base font-bold mb-1">Relationship</label>
                <input
                  id="cg-rel"
                  type="text"
                  value={invRel}
                  onChange={(e) => setInvRel(e.target.value)}
                  className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg"
                />
              </div>
            </div>

            <div>
              <label htmlFor="cg-priv" className="block text-base font-bold mb-1">Privacy Level</label>
              <select
                id="cg-priv"
                value={invPrivacy}
                onChange={(e) => setInvPrivacy(e.target.value as PrivacyLevel)}
                className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg font-semibold"
              >
                <option value="PRIVATE">PRIVATE — Nothing shared</option>
                <option value="LIMITED">LIMITED — Only selected items shared</option>
                <option value="AUTHORIZED">AUTHORIZED — Approved summary shared</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full min-h-[52px] px-5 py-3 rounded-xl bg-[#0F3D5E] hover:bg-[#0B2D47] dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-bold text-lg"
            >
              Invite Caregiver
            </button>
          </form>

          <div className="pt-4 border-t border-[#E5DEC9] dark:border-slate-800 space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#0D7377]" />
              <span>Connected Caregivers ({connections.length})</span>
            </h3>

            {connections.length === 0 ? (
              <p className="text-base text-[#4A5A68] dark:text-slate-400">No caregiver connections yet.</p>
            ) : (
              <div className="space-y-4">
                {connections.map((conn) => (
                  <div key={conn.id} className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-slate-900 border border-[#E5DEC9] dark:border-slate-800 space-y-3">
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <p className="text-lg font-bold">{conn.linked_caregiver_name || conn.caregiver_name || conn.caregiver_email}</p>
                        <p className="text-sm text-[#4A5A68] dark:text-slate-400">
                          {conn.caregiver_email} · {conn.relationship} · Status: {conn.status.toUpperCase()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {conn.status === 'approved' ? (
                          <button
                            type="button"
                            onClick={() => updateConnection(conn.id, { status: 'revoked' })}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-bold"
                          >
                            Revoke Access
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateConnection(conn.id, { status: 'approved' })}
                            className="px-3 py-1.5 rounded-lg bg-[#0D7377] text-white text-sm font-bold"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeConnection(conn.id)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                          aria-label="Remove connection"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(['PRIVATE', 'LIMITED', 'AUTHORIZED'] as PrivacyLevel[]).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => updateConnection(conn.id, { privacyLevel: lvl })}
                          className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                            conn.privacy_level === lvl
                              ? 'bg-[#0F3D5E] text-white dark:bg-sky-500 dark:text-slate-950'
                              : 'bg-white dark:bg-slate-800 border border-[#D8CEB8] dark:border-slate-700'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>

                    {conn.privacy_level === 'LIMITED' && (
                      <div className="grid sm:grid-cols-2 gap-2 pt-2 text-sm">
                        {(
                          [
                            ['shareWellness', 'share_wellness', 'Wellness summaries'],
                            ['shareReminders', 'share_reminders', 'Reminders'],
                            ['shareLearning', 'share_learning', 'Learning progress'],
                            ['shareScamAlerts', 'share_scam_alerts', 'High-risk scam alerts'],
                            ['shareEmergency', 'share_emergency', 'Emergency contacts'],
                          ] as const
                        ).map(([apiKey, dbKey, label]) => (
                          <label key={apiKey} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(conn[dbKey])}
                              onChange={(e) => updateConnection(conn.id, { [apiKey]: e.target.checked })}
                              className="w-5 h-5 accent-[#0D7377]"
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Trusted Contacts */}
        <section className="bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl p-6 space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-[#0D7377]" />
            <span>Trusted Family &amp; Emergency Contacts</span>
          </h2>

          <form onSubmit={addContact} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="tc-name" className="block text-base font-bold mb-1">Name</label>
                <input
                  id="tc-name"
                  type="text"
                  required
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder="e.g., Dr. Deshmukh"
                  className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg"
                />
              </div>
              <div>
                <label htmlFor="tc-rel" className="block text-base font-bold mb-1">Relationship</label>
                <input
                  id="tc-rel"
                  type="text"
                  value={cRel}
                  onChange={(e) => setCRel(e.target.value)}
                  className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg"
                />
              </div>
            </div>

            <div>
              <label htmlFor="tc-phone" className="block text-base font-bold mb-1">Phone Number</label>
              <input
                id="tc-phone"
                type="tel"
                required
                value={cPhone}
                onChange={(e) => setCPhone(e.target.value)}
                placeholder="+91 98XXXXXXXX"
                className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={cEmergency}
                onChange={(e) => setCEmergency(e.target.checked)}
                className="w-5 h-5 accent-[#0D7377]"
              />
              <span className="text-base font-semibold">Include on Emergency SOS Quick-Call list</span>
            </label>

            <button
              type="submit"
              className="w-full min-h-[52px] px-5 py-3 rounded-xl bg-[#0D7377] hover:bg-[#0A5A5E] text-white font-bold text-lg"
            >
              Add Trusted Contact
            </button>
          </form>

          <div className="pt-4 border-t border-[#E5DEC9] dark:border-slate-800 space-y-3">
            <h3 className="text-xl font-bold">Saved Contacts ({contacts.length})</h3>
            {contacts.length === 0 ? (
              <p className="text-base text-[#4A5A68] dark:text-slate-400">No trusted contacts added yet.</p>
            ) : (
              <ul className="divide-y divide-[#E5DEC9] dark:divide-slate-800">
                {contacts.map((ct) => (
                  <li key={ct.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold">{ct.name}</p>
                      <p className="text-sm text-[#4A5A68] dark:text-slate-400 tabular-nums">
                        {ct.relationship} · {ct.phone} {ct.is_emergency ? '· Emergency Contact' : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteContact(ct.id)}
                      className="p-2.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      aria-label="Delete contact"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { Download, Lock, MessageSquarePlus, Save, Upload, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiRequest } from '../../lib/api';
import type { AppLanguage, FontSizeSetting } from '../../types';

interface BackupMeta {
  id: string;
  filename: string;
  checksum_sha256: string;
  record_count: number;
  created_at: string;
}

export const SettingsBackupView: React.FC = () => {
  const { user, profile, language, theme, fontSize, highContrast, voiceRate, voiceVolume, setSessionData, updatePreferences } = useApp();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [age, setAge] = useState(profile?.age ? String(profile.age) : '');
  const [city, setCity] = useState(profile?.city || '');
  const [bloodGroup, setBloodGroup] = useState(profile?.blood_group || '');
  const [allergies, setAllergies] = useState(profile?.allergies || '');
  const [medicalNotes, setMedicalNotes] = useState(profile?.medical_notes || '');
  const [emergencyInstructions, setEmergencyInstructions] = useState(profile?.emergency_instructions || '');

  const [backupConsent, setBackupConsent] = useState(false);
  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [fbModule, setFbModule] = useState('General');
  const [fbRating, setFbRating] = useState(5);
  const [fbMessage, setFbMessage] = useState('');

  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  const loadBackupHistory = async () => {
    try {
      const data = await apiRequest<{ backups: BackupMeta[] }>('/api/backup/history');
      setBackups(data.backups);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    loadBackupHistory();
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      const res = await apiRequest<Parameters<typeof setSessionData>[0]>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName,
          phone,
          preferredLanguage: language,
          age: age ? Number(age) : null,
          city,
          bloodGroup,
          allergies,
          medicalNotes,
          emergencyInstructions,
        }),
      });
      setSessionData(res);
      setNotice('Personal profile & medical card updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
    }
  };

  const handleExportBackup = async () => {
    setError('');
    setNotice('');
    if (!backupConsent) {
      setError('Please tick the explicit backup consent box first.');
      return;
    }
    try {
      const res = await apiRequest<{ filename: string; recordCount: number; envelope: unknown }>('/api/backup/export', {
        method: 'POST',
        body: JSON.stringify({ consent: true }),
      });
      const blob = new Blob([JSON.stringify(res.envelope, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
      setNotice(`AES-256-GCM encrypted backup downloaded (${res.recordCount} records).`);
      loadBackupHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup export failed.');
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setNotice('');
    if (!backupConsent) {
      setError('Please tick the explicit consent box before restoring backup data.');
      return;
    }
    try {
      const rawText = await file.text();
      const envelope = JSON.parse(rawText);
      const res = await apiRequest<{ restoredCount: number }>('/api/backup/restore', {
        method: 'POST',
        body: JSON.stringify({ envelope, consent: true }),
      });
      setNotice(`Verified & restored ${res.restoredCount} records from encrypted backup.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or corrupted encrypted backup file.');
    }
  };

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await apiRequest('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ module: fbModule, rating: fbRating, message: fbMessage }),
      });
      setFbMessage('');
      setNotice('Thank you! Your feedback has been sent to platform administrators.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send feedback.');
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-[#0F3D5E] dark:text-white">Personal Settings &amp; Encrypted Backup</h1>
        <p className="text-lg text-[#4A5A68] dark:text-slate-300">
          Customize text size, theme, voice playback, voluntary emergency info, and export AES-256-GCM encrypted backups.
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

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Profile & Voluntary Medical Info */}
        <form onSubmit={saveProfile} className="lg:col-span-7 bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl p-6 space-y-5">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <User className="w-6 h-6 text-[#0D7377]" />
            <span>Personal &amp; Voluntary Emergency Profile</span>
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="set-name" className="block text-base font-bold mb-1">Full Name</label>
              <input
                id="set-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg"
              />
            </div>
            <div>
              <label htmlFor="set-phone" className="block text-base font-bold mb-1">Phone Number</label>
              <input
                id="set-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg"
              />
            </div>
            <div>
              <label htmlFor="set-age" className="block text-base font-bold mb-1">Age (Optional)</label>
              <input
                id="set-age"
                type="number"
                min={18}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="set-city" className="block text-base font-bold mb-1">City</label>
              <input
                id="set-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg"
              />
            </div>
            <div>
              <label htmlFor="set-blood" className="block text-base font-bold mb-1">Blood Group</label>
              <input
                id="set-blood"
                type="text"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                placeholder="e.g., B+"
                className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg"
              />
            </div>
            <div>
              <label htmlFor="set-allergy" className="block text-base font-bold mb-1">Allergies</label>
              <input
                id="set-allergy"
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g., Penicillin"
                className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg"
              />
            </div>
          </div>

          <div>
            <label htmlFor="set-mednotes" className="block text-base font-bold mb-1">Voluntary Medical Notes</label>
            <textarea
              id="set-mednotes"
              rows={2}
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg"
            />
          </div>

          <div>
            <label htmlFor="set-eminst" className="block text-base font-bold mb-1">Emergency Instructions</label>
            <textarea
              id="set-eminst"
              rows={2}
              value={emergencyInstructions}
              onChange={(e) => setEmergencyInstructions(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg"
            />
          </div>

          <button
            type="submit"
            className="min-h-[52px] px-6 py-3 rounded-xl bg-[#0F3D5E] hover:bg-[#0B2D47] dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-bold inline-flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            <span>Save Profile</span>
          </button>
        </form>

        {/* Accessibility & Encrypted Backup */}
        <div className="lg:col-span-5 space-y-6">
          <section className="p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 space-y-4">
            <h2 className="text-xl font-bold">Accessibility &amp; Speech Preferences</h2>

            <div>
              <label htmlFor="pref-lang" className="block text-sm font-bold mb-1">Language</label>
              <select
                id="pref-lang"
                value={language}
                onChange={(e) => updatePreferences({ preferredLanguage: e.target.value as AppLanguage })}
                className="w-full min-h-[48px] px-3 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-base font-bold"
              >
                <option value="en">English</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="mr">Marathi (मराठी)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pref-font" className="block text-sm font-bold mb-1">Text Size</label>
                <select
                  id="pref-font"
                  value={fontSize}
                  onChange={(e) => updatePreferences({ fontSize: e.target.value as FontSizeSetting })}
                  className="w-full min-h-[48px] px-3 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-base font-bold"
                >
                  <option value="normal">Standard (20px)</option>
                  <option value="large">Large (22px)</option>
                  <option value="xlarge">Extra Large (24px)</option>
                </select>
              </div>
              <div>
                <label htmlFor="pref-theme" className="block text-sm font-bold mb-1">Theme</label>
                <select
                  id="pref-theme"
                  value={theme}
                  onChange={(e) => updatePreferences({ theme: e.target.value as 'light' | 'dark' })}
                  className="w-full min-h-[48px] px-3 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-base font-bold"
                >
                  <option value="light">Warm Light</option>
                  <option value="dark">High-Legibility Dark</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => updatePreferences({ highContrast: e.target.checked })}
                className="w-5 h-5 accent-[#0D7377]"
              />
              <span className="text-base font-semibold">Extra High Contrast Mode</span>
            </label>

            <div>
              <div className="flex justify-between text-sm font-bold tabular-nums mb-1">
                <span>Speech Speed</span>
                <span>{voiceRate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.6}
                max={1.6}
                step={0.05}
                value={voiceRate}
                onChange={(e) => updatePreferences({ voiceRate: Number(e.target.value) })}
                className="w-full accent-[#0D7377]"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm font-bold tabular-nums mb-1">
                <span>Speech Volume</span>
                <span>{Math.round(voiceVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={1.0}
                step={0.1}
                value={voiceVolume}
                onChange={(e) => updatePreferences({ voiceVolume: Number(e.target.value) })}
                className="w-full accent-[#0D7377]"
              />
            </div>
          </section>

          {/* AES-256-GCM Encrypted Backup */}
          <section className="p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#0D7377]" />
              <span>Encrypted Personal Backup (AES-256-GCM)</span>
            </h2>
            <p className="text-sm text-[#4A5A68] dark:text-slate-300">
              Backups use AES-256-GCM authenticated encryption with a unique random IV and SHA-256 integrity verification. Nothing is ever uploaded automatically.
            </p>

            <label className="flex items-start gap-3 p-3 rounded-xl bg-[#FAF8F4] dark:bg-slate-900 border border-[#E5DEC9] dark:border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={backupConsent}
                onChange={(e) => setBackupConsent(e.target.checked)}
                className="w-5 h-5 mt-0.5 accent-[#0D7377]"
              />
              <span className="text-sm font-semibold">
                I consent to export or restore my encrypted Buddy Elder AI records.
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleExportBackup}
                className="min-h-[48px] px-4 py-2 rounded-xl bg-[#0D7377] text-white font-bold inline-flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                <span>Export</span>
              </button>
              <button
                type="button"
                onClick={() => restoreInputRef.current?.click()}
                className="min-h-[48px] px-4 py-2 rounded-xl border border-[#0D7377] text-[#0D7377] dark:text-teal-300 font-bold inline-flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                <span>Restore</span>
              </button>
              <input ref={restoreInputRef} type="file" accept=".json,application/json" onChange={handleRestoreFile} className="hidden" />
            </div>

            {backups.length > 0 && (
              <div className="pt-2 border-t border-[#E5DEC9] dark:border-slate-800 text-xs space-y-1 tabular-nums text-[#4A5A68] dark:text-slate-400">
                <p className="font-bold">Recent Exports:</p>
                {backups.slice(0, 3).map((b) => (
                  <p key={b.id}>{b.filename} · {b.record_count} records · {new Date(b.created_at).toLocaleDateString('en-IN')}</p>
                ))}
              </div>
            )}
          </section>

          {/* Send Feedback */}
          <form onSubmit={submitFeedback} className="p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5 text-[#0D7377]" />
              <span>Share Feedback</span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={fbModule}
                onChange={(e) => setFbModule(e.target.value)}
                className="min-h-[44px] px-3 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900"
              >
                <option value="General">General</option>
                <option value="AI Buddy">AI Buddy</option>
                <option value="Scam Shield">Scam Shield</option>
                <option value="Audio Reader">Audio Reader</option>
                <option value="Academy">Learning Academy</option>
              </select>
              <select
                value={fbRating}
                onChange={(e) => setFbRating(Number(e.target.value))}
                className="min-h-[44px] px-3 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900"
              >
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>{r} / 5 Stars</option>
                ))}
              </select>
            </div>
            <textarea
              rows={2}
              required
              value={fbMessage}
              onChange={(e) => setFbMessage(e.target.value)}
              placeholder="How can we make Buddy Elder AI easier for you?"
              className="w-full p-3 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900"
            />
            <button type="submit" className="min-h-[44px] px-5 py-2 rounded-xl bg-[#0F3D5E] text-white font-bold">
              Send Feedback
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

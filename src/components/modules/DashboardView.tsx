import React, { useEffect, useState } from 'react';
import {
  Bell,
  BookOpen,
  CalendarClock,
  Eye,
  FileSearch,
  HeartPulse,
  MessageSquareHeart,
  PhoneCall,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Users,
  UserCheck,
  Lock,
  CheckCircle2,
  Volume2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiRequest } from '../../lib/api';
import type { ModuleId } from '../../types';

interface DashboardSummary {
  pendingReminders: Array<{ id: string; title: string; category: string; scheduled_time: string }>;
  reminderStats: { completed: number; total: number };
  latestWellness: { mood: string; hydration_glasses: number; sleep_hours: number; created_at: string } | null;
  learningStats: { completed: number; total: number };
  notifications: Array<{ id: string; title: string; message: string; type: string; is_read: number; created_at: string }>;
  recentScams: Array<{ id: string; input_type: string; risk_level: string; risk_score: number; created_at: string }>;
  recentConsents: Array<{ id: string; module: string; action: string; decision: string; created_at: string }>;
  activeCaregivers: number;
}

export const DashboardView: React.FC<{ onNavigate: (mod: ModuleId) => void }> = ({ onNavigate }) => {
  const { user, t, language, fontSize, theme, updatePreferences, speakText, system } = useApp();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [now, setNow] = useState(new Date());
  const [error, setError] = useState('');
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const loadSummary = async () => {
    try {
      const data = await apiRequest<DashboardSummary>('/api/dashboard/summary');
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard summary.');
    }
  };

  useEffect(() => {
    loadSummary();
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const markRead = async (id: string) => {
    await apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' });
    loadSummary();
  };

  const modules: Array<{ id: ModuleId; title: string; desc: string; icon: React.ReactNode; visible: boolean }> = [
    { id: 'chat', title: t('chat'), desc: 'Ask questions, practice, or translate anytime', icon: <MessageSquareHeart className="w-6 h-6" />, visible: true },
    { id: 'scam', title: t('scam'), desc: 'Check suspicious SMS, WhatsApp, URL & UPI requests', icon: <ShieldAlert className="w-6 h-6" />, visible: true },
    { id: 'reader', title: t('reader'), desc: 'Scan printed bills or letters & listen aloud', icon: <Eye className="w-6 h-6" />, visible: true },
    { id: 'wellness', title: t('wellness'), desc: 'Track mood, water, sleep, and daily activity', icon: <HeartPulse className="w-6 h-6" />, visible: true },
    { id: 'family', title: t('family'), desc: 'Manage trusted contacts & family invitations', icon: <Users className="w-6 h-6" />, visible: true },
    { id: 'autonomy', title: t('autonomy'), desc: 'Review & revoke data sharing permissions', icon: <Lock className="w-6 h-6" />, visible: true },
    { id: 'academy', title: t('academy'), desc: '24 step-by-step lessons & virtual smartphone', icon: <BookOpen className="w-6 h-6" />, visible: true },
    { id: 'research', title: t('research'), desc: 'Verified healthy ageing & cyber safety studies', icon: <FileSearch className="w-6 h-6" />, visible: true },
    { id: 'reminders', title: t('reminders'), desc: 'Medicines, water, appointments & daily routines', icon: <CalendarClock className="w-6 h-6" />, visible: true },
    { id: 'emergency', title: t('emergency'), desc: '112, 108, 1930 helplines & double-confirm SOS', icon: <PhoneCall className="w-6 h-6" />, visible: true },
    { id: 'caregiver', title: t('caregiver'), desc: 'Consent-gated family overview & notes', icon: <UserCheck className="w-6 h-6" />, visible: user?.role === 'caregiver' || user?.role === 'admin' },
    { id: 'admin', title: t('admin'), desc: 'Users, courses, health & security audit logs', icon: <ShieldCheck className="w-6 h-6" />, visible: user?.role === 'admin' },
    { id: 'settings', title: t('settings'), desc: 'Profile, speech speed & encrypted AES backup', icon: <Settings className="w-6 h-6" />, visible: true },
  ];

  const formattedDate = now.toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const progressPct = summary && summary.learningStats.total > 0
    ? Math.round((summary.learningStats.completed / summary.learningStats.total) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <section className="bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl overflow-hidden grid lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <p className="text-base font-medium text-[#0D7377] dark:text-teal-300 tabular-nums">
              {formattedDate} · {formattedTime} · Role: {user?.role}
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#0F3D5E] dark:text-white">
              {t('welcome')}, {user?.fullName}
            </h1>
            <p className="text-lg text-[#374754] dark:text-slate-300 leading-relaxed">
              {system.geminiAvailable
                ? 'AI Buddy is active and ready. All safety, learning, OCR, and wellness modules are available at one tap.'
                : t('offlineNotice')}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('chat')}
              className="min-h-[52px] px-6 py-3 rounded-xl bg-[#0F3D5E] hover:bg-[#0B2D47] dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-bold transition-colors"
            >
              Open AI Buddy Chat
            </button>
            <button
              type="button"
              onClick={() => onNavigate('scam')}
              className="min-h-[52px] px-6 py-3 rounded-xl border border-[#0D7377] text-[#0D7377] dark:text-teal-300 dark:border-teal-400 font-bold hover:bg-[#0D7377]/10 transition-colors"
            >
              Check a Message for Scams
            </button>
            <button
              type="button"
              onClick={() =>
                speakText(
                  `${t('welcome')} ${user?.fullName}. Today is ${formattedDate}. You have ${summary?.pendingReminders.length ?? 0} pending reminders and completed ${summary?.learningStats.completed ?? 0} courses.`
                )
              }
              className="min-h-[52px] px-5 py-3 rounded-xl border border-[#D8CEB8] dark:border-slate-700 font-semibold inline-flex items-center gap-2 hover:bg-[#F3EFE6] dark:hover:bg-slate-800"
            >
              <Volume2 className="w-5 h-5" />
              <span>Read Summary</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 min-h-[220px] bg-[#F3EFE6] dark:bg-slate-900">
          {!heroImgFailed ? (
            <img
              src="/src/assets/images/hero_elder_companion_1794661354624.jpg"
              alt="Buddy Elder companion scene"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-8 text-center text-[#0F3D5E] dark:text-sky-200">
              <p className="text-xl font-semibold">Buddy Elder AI — Warm &amp; Accessible Care</p>
            </div>
          )}
        </div>
      </section>

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      {/* 4-Column Activity KPI Strip */}
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <button
          type="button"
          onClick={() => onNavigate('reminders')}
          className="text-left p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 hover:border-[#0D7377] transition-colors"
        >
          <p className="text-sm font-medium text-[#4A5A68] dark:text-slate-400">{t('pendingReminders')}</p>
          <p className="text-3xl font-bold mt-2 tabular-nums text-[#0F3D5E] dark:text-white">
            {summary ? summary.pendingReminders.length : '—'}
          </p>
          <p className="text-sm mt-2 text-[#0D7377] dark:text-teal-300 tabular-nums">
            {summary ? `${summary.reminderStats.completed} of ${summary.reminderStats.total} done` : 'Loading...'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('academy')}
          className="text-left p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 hover:border-[#0D7377] transition-colors"
        >
          <p className="text-sm font-medium text-[#4A5A68] dark:text-slate-400">{t('coursesDone')}</p>
          <p className="text-3xl font-bold mt-2 tabular-nums text-[#0F3D5E] dark:text-white">
            {summary ? `${summary.learningStats.completed} / ${summary.learningStats.total}` : '—'}
          </p>
          <div className="w-full h-2.5 bg-[#E5DEC9] dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-[#0D7377] dark:bg-teal-400" style={{ width: `${progressPct}%` }} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('wellness')}
          className="text-left p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 hover:border-[#0D7377] transition-colors"
        >
          <p className="text-sm font-medium text-[#4A5A68] dark:text-slate-400">{t('todayWellness')}</p>
          <p className="text-3xl font-bold mt-2 capitalize text-[#0F3D5E] dark:text-white">
            {summary?.latestWellness ? summary.latestWellness.mood : 'Not logged'}
          </p>
          <p className="text-sm mt-2 text-[#4A5A68] dark:text-slate-300 tabular-nums">
            {summary?.latestWellness
              ? `${summary.latestWellness.hydration_glasses} glasses water · ${summary.latestWellness.sleep_hours}h sleep`
              : 'Tap to log daily mood'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('family')}
          className="text-left p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 hover:border-[#0D7377] transition-colors"
        >
          <p className="text-sm font-medium text-[#4A5A68] dark:text-slate-400">{t('trustedCaregivers')}</p>
          <p className="text-3xl font-bold mt-2 tabular-nums text-[#0F3D5E] dark:text-white">
            {summary ? summary.activeCaregivers : '—'}
          </p>
          <p className="text-sm mt-2 text-[#0D7377] dark:text-teal-300">Managed via Autonomy Engine</p>
        </button>
      </section>

      {/* Inline Accessibility Quick Controls */}
      <section className="p-5 rounded-2xl bg-[#F3EFE6] dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">{t('accessibilityBar')}</h2>
          <p className="text-sm text-[#4A5A68] dark:text-slate-400">Adjust reading size, language, or contrast anytime.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {(['en', 'hi', 'mr'] as const).map((lng) => (
            <button
              key={lng}
              type="button"
              onClick={() => updatePreferences({ preferredLanguage: lng })}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-base font-semibold transition-colors ${
                language === lng
                  ? 'bg-[#0F3D5E] text-white dark:bg-sky-500 dark:text-slate-950'
                  : 'bg-white dark:bg-slate-800 border border-[#D8CEB8] dark:border-slate-700'
              }`}
            >
              {lng === 'en' ? 'English' : lng === 'hi' ? 'हिन्दी' : 'मराठी'}
            </button>
          ))}
          {(['normal', 'large', 'xlarge'] as const).map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => updatePreferences({ fontSize: sz })}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-base font-semibold transition-colors ${
                fontSize === sz
                  ? 'bg-[#0D7377] text-white'
                  : 'bg-white dark:bg-slate-800 border border-[#D8CEB8] dark:border-slate-700'
              }`}
            >
              {sz === 'normal' ? 'Standard' : sz === 'large' ? 'Large' : 'Extra Large'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => updatePreferences({ theme: theme === 'light' ? 'dark' : 'light' })}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[#D8CEB8] dark:border-slate-700 text-base font-semibold"
          >
            {theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
          </button>
        </div>
      </section>

      {/* All Companion Tools Grid */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-[#0F3D5E] dark:text-white">{t('quickActions')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules
            .filter((m) => m.visible)
            .map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => onNavigate(mod.id)}
                className="text-left p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 hover:border-[#0D7377] dark:hover:border-teal-400 transition-colors flex items-start gap-4 min-h-[116px]"
              >
                <div className="p-3 rounded-xl bg-[#F3EFE6] dark:bg-slate-800 text-[#0F3D5E] dark:text-teal-300 shrink-0">
                  {mod.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{mod.title}</h3>
                  <p className="text-base text-[#4A5A68] dark:text-slate-300 mt-1">{mod.desc}</p>
                </div>
              </button>
            ))}
        </div>
      </section>

      {/* Pending Reminders & Notifications */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CalendarClock className="w-6 h-6 text-[#0D7377] dark:text-teal-400" />
              <span>{t('pendingReminders')}</span>
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('reminders')}
              className="text-base font-semibold text-[#0D7377] dark:text-teal-300 hover:underline"
            >
              Manage All
            </button>
          </div>
          {summary && summary.pendingReminders.length > 0 ? (
            <ul className="divide-y divide-[#E5DEC9] dark:divide-slate-800">
              {summary.pendingReminders.map((r) => (
                <li key={r.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold">{r.title}</p>
                    <p className="text-sm text-[#4A5A68] dark:text-slate-400 tabular-nums">
                      {r.category} · {new Date(r.scheduled_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-[#4A5A68] dark:text-slate-400">
              No pending reminders right now. Add medicine, water, or appointment reminders anytime.
            </p>
          )}
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#0D7377] dark:text-teal-400" />
            <span>{t('notifications')}</span>
          </h2>
          {summary && summary.notifications.length > 0 ? (
            <ul className="divide-y divide-[#E5DEC9] dark:divide-slate-800">
              {summary.notifications.slice(0, 5).map((n) => (
                <li key={n.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-base font-bold ${n.is_read ? 'opacity-70' : ''}`}>{n.title}</p>
                    <p className="text-sm text-[#4A5A68] dark:text-slate-300">{n.message}</p>
                  </div>
                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="shrink-0 p-2 rounded-lg border border-[#D8CEB8] dark:border-slate-700 hover:bg-[#F3EFE6] dark:hover:bg-slate-800"
                      aria-label="Mark notification read"
                    >
                      <CheckCircle2 className="w-5 h-5 text-[#0D7377]" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-[#4A5A68] dark:text-slate-400">No recent notifications.</p>
          )}
        </div>
      </section>
    </div>
  );
};

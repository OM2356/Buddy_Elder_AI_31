import React, { useState } from 'react';
import { ShieldCheck, HeartHandshake, Eye, Sun, Moon, Volume2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../lib/api';
import type { AppLanguage, Profile, SystemStatus, User, UserPreferences, UserRole } from '../types';

export const AuthScreen: React.FC = () => {
  const { setSessionData, language, theme, fontSize, updatePreferences, speakText } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('senior');
  const [preferredLanguage, setPreferredLanguage] = useState<AppLanguage>(language);
  const [adminSetupCode, setAdminSetupCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [imgError, setImgError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await apiRequest<{
          token: string;
          user: User;
          profile: Profile;
          preferences: UserPreferences;
          system: SystemStatus;
        }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setSessionData(res);
      } else {
        const res = await apiRequest<{
          token: string;
          user: User;
          profile: Profile;
          preferences: UserPreferences;
          system: SystemStatus;
        }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            fullName,
            phone,
            role,
            preferredLanguage,
            adminSetupCode: role === 'admin' ? adminSetupCode : undefined,
          }),
        });
        setSessionData(res);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] dark:bg-[#0B141D] text-[#14212B] dark:text-[#F1F5F9] flex flex-col">
      {/* Clean 3-Zone Top Bar */}
      <header className="border-b border-[#E5DEC9] dark:border-slate-800 bg-white/90 dark:bg-[#121F2C]/90">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-6">
          <span className="text-2xl font-bold tracking-tight text-[#0F3D5E] dark:text-sky-300 whitespace-nowrap shrink-0">
            Buddy Elder AI
          </span>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-[#F3EFE6] dark:bg-slate-800 rounded-lg">
              {(['en', 'hi', 'mr'] as AppLanguage[]).map((lng) => (
                <button
                  key={lng}
                  type="button"
                  onClick={() => {
                    setPreferredLanguage(lng);
                    updatePreferences({ preferredLanguage: lng });
                  }}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    language === lng
                      ? 'bg-[#0F3D5E] text-white dark:bg-sky-500 dark:text-slate-950'
                      : 'text-[#14212B] dark:text-slate-200 hover:bg-white/70 dark:hover:bg-slate-700'
                  }`}
                >
                  {lng === 'en' ? 'English' : lng === 'hi' ? 'हिन्दी' : 'मराठी'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                updatePreferences({
                  fontSize: fontSize === 'normal' ? 'large' : fontSize === 'large' ? 'xlarge' : 'normal',
                })
              }
              className="min-h-[44px] px-4 py-2 rounded-lg border border-[#D8CEB8] dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-semibold hover:bg-[#F3EFE6] dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
              aria-label="Adjust text size"
            >
              Text: {fontSize === 'normal' ? 'A' : fontSize === 'large' ? 'A+' : 'A++'}
            </button>

            <button
              type="button"
              onClick={() => updatePreferences({ theme: theme === 'light' ? 'dark' : 'light' })}
              className="min-h-[44px] px-4 py-2 rounded-lg border border-[#D8CEB8] dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-2 text-base font-semibold hover:bg-[#F3EFE6] dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
              aria-label="Toggle light or dark theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 grid lg:grid-cols-12 gap-10 items-stretch">
        {/* Left Story & Visual Anchor */}
        <section className="lg:col-span-7 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <p className="text-base font-medium text-[#0D7377] dark:text-teal-300">
              Senior Care · Digital Safety · Guided Learning · Family Consent
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight text-[#0F3D5E] dark:text-white">
              Your calm, trustworthy digital companion for everyday confidence.
            </h1>
            <p className="text-lg sm:text-xl text-[#374754] dark:text-slate-300 max-w-2xl leading-relaxed">
              Built for senior citizens and caring families in India. Check suspicious messages, read printed letters aloud, practice smartphone skills at your own pace, and keep full control over what you share.
            </p>
            <div>
              <button
                type="button"
                onClick={() =>
                  speakText(
                    'Welcome to Buddy Elder AI, your trusted digital companion. Sign in or create a free account to access Scam Shield, Audio Reader, Digital Learning, and Family Hub.'
                  )
                }
                className="inline-flex items-center gap-2 min-h-[48px] px-5 py-2.5 rounded-xl border border-[#0D7377] text-[#0D7377] dark:text-teal-300 dark:border-teal-400 font-semibold hover:bg-[#0D7377]/10 transition-colors"
              >
                <Volume2 className="w-5 h-5" />
                <span>Listen to Welcome Guide</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-[#E5DEC9] dark:border-slate-800 bg-white dark:bg-[#121F2C]">
            {!imgError ? (
              <img
                src="/src/assets/images/hero_elder_companion_1794661354624.jpg"
                alt="Senior couple smiling together while reading on a tablet in a sunlit living room"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-72 sm:h-80 object-cover"
              />
            ) : (
              <div className="w-full h-72 sm:h-80 bg-gradient-to-br from-[#0F3D5E] to-[#0D7377] text-white flex items-center justify-center p-8 text-center">
                <div>
                  <HeartHandshake className="w-14 h-14 mx-auto mb-3 opacity-90" />
                  <p className="text-2xl font-semibold">Buddy Elder AI — Warm, Senior-First Design</p>
                </div>
              </div>
            )}

            <div className="p-6 grid sm:grid-cols-3 gap-6 border-t border-[#E5DEC9] dark:border-slate-800">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-[#0D7377] dark:text-teal-400 shrink-0 mt-1" />
                <div>
                  <h2 className="text-base font-bold">Scam Shield</h2>
                  <p className="text-sm text-[#4A5A68] dark:text-slate-300">Instant OTP, UPI &amp; KYC fraud protection with 1930 guidance.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Eye className="w-6 h-6 text-[#0D7377] dark:text-teal-400 shrink-0 mt-1" />
                <div>
                  <h2 className="text-base font-bold">Senior Autonomy</h2>
                  <p className="text-sm text-[#4A5A68] dark:text-slate-300">You approve or revoke every family sharing permission.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <HeartHandshake className="w-6 h-6 text-[#0D7377] dark:text-teal-400 shrink-0 mt-1" />
                <div>
                  <h2 className="text-base font-bold">24 Guided Courses</h2>
                  <p className="text-sm text-[#4A5A68] dark:text-slate-300">Hands-on phone simulator &amp; audio lessons in 3 languages.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Sign In / Registration Card */}
        <section className="lg:col-span-5 bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-center">
          <div className="flex gap-2 p-1 bg-[#F3EFE6] dark:bg-slate-800 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 min-h-[48px] rounded-lg text-lg font-bold transition-colors ${
                mode === 'login'
                  ? 'bg-[#0F3D5E] text-white dark:bg-sky-500 dark:text-slate-950'
                  : 'text-[#14212B] dark:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex-1 min-h-[48px] rounded-lg text-lg font-bold transition-colors ${
                mode === 'register'
                  ? 'bg-[#0F3D5E] text-white dark:bg-sky-500 dark:text-slate-950'
                  : 'text-[#14212B] dark:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div role="alert" className="mb-5 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-base font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="auth-name" className="block text-base font-semibold mb-2">
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Ramesh Kulkarni"
                    className="w-full min-h-[52px] px-4 py-3 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg focus:outline-none focus:ring-2 focus:ring-[#0D7377]"
                  />
                </div>

                <div>
                  <label htmlFor="auth-role" className="block text-base font-semibold mb-2">
                    I am registering as
                  </label>
                  <select
                    id="auth-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full min-h-[52px] px-4 py-3 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg focus:outline-none focus:ring-2 focus:ring-[#0D7377]"
                  >
                    <option value="senior">Senior Citizen</option>
                    <option value="caregiver">Family Caregiver</option>
                    <option value="admin">Platform Administrator</option>
                  </select>
                </div>

                {role === 'admin' && (
                  <div>
                    <label htmlFor="auth-admin-code" className="block text-base font-semibold mb-2">
                      Administrator Setup Code (if additional admin)
                    </label>
                    <input
                      id="auth-admin-code"
                      type="password"
                      value={adminSetupCode}
                      onChange={(e) => setAdminSetupCode(e.target.value)}
                      placeholder="Leave blank if creating first admin"
                      className="w-full min-h-[52px] px-4 py-3 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg focus:outline-none focus:ring-2 focus:ring-[#0D7377]"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="auth-phone" className="block text-base font-semibold mb-2">
                    Phone Number (Optional)
                  </label>
                  <input
                    id="auth-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98XXXXXXXX"
                    className="w-full min-h-[52px] px-4 py-3 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg focus:outline-none focus:ring-2 focus:ring-[#0D7377]"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-base font-semibold mb-2">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full min-h-[52px] px-4 py-3 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg focus:outline-none focus:ring-2 focus:ring-[#0D7377]"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-base font-semibold mb-2">
                Password {mode === 'register' && <span className="font-normal text-sm opacity-75">(minimum 8 characters)</span>}
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={mode === 'register' ? 8 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full min-h-[52px] px-4 py-3 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg focus:outline-none focus:ring-2 focus:ring-[#0D7377]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[56px] px-6 py-3.5 rounded-xl bg-[#0F3D5E] hover:bg-[#0B2D47] dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 text-xl font-bold transition-colors disabled:opacity-60"
            >
              {submitting ? 'Please wait...' : mode === 'login' ? 'Sign In Safely' : 'Create My Account'}
            </button>
          </form>

          <p className="mt-6 text-sm text-[#4A5A68] dark:text-slate-400 leading-relaxed">
            Your data stays protected in local encrypted-capable storage. Seniors always keep full authority over family sharing and AI consent.
          </p>
        </section>
      </main>
    </div>
  );
};

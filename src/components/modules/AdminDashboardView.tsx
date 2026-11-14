import React, { useEffect, useState } from 'react';
import { Activity, BookOpen, FileText, MessageSquare, ShieldCheck, Users } from 'lucide-react';
import { apiRequest } from '../../lib/api';

interface AdminOverview {
  users: Array<{ id: string; email: string; full_name: string; role: string; preferred_language: string; is_active: number; created_at: string }>;
  stats: {
    totalUsers: number;
    seniorsCount: number;
    caregiversCount: number;
    adminsCount: number;
    coursesCount: number;
    researchCount: number;
    scamChecksCount: number;
    completedLessonsCount: number;
    activeConnectionsCount: number;
  };
  health: {
    database: string;
    geminiConfigured: boolean;
    geminiModel: string;
    uptimeSeconds: number;
  };
  feedback: Array<{ id: string; user_name: string; user_role: string; module: string; rating: number; message: string; status: string; created_at: string }>;
  auditLogs: Array<{ id: string; user_id: string | null; action: string; resource: string; status: string; details: string; created_at: string }>;
}

export const AdminDashboardView: React.FC = () => {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [tab, setTab] = useState<'users' | 'content' | 'feedback' | 'audit'>('users');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [courseTitle, setCourseTitle] = useState('');
  const [courseCategory, setCourseCategory] = useState('Cybersecurity');
  const [courseSummary, setCourseSummary] = useState('');

  const [resTitle, setResTitle] = useState('');
  const [resAuthors, setResAuthors] = useState('');
  const [resCategory, setResCategory] = useState('Healthy Ageing');
  const [resFindings, setResFindings] = useState('');

  const loadAdmin = async () => {
    try {
      const res = await apiRequest<AdminOverview>('/api/admin/overview');
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load administrator console.');
    }
  };

  useEffect(() => {
    loadAdmin();
  }, []);

  const toggleUserStatus = async (id: string, currentActive: number) => {
    setError('');
    try {
      await apiRequest(`/api/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentActive }),
      });
      loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account status.');
    }
  };

  const addCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await apiRequest('/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify({ title: courseTitle, category: courseCategory, summary: courseSummary }),
      });
      setCourseTitle('');
      setCourseSummary('');
      setNotice('New course published to Digital Learning Academy.');
      loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish course.');
    }
  };

  const addResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await apiRequest('/api/admin/research', {
        method: 'POST',
        body: JSON.stringify({ title: resTitle, authors: resAuthors, category: resCategory, keyFindings: resFindings }),
      });
      setResTitle('');
      setResAuthors('');
      setResFindings('');
      setNotice('Verified research entry added to Knowledge Hub.');
      loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add research paper.');
    }
  };

  const updateFeedbackStatus = async (id: string, status: string) => {
    await apiRequest(`/api/admin/feedback/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    loadAdmin();
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-[#0F3D5E] dark:text-white">Administrator Console</h1>
        <p className="text-lg text-[#4A5A68] dark:text-slate-300">
          Platform governance, content management, API health, and security audit logs. Private senior chats and personal wellness notes remain strictly protected from admin access.
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

      {data && (
        <>
          {/* Health & KPI Row */}
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800">
              <p className="text-sm text-[#4A5A68] dark:text-slate-400">System Health</p>
              <p className="text-xl font-bold mt-1">DB: {data.health.database} · Gemini: {data.health.geminiConfigured ? 'Ready' : 'Offline'}</p>
              <p className="text-xs text-[#4A5A68] dark:text-slate-400 tabular-nums mt-1">Model: {data.health.geminiModel} · Uptime: {data.health.uptimeSeconds}s</p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800">
              <p className="text-sm text-[#4A5A68] dark:text-slate-400">Registered Accounts</p>
              <p className="text-3xl font-bold mt-1 tabular-nums">{data.stats.totalUsers}</p>
              <p className="text-xs text-[#4A5A68] dark:text-slate-400 tabular-nums mt-1">
                {data.stats.seniorsCount} seniors · {data.stats.caregiversCount} caregivers · {data.stats.adminsCount} admins
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800">
              <p className="text-sm text-[#4A5A68] dark:text-slate-400">Curriculum &amp; Research</p>
              <p className="text-3xl font-bold mt-1 tabular-nums">{data.stats.coursesCount} / {data.stats.researchCount}</p>
              <p className="text-xs text-[#4A5A68] dark:text-slate-400 tabular-nums mt-1">{data.stats.completedLessonsCount} course completions</p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800">
              <p className="text-sm text-[#4A5A68] dark:text-slate-400">Scam Checks &amp; Links</p>
              <p className="text-3xl font-bold mt-1 tabular-nums">{data.stats.scamChecksCount}</p>
              <p className="text-xs text-[#4A5A68] dark:text-slate-400 tabular-nums mt-1">{data.stats.activeConnectionsCount} active caregiver links</p>
            </div>
          </section>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 p-1 bg-[#F3EFE6] dark:bg-slate-800 rounded-xl w-fit">
            {(
              [
                ['users', 'Users & Caregivers', Users],
                ['content', 'Courses & Research', BookOpen],
                ['feedback', 'User Feedback', MessageSquare],
                ['audit', 'Security Audit Logs', Activity],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`min-h-[44px] px-4 py-2 rounded-lg text-base font-bold inline-flex items-center gap-2 transition-colors ${
                  tab === id ? 'bg-[#0F3D5E] text-white dark:bg-sky-500 dark:text-slate-950' : 'hover:bg-white/60 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {tab === 'users' && (
            <section className="bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5DEC9] dark:border-slate-800 text-sm text-[#4A5A68] dark:text-slate-400">
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Language</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DEC9] dark:divide-slate-800 text-base">
                  {data.users.map((u) => (
                    <tr key={u.id}>
                      <td className="p-4 font-bold">{u.full_name}</td>
                      <td className="p-4">{u.email}</td>
                      <td className="p-4 capitalize">{u.role}</td>
                      <td className="p-4 uppercase">{u.preferred_language}</td>
                      <td className="p-4">{u.is_active ? 'Active' : 'Suspended'}</td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => toggleUserStatus(u.id, u.is_active)}
                          className="px-3 py-1.5 rounded-lg border border-[#D8CEB8] dark:border-slate-700 text-sm font-bold hover:bg-[#F3EFE6] dark:hover:bg-slate-800"
                        >
                          {u.is_active ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {tab === 'content' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <form onSubmit={addCourse} className="p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#0D7377]" />
                  <span>Add Educational Course</span>
                </h2>
                <input
                  type="text"
                  required
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="Course title"
                  className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={courseCategory}
                  onChange={(e) => setCourseCategory(e.target.value)}
                  placeholder="Category"
                  className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900"
                />
                <textarea
                  rows={3}
                  required
                  value={courseSummary}
                  onChange={(e) => setCourseSummary(e.target.value)}
                  placeholder="Plain-language course summary"
                  className="w-full p-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900"
                />
                <button type="submit" className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#0F3D5E] text-white font-bold">
                  Publish Course
                </button>
              </form>

              <form onSubmit={addResearch} className="p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#0D7377]" />
                  <span>Add Verified Research Resource</span>
                </h2>
                <input
                  type="text"
                  required
                  value={resTitle}
                  onChange={(e) => setResTitle(e.target.value)}
                  placeholder="Publication title"
                  className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900"
                />
                <input
                  type="text"
                  required
                  value={resAuthors}
                  onChange={(e) => setResAuthors(e.target.value)}
                  placeholder="Authors / Organization"
                  className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={resCategory}
                  onChange={(e) => setResCategory(e.target.value)}
                  placeholder="Category"
                  className="w-full min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900"
                />
                <textarea
                  rows={3}
                  required
                  value={resFindings}
                  onChange={(e) => setResFindings(e.target.value)}
                  placeholder="Verified key findings"
                  className="w-full p-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900"
                />
                <button type="submit" className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#0D7377] text-white font-bold">
                  Add Research Paper
                </button>
              </form>
            </div>
          )}

          {tab === 'feedback' && (
            <section className="p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 space-y-4">
              {data.feedback.length === 0 ? (
                <p className="text-base text-[#4A5A68]">No user feedback submitted yet.</p>
              ) : (
                <ul className="divide-y divide-[#E5DEC9] dark:divide-slate-800">
                  {data.feedback.map((f) => (
                    <li key={f.id} className="py-4 flex flex-wrap justify-between items-start gap-4">
                      <div>
                        <p className="font-bold text-lg">{f.module} · Rating {f.rating}/5 · {f.user_name} ({f.user_role})</p>
                        <p className="text-base mt-1">{f.message}</p>
                        <p className="text-xs text-[#4A5A68] mt-1 tabular-nums">Status: {f.status} · {new Date(f.created_at).toLocaleString('en-IN')}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateFeedbackStatus(f.id, f.status === 'resolved' ? 'reviewed' : 'resolved')}
                        className="px-4 py-2 rounded-xl border border-[#D8CEB8] dark:border-slate-700 font-bold text-sm"
                      >
                        {f.status === 'resolved' ? 'Reopen' : 'Mark Resolved'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === 'audit' && (
            <section className="bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5DEC9] dark:border-slate-800 text-sm text-[#4A5A68] dark:text-slate-400">
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Resource</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DEC9] dark:divide-slate-800 text-sm tabular-nums">
                  {data.auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="p-4 whitespace-nowrap">{new Date(log.created_at).toLocaleString('en-IN')}</td>
                      <td className="p-4 font-bold">{log.action}</td>
                      <td className="p-4">{log.resource}</td>
                      <td className="p-4">{log.status}</td>
                      <td className="p-4">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
};

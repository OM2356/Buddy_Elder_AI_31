import crypto from 'node:crypto';
import { Router } from 'express';
import { env } from '../config/env.ts';
import { db, logAudit } from '../db/database.ts';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.ts';
import { createEncryptedUserBackup, restoreEncryptedUserBackup } from '../services/backupService.ts';
import { generateGeminiText, isGeminiAvailable } from '../services/geminiService.ts';

export const learningAndAdminRouter = Router();
learningAndAdminRouter.use(requireAuth);

// Digital Learning Academy (24 courses)
learningAndAdminRouter.get('/courses', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const courses = db.prepare('SELECT * FROM courses ORDER BY sort_order ASC').all() as Array<{
    id: string;
    title: string;
    title_hi: string;
    title_mr: string;
    category: string;
    difficulty: string;
    duration_minutes: number;
    summary: string;
    steps_json: string;
    quiz_json: string;
    audio_script: string;
    simulator_task: string;
    sort_order: number;
  }>;

  const progressRows = db.prepare('SELECT * FROM learning_progress WHERE user_id = ?').all(userId) as Array<{
    course_id: string;
    status: string;
    progress_percent: number;
    quiz_score: number | null;
    bookmarked: number;
    completed_at: string | null;
  }>;
  const progressMap = new Map(progressRows.map((p) => [p.course_id, p]));

  const formatted = courses.map((c) => {
    const p = progressMap.get(c.id);
    return {
      id: c.id,
      title: c.title,
      titleHi: c.title_hi,
      titleMr: c.title_mr,
      category: c.category,
      difficulty: c.difficulty,
      durationMinutes: c.duration_minutes,
      summary: c.summary,
      steps: JSON.parse(c.steps_json),
      quiz: JSON.parse(c.quiz_json),
      audioScript: c.audio_script,
      simulatorTask: c.simulator_task,
      progress: p
        ? {
            status: p.status,
            progressPercent: p.progress_percent,
            quizScore: p.quiz_score,
            bookmarked: Boolean(p.bookmarked),
            completedAt: p.completed_at,
          }
        : {
            status: 'not_started',
            progressPercent: 0,
            quizScore: null,
            bookmarked: false,
            completedAt: null,
          },
    };
  });

  res.json({ courses: formatted });
});

learningAndAdminRouter.post('/courses/:id/progress', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const courseId = req.params.id;
  const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId);
  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  const { status, progressPercent, quizScore, bookmarked } = req.body ?? {};
  const existing = db
    .prepare('SELECT * FROM learning_progress WHERE user_id = ? AND course_id = ?')
    .get(userId, courseId) as
    | { id: string; status: string; progress_percent: number; quiz_score: number | null; bookmarked: number; completed_at: string | null }
    | undefined;

  const nextStatus = ['not_started', 'in_progress', 'completed'].includes(status)
    ? status
    : existing?.status || 'in_progress';
  const nextPct = typeof progressPercent === 'number' ? Math.max(0, Math.min(100, progressPercent)) : existing?.progress_percent || 0;
  const nextQuiz = typeof quizScore === 'number' ? Math.max(0, Math.min(100, quizScore)) : existing?.quiz_score ?? null;
  const nextBookmarked = typeof bookmarked === 'boolean' ? (bookmarked ? 1 : 0) : existing?.bookmarked || 0;
  const completedAt = nextStatus === 'completed' ? existing?.completed_at || new Date().toISOString() : null;

  if (existing) {
    db.prepare(
      `UPDATE learning_progress SET status = ?, progress_percent = ?, quiz_score = ?, bookmarked = ?, last_accessed_at = datetime('now'), completed_at = ?
       WHERE id = ?`
    ).run(nextStatus, nextPct, nextQuiz, nextBookmarked, completedAt, existing.id);
  } else {
    db.prepare(
      `INSERT INTO learning_progress (id, user_id, course_id, status, progress_percent, quiz_score, bookmarked, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), userId, courseId, nextStatus, nextPct, nextQuiz, nextBookmarked, completedAt);
  }

  res.json({
    progress: db.prepare('SELECT * FROM learning_progress WHERE user_id = ? AND course_id = ?').get(userId, courseId),
  });
});

// Research Knowledge Hub & RAG
learningAndAdminRouter.get('/research', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';

  let docs = db.prepare('SELECT * FROM research_documents ORDER BY year DESC, title ASC').all() as Array<{
    id: string;
    title: string;
    authors: string;
    year: number;
    category: string;
    source_name: string;
    source_url: string;
    abstract: string;
    key_findings: string;
  }>;

  if (category && category !== 'All') {
    docs = docs.filter((d) => d.category === category);
  }
  if (q) {
    docs = docs.filter((d) => `${d.title} ${d.authors} ${d.category} ${d.abstract} ${d.key_findings}`.toLowerCase().includes(q));
  }

  res.json({ documents: docs });
});

learningAndAdminRouter.post('/research/ask', async (req: AuthenticatedRequest, res) => {
  try {
    const { question, documentId } = req.body ?? {};
    const cleanQ = typeof question === 'string' ? question.trim() : '';
    if (!cleanQ) {
      res.status(400).json({ error: 'Please enter a question for the Research Knowledge Hub.' });
      return;
    }

    const allDocs = db.prepare('SELECT * FROM research_documents').all() as Array<{
      id: string;
      title: string;
      authors: string;
      year: number;
      category: string;
      source_name: string;
      source_url: string;
      abstract: string;
      key_findings: string;
    }>;

    let matchedDocs = allDocs;
    if (documentId) {
      const exact = allDocs.filter((d) => d.id === documentId);
      if (exact.length > 0) matchedDocs = exact;
    } else {
      const tokens = cleanQ
        .toLowerCase()
        .split(/\W+/)
        .filter((t) => t.length > 3);
      matchedDocs = [...allDocs]
        .map((d) => {
          const text = `${d.title} ${d.category} ${d.abstract} ${d.key_findings}`.toLowerCase();
          const score = tokens.reduce((acc, t) => acc + (text.includes(t) ? 1 : 0), 0);
          return { doc: d, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((x) => x.doc);
    }

    const verifiedSources = matchedDocs.map((d) => ({
      id: d.id,
      title: d.title,
      authors: d.authors,
      year: d.year,
      sourceName: d.source_name,
      sourceUrl: d.source_url,
      keyFindings: d.key_findings,
    }));

    let aiInterpretation = '';
    let geminiUsed = false;

    if (isGeminiAvailable()) {
      try {
        const contextStr = matchedDocs
          .map(
            (d, idx) =>
              `[Source ${idx + 1}] Title: ${d.title} | Authors: ${d.authors} (${d.year}) | Source: ${d.source_name} | Abstract: ${d.abstract} | Key Findings: ${d.key_findings}`
          )
          .join('\n\n');

        aiInterpretation = await generateGeminiText({
          systemInstruction: `You are the Buddy Elder Knowledge Hub RAG assistant. Answer the user's question based ONLY on the verified research summaries provided. Clearly separate "Verified Source Evidence" from "Plain-Language Interpretation for Seniors & Caregivers". Do NOT invent citations, statistics, or external studies.`,
          prompt: `Verified Sources:\n${contextStr}\n\nQuestion: ${cleanQ}`,
        });
        geminiUsed = Boolean(aiInterpretation);
      } catch (err) {
        console.error('Research RAG Gemini fallback:', err);
      }
    }

    if (!aiInterpretation) {
      aiInterpretation =
        'Live Gemini AI is offline, so here are the matching verified excerpts directly from the Research Knowledge Hub:\n\n' +
        matchedDocs.map((d, i) => `${i + 1}. **${d.title}** (${d.year}): ${d.key_findings}`).join('\n\n');
    }

    res.json({
      verifiedSources,
      aiInterpretation,
      geminiUsed,
    });
  } catch (err) {
    console.error('Research ask error:', err);
    res.status(500).json({ error: 'Unable to query research library right now.' });
  }
});

// Feedback
learningAndAdminRouter.post('/feedback', (req: AuthenticatedRequest, res) => {
  const { module, rating, message } = req.body ?? {};
  if (typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'Feedback message is required.' });
    return;
  }
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO feedback (id, user_id, module, rating, message) VALUES (?, ?, ?, ?, ?)').run(
    id,
    req.user!.id,
    typeof module === 'string' && module.trim() ? module.trim() : 'General',
    Math.max(1, Math.min(5, Number(rating) || 5)),
    message.trim().slice(0, 1500)
  );
  res.status(201).json({ ok: true, id });
});

// Encrypted Backup & Restore (AES-256-GCM)
learningAndAdminRouter.get('/backup/history', (req: AuthenticatedRequest, res) => {
  const rows = db.prepare('SELECT * FROM backup_metadata WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(req.user!.id);
  res.json({ backups: rows });
});

learningAndAdminRouter.post('/backup/export', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { consent } = req.body ?? {};
  if (!consent) {
    res.status(400).json({ error: 'Explicit user consent is required before creating an encrypted backup.' });
    return;
  }

  const { envelope, recordCount } = createEncryptedUserBackup(userId);
  const filename = `buddy-elder-backup-${new Date().toISOString().slice(0, 10)}.json`;

  db.prepare(
    `INSERT INTO consent_events (id, user_id, actor_id, module, action, decision, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), userId, userId, 'Backup & Settings', 'Export AES-256-GCM encrypted backup', 'approved', filename);

  db.prepare(
    `INSERT INTO backup_metadata (id, user_id, filename, checksum_sha256, record_count, encrypted, consent_recorded)
     VALUES (?, ?, ?, ?, ?, 1, 1)`
  ).run(crypto.randomUUID(), userId, filename, envelope.checksumSha256, recordCount);

  logAudit({ userId, action: 'BACKUP_EXPORT', resource: 'backup', status: 'success', ipAddress: req.ip, details: `Records: ${recordCount}` });
  res.json({ filename, recordCount, envelope });
});

learningAndAdminRouter.post('/backup/restore', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { envelope, consent } = req.body ?? {};
    if (!consent) {
      res.status(400).json({ error: 'Explicit user consent is required to restore backup data.' });
      return;
    }

    const result = restoreEncryptedUserBackup(userId, envelope);
    db.prepare(
      `INSERT INTO consent_events (id, user_id, actor_id, module, action, decision, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), userId, userId, 'Backup & Settings', 'Restore encrypted backup', 'approved', `Restored ${result.restoredCount} records`);

    logAudit({ userId, action: 'BACKUP_RESTORE', resource: 'backup', status: 'success', ipAddress: req.ip, details: `Restored: ${result.restoredCount}` });
    res.json({ ok: true, restoredCount: result.restoredCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Backup restore failed.';
    logAudit({ userId: req.user?.id, action: 'BACKUP_RESTORE_FAILED', resource: 'backup', status: 'error', ipAddress: req.ip, details: message });
    res.status(400).json({ error: message });
  }
});

// Administrator Dashboard (Strict Admin Authorization — no private senior conversations/notes exposed!)
learningAndAdminRouter.get('/admin/overview', requireRole(['admin']), (_req, res) => {
  const users = db
    .prepare('SELECT id, email, full_name, role, preferred_language, is_active, created_at FROM users ORDER BY created_at DESC')
    .all();

  const stats = {
    totalUsers: (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }).cnt,
    seniorsCount: (db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'senior'").get() as { cnt: number }).cnt,
    caregiversCount: (db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'caregiver'").get() as { cnt: number }).cnt,
    adminsCount: (db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'").get() as { cnt: number }).cnt,
    coursesCount: (db.prepare('SELECT COUNT(*) as cnt FROM courses').get() as { cnt: number }).cnt,
    researchCount: (db.prepare('SELECT COUNT(*) as cnt FROM research_documents').get() as { cnt: number }).cnt,
    scamChecksCount: (db.prepare('SELECT COUNT(*) as cnt FROM scam_history').get() as { cnt: number }).cnt,
    completedLessonsCount: (db.prepare("SELECT COUNT(*) as cnt FROM learning_progress WHERE status = 'completed'").get() as { cnt: number }).cnt,
    activeConnectionsCount: (db.prepare("SELECT COUNT(*) as cnt FROM caregiver_connections WHERE status = 'approved'").get() as { cnt: number }).cnt,
  };

  const health = {
    database: 'connected',
    geminiConfigured: isGeminiAvailable(),
    geminiModel: env.geminiModel,
    uptimeSeconds: Math.floor(process.uptime()),
  };

  const feedback = db
    .prepare(
      `SELECT f.*, u.full_name as user_name, u.role as user_role
       FROM feedback f JOIN users u ON u.id = f.user_id
       ORDER BY f.created_at DESC LIMIT 50`
    )
    .all();

  const auditLogs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 60').all();

  res.json({ users, stats, health, feedback, auditLogs });
});

learningAndAdminRouter.patch('/admin/users/:id/status', requireRole(['admin']), (req: AuthenticatedRequest, res) => {
  if (req.params.id === req.user!.id) {
    res.status(400).json({ error: 'Administrators cannot deactivate their own active account.' });
    return;
  }
  const active = req.body?.isActive ? 1 : 0;
  const info = db.prepare(`UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?`).run(active, req.params.id);
  if (info.changes === 0) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  logAudit({ userId: req.user!.id, action: 'ADMIN_USER_STATUS', resource: `users/${req.params.id}`, status: 'success', ipAddress: req.ip, details: `isActive=${active}` });
  res.json({ ok: true });
});

learningAndAdminRouter.post('/admin/courses', requireRole(['admin']), (req: AuthenticatedRequest, res) => {
  const { title, category, difficulty, durationMinutes, summary, steps, audioScript } = req.body ?? {};
  if (typeof title !== 'string' || !title.trim() || typeof summary !== 'string' || !summary.trim()) {
    res.status(400).json({ error: 'Course title and summary are required.' });
    return;
  }
  const id = `course-${crypto.randomUUID().slice(0, 8)}`;
  const maxOrder = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM courses').get() as { m: number }).m;

  db.prepare(
    `INSERT INTO courses (id, title, title_hi, title_mr, category, difficulty, duration_minutes, summary, steps_json, quiz_json, audio_script, simulator_task, sort_order)
     VALUES (?, ?, '', '', ?, ?, ?, ?, ?, ?, ?, '', ?)`
  ).run(
    id,
    title.trim(),
    typeof category === 'string' && category.trim() ? category.trim() : 'Digital Literacy',
    difficulty === 'Intermediate' ? 'Intermediate' : 'Beginner',
    Number(durationMinutes) || 10,
    summary.trim(),
    JSON.stringify(Array.isArray(steps) && steps.length ? steps : ['Open the tool carefully and follow the guided screen steps.']),
    JSON.stringify([]),
    typeof audioScript === 'string' && audioScript.trim() ? audioScript.trim() : summary.trim(),
    maxOrder + 1
  );

  logAudit({ userId: req.user!.id, action: 'ADMIN_CREATE_COURSE', resource: 'courses', status: 'success', ipAddress: req.ip, details: title.trim() });
  res.status(201).json({ ok: true, id });
});

learningAndAdminRouter.post('/admin/research', requireRole(['admin']), (req: AuthenticatedRequest, res) => {
  const { title, authors, year, category, sourceName, sourceUrl, abstract, keyFindings } = req.body ?? {};
  if (typeof title !== 'string' || !title.trim() || typeof authors !== 'string' || !authors.trim()) {
    res.status(400).json({ error: 'Research title and authors are required.' });
    return;
  }
  const id = `res-${crypto.randomUUID().slice(0, 8)}`;
  db.prepare(
    `INSERT INTO research_documents (id, title, authors, year, category, source_name, source_url, abstract, key_findings)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    title.trim(),
    authors.trim(),
    Number(year) || new Date().getFullYear(),
    typeof category === 'string' && category.trim() ? category.trim() : 'Healthy Ageing',
    typeof sourceName === 'string' && sourceName.trim() ? sourceName.trim() : 'Verified Archive',
    typeof sourceUrl === 'string' ? sourceUrl.trim() : '',
    typeof abstract === 'string' ? abstract.trim() : '',
    typeof keyFindings === 'string' ? keyFindings.trim() : ''
  );
  logAudit({ userId: req.user!.id, action: 'ADMIN_CREATE_RESEARCH', resource: 'research', status: 'success', ipAddress: req.ip, details: title.trim() });
  res.status(201).json({ ok: true, id });
});

learningAndAdminRouter.patch('/admin/feedback/:id', requireRole(['admin']), (req: AuthenticatedRequest, res) => {
  const status = ['open', 'reviewed', 'resolved'].includes(req.body?.status) ? req.body.status : 'reviewed';
  db.prepare('UPDATE feedback SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

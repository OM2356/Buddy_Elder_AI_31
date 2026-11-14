import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { SEED_COURSES, SEED_RESEARCH_DOCS } from './seedData.ts';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'buddy_elder.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('senior', 'caregiver', 'admin')),
      phone TEXT DEFAULT '',
      preferred_language TEXT NOT NULL DEFAULT 'en' CHECK(preferred_language IN ('en', 'hi', 'mr')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      age INTEGER,
      city TEXT DEFAULT '',
      medical_notes TEXT DEFAULT '',
      blood_group TEXT DEFAULT '',
      allergies TEXT DEFAULT '',
      emergency_instructions TEXT DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      theme TEXT NOT NULL DEFAULT 'light' CHECK(theme IN ('light', 'dark')),
      font_size TEXT NOT NULL DEFAULT 'normal' CHECK(font_size IN ('normal', 'large', 'xlarge')),
      high_contrast INTEGER NOT NULL DEFAULT 0,
      voice_rate REAL NOT NULL DEFAULT 0.95,
      voice_volume REAL NOT NULL DEFAULT 1.0,
      auto_read_aloud INTEGER NOT NULL DEFAULT 0,
      notifications_enabled INTEGER NOT NULL DEFAULT 0,
      timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS caregiver_connections (
      id TEXT PRIMARY KEY,
      senior_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      caregiver_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      caregiver_email TEXT NOT NULL,
      caregiver_name TEXT DEFAULT '',
      relationship TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'revoked')),
      privacy_level TEXT NOT NULL DEFAULT 'LIMITED' CHECK(privacy_level IN ('PRIVATE', 'LIMITED', 'AUTHORIZED')),
      share_wellness INTEGER NOT NULL DEFAULT 0,
      share_reminders INTEGER NOT NULL DEFAULT 1,
      share_learning INTEGER NOT NULL DEFAULT 1,
      share_scam_alerts INTEGER NOT NULL DEFAULT 1,
      share_emergency INTEGER NOT NULL DEFAULT 1,
      caregiver_notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trusted_contacts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      relationship TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      is_emergency INTEGER NOT NULL DEFAULT 0,
      priority INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS consent_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      actor_id TEXT NOT NULL,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      decision TEXT NOT NULL CHECK(decision IN ('approved', 'rejected', 'revoked')),
      details TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      agent_type TEXT NOT NULL DEFAULT 'General Conversational Agent',
      language TEXT NOT NULL DEFAULT 'en',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      agent_used TEXT DEFAULT '',
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      title_hi TEXT NOT NULL DEFAULT '',
      title_mr TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      summary TEXT NOT NULL,
      steps_json TEXT NOT NULL,
      quiz_json TEXT NOT NULL,
      audio_script TEXT NOT NULL,
      simulator_task TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      practice_prompt TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS learning_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started', 'in_progress', 'completed')),
      progress_percent INTEGER NOT NULL DEFAULT 0,
      quiz_score INTEGER,
      bookmarked INTEGER NOT NULL DEFAULT 0,
      last_accessed_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      UNIQUE(user_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS scam_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      input_type TEXT NOT NULL,
      content TEXT NOT NULL,
      risk_level TEXT NOT NULL CHECK(risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
      risk_score INTEGER NOT NULL,
      triggers_json TEXT NOT NULL,
      rule_explanation TEXT NOT NULL,
      ai_explanation TEXT DEFAULT '',
      ai_consent_given INTEGER NOT NULL DEFAULT 0,
      reported INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wellness_checkins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mood TEXT NOT NULL CHECK(mood IN ('happy', 'okay', 'sad', 'stressed', 'tired')),
      hydration_glasses INTEGER NOT NULL DEFAULT 0,
      sleep_hours REAL NOT NULL DEFAULT 7.0,
      activity_minutes INTEGER NOT NULL DEFAULT 0,
      medication_taken INTEGER NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      visibility TEXT NOT NULL DEFAULT 'LIMITED' CHECK(visibility IN ('PRIVATE', 'LIMITED', 'AUTHORIZED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      recurrence TEXT NOT NULL DEFAULT 'none' CHECK(recurrence IN ('none', 'daily', 'weekly')),
      timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      notify_channel TEXT NOT NULL DEFAULT 'in_app',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS research_documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      authors TEXT NOT NULL,
      year INTEGER NOT NULL,
      category TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      abstract TEXT NOT NULL,
      key_findings TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'reviewed', 'resolved')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS backup_metadata (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      checksum_sha256 TEXT NOT NULL,
      record_count INTEGER NOT NULL,
      encrypted INTEGER NOT NULL DEFAULT 1,
      consent_recorded INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      status TEXT NOT NULL,
      ip_address TEXT DEFAULT '',
      details TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const courseCount = (db.prepare('SELECT COUNT(*) as cnt FROM courses').get() as { cnt: number }).cnt;
  if (courseCount === 0) {
    const insertCourse = db.prepare(`
      INSERT INTO courses (id, title, title_hi, title_mr, category, difficulty, duration_minutes, summary, steps_json, quiz_json, audio_script, simulator_task, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertLesson = db.prepare(`
      INSERT INTO lessons (id, course_id, title, content, practice_prompt, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const seedTx = db.transaction(() => {
      for (const c of SEED_COURSES) {
        insertCourse.run(
          c.id,
          c.title,
          c.title_hi,
          c.title_mr,
          c.category,
          c.difficulty,
          c.duration_minutes,
          c.summary,
          JSON.stringify(c.steps),
          JSON.stringify(c.quiz),
          c.audio_script,
          c.simulator_task,
          c.sort_order
        );
        c.steps.forEach((step, idx) => {
          insertLesson.run(
            `${c.id}-lesson-${idx + 1}`,
            c.id,
            `Step ${idx + 1}`,
            step,
            idx === c.steps.length - 1 ? c.simulator_task : '',
            idx + 1
          );
        });
      }
    });
    seedTx();
  }

  const researchCount = (db.prepare('SELECT COUNT(*) as cnt FROM research_documents').get() as { cnt: number }).cnt;
  if (researchCount === 0) {
    const insertDoc = db.prepare(`
      INSERT INTO research_documents (id, title, authors, year, category, source_name, source_url, abstract, key_findings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const seedResTx = db.transaction(() => {
      for (const doc of SEED_RESEARCH_DOCS) {
        insertDoc.run(
          doc.id,
          doc.title,
          doc.authors,
          doc.year,
          doc.category,
          doc.source_name,
          doc.source_url,
          doc.abstract,
          doc.key_findings
        );
      }
    });
    seedResTx();
  }
}

export function logAudit(params: {
  userId?: string | null;
  action: string;
  resource: string;
  status: 'success' | 'denied' | 'error';
  ipAddress?: string;
  details?: string;
}): void {
  try {
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, resource, status, ip_address, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      params.userId ?? null,
      params.action,
      params.resource,
      params.status,
      params.ipAddress ?? '',
      params.details ?? ''
    );
  } catch (err) {
    console.error('Audit log insert failed:', err);
  }
}

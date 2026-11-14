import crypto from 'node:crypto';
import { env } from '../config/env.ts';
import { db } from '../db/database.ts';

export interface EncryptedBackupEnvelope {
  format: 'buddy-elder-backup-v1';
  algorithm: 'aes-256-gcm';
  kdf: 'scrypt';
  salt: string;
  iv: string;
  authTag: string;
  checksumSha256: string;
  createdAt: string;
  ciphertext: string;
}

function deriveKey(salt: Buffer): Buffer {
  return crypto.scryptSync(env.backupEncryptionSecret, salt, 32, { N: 16384, r: 8, p: 1 });
}

export function createEncryptedUserBackup(userId: string): {
  envelope: EncryptedBackupEnvelope;
  recordCount: number;
} {
  const user = db.prepare('SELECT id, email, full_name, role, phone, preferred_language, created_at FROM users WHERE id = ?').get(userId);
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
  const preferences = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
  const trustedContacts = db.prepare('SELECT * FROM trusted_contacts WHERE user_id = ?').all(userId);
  const connections = db.prepare('SELECT * FROM caregiver_connections WHERE senior_id = ?').all(userId);
  const wellness = db.prepare('SELECT * FROM wellness_checkins WHERE user_id = ?').all(userId);
  const reminders = db.prepare('SELECT * FROM reminders WHERE user_id = ?').all(userId);
  const progress = db.prepare('SELECT * FROM learning_progress WHERE user_id = ?').all(userId);
  const scamHistory = db.prepare('SELECT * FROM scam_history WHERE user_id = ?').all(userId);
  const consentEvents = db.prepare('SELECT * FROM consent_events WHERE user_id = ?').all(userId);
  const conversations = db.prepare('SELECT * FROM conversations WHERE user_id = ?').all(userId) as Array<{ id: string }>;
  const messages = conversations.length
    ? db
        .prepare(`SELECT * FROM messages WHERE conversation_id IN (${conversations.map(() => '?').join(',')})`)
        .all(...conversations.map((c) => c.id))
    : [];

  const payloadObj = {
    version: 1,
    exportedAt: new Date().toISOString(),
    user,
    profile,
    preferences,
    trustedContacts,
    connections,
    wellness,
    reminders,
    progress,
    scamHistory,
    consentEvents,
    conversations,
    messages,
  };

  const recordCount =
    1 +
    trustedContacts.length +
    connections.length +
    wellness.length +
    reminders.length +
    progress.length +
    scamHistory.length +
    consentEvents.length +
    conversations.length +
    messages.length;

  const plaintext = Buffer.from(JSON.stringify(payloadObj), 'utf-8');
  const checksumSha256 = crypto.createHash('sha256').update(plaintext).digest('hex');

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const envelope: EncryptedBackupEnvelope = {
    format: 'buddy-elder-backup-v1',
    algorithm: 'aes-256-gcm',
    kdf: 'scrypt',
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    checksumSha256,
    createdAt: new Date().toISOString(),
    ciphertext: encrypted.toString('base64'),
  };

  return { envelope, recordCount };
}

export function restoreEncryptedUserBackup(userId: string, envelope: EncryptedBackupEnvelope): { restoredCount: number } {
  if (
    !envelope ||
    envelope.format !== 'buddy-elder-backup-v1' ||
    envelope.algorithm !== 'aes-256-gcm' ||
    !envelope.salt ||
    !envelope.iv ||
    !envelope.authTag ||
    !envelope.ciphertext
  ) {
    throw new Error('Invalid backup envelope format.');
  }

  const salt = Buffer.from(envelope.salt, 'hex');
  const iv = Buffer.from(envelope.iv, 'hex');
  const authTag = Buffer.from(envelope.authTag, 'hex');
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64');

  if (iv.length !== 12 || authTag.length !== 16 || salt.length !== 16) {
    throw new Error('Malformed cryptographic parameters in backup file.');
  }

  const key = deriveKey(salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const computedChecksum = crypto.createHash('sha256').update(decrypted).digest('hex');

  if (computedChecksum !== envelope.checksumSha256) {
    throw new Error('Backup integrity verification failed (SHA-256 mismatch).');
  }

  const data = JSON.parse(decrypted.toString('utf-8'));
  if (!data || data.version !== 1 || !data.user) {
    throw new Error('Unsupported backup payload structure.');
  }

  let restoredCount = 0;

  const restoreTx = db.transaction(() => {
    if (data.profile) {
      db.prepare(
        `INSERT INTO profiles (user_id, age, city, medical_notes, blood_group, allergies, emergency_instructions, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           age = excluded.age,
           city = excluded.city,
           medical_notes = excluded.medical_notes,
           blood_group = excluded.blood_group,
           allergies = excluded.allergies,
           emergency_instructions = excluded.emergency_instructions,
           updated_at = datetime('now')`
      ).run(
        userId,
        data.profile.age ?? null,
        data.profile.city ?? '',
        data.profile.medical_notes ?? '',
        data.profile.blood_group ?? '',
        data.profile.allergies ?? '',
        data.profile.emergency_instructions ?? ''
      );
      restoredCount++;
    }

    if (data.preferences) {
      db.prepare(
        `INSERT INTO user_preferences (user_id, theme, font_size, high_contrast, voice_rate, voice_volume, auto_read_aloud, notifications_enabled, timezone, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           theme = excluded.theme,
           font_size = excluded.font_size,
           high_contrast = excluded.high_contrast,
           voice_rate = excluded.voice_rate,
           voice_volume = excluded.voice_volume,
           auto_read_aloud = excluded.auto_read_aloud,
           notifications_enabled = excluded.notifications_enabled,
           timezone = excluded.timezone,
           updated_at = datetime('now')`
      ).run(
        userId,
        data.preferences.theme || 'light',
        data.preferences.font_size || 'normal',
        data.preferences.high_contrast ? 1 : 0,
        Number(data.preferences.voice_rate) || 0.95,
        Number(data.preferences.voice_volume) || 1.0,
        data.preferences.auto_read_aloud ? 1 : 0,
        data.preferences.notifications_enabled ? 1 : 0,
        data.preferences.timezone || 'Asia/Kolkata'
      );
      restoredCount++;
    }

    if (Array.isArray(data.trustedContacts)) {
      const stmt = db.prepare(
        `INSERT OR IGNORE INTO trusted_contacts (id, user_id, name, relationship, phone, email, is_emergency, priority, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const c of data.trustedContacts) {
        stmt.run(c.id || crypto.randomUUID(), userId, c.name, c.relationship, c.phone, c.email || '', c.is_emergency ? 1 : 0, c.priority || 1, c.created_at || new Date().toISOString());
        restoredCount++;
      }
    }

    if (Array.isArray(data.reminders)) {
      const stmt = db.prepare(
        `INSERT OR IGNORE INTO reminders (id, user_id, title, category, scheduled_time, recurrence, timezone, completed, completed_at, notify_channel, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const r of data.reminders) {
        stmt.run(r.id || crypto.randomUUID(), userId, r.title, r.category, r.scheduled_time, r.recurrence || 'none', r.timezone || 'Asia/Kolkata', r.completed ? 1 : 0, r.completed_at || null, r.notify_channel || 'in_app', r.created_at || new Date().toISOString());
        restoredCount++;
      }
    }

    if (Array.isArray(data.wellness)) {
      const stmt = db.prepare(
        `INSERT OR IGNORE INTO wellness_checkins (id, user_id, mood, hydration_glasses, sleep_hours, activity_minutes, medication_taken, notes, visibility, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const w of data.wellness) {
        stmt.run(w.id || crypto.randomUUID(), userId, w.mood, w.hydration_glasses || 0, w.sleep_hours || 7, w.activity_minutes || 0, w.medication_taken ? 1 : 0, w.notes || '', w.visibility || 'LIMITED', w.created_at || new Date().toISOString());
        restoredCount++;
      }
    }

    if (Array.isArray(data.progress)) {
      const stmt = db.prepare(
        `INSERT OR IGNORE INTO learning_progress (id, user_id, course_id, status, progress_percent, quiz_score, bookmarked, last_accessed_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const p of data.progress) {
        stmt.run(p.id || crypto.randomUUID(), userId, p.course_id, p.status || 'in_progress', p.progress_percent || 0, p.quiz_score ?? null, p.bookmarked ? 1 : 0, p.last_accessed_at || new Date().toISOString(), p.completed_at || null);
        restoredCount++;
      }
    }
  });

  restoreTx();
  return { restoredCount };
}

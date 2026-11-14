import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { env } from '../config/env.ts';
import { db, logAudit } from '../db/database.ts';
import { requireAuth, signToken, type AuthenticatedRequest, type UserRole } from '../middleware/auth.ts';
import { isGeminiAvailable } from '../services/geminiService.ts';

export const authRouter = Router();

function getFullUserPayload(userId: string) {
  const user = db
    .prepare('SELECT id, email, full_name, role, phone, preferred_language, is_active, created_at FROM users WHERE id = ?')
    .get(userId) as
    | {
        id: string;
        email: string;
        full_name: string;
        role: UserRole;
        phone: string;
        preferred_language: 'en' | 'hi' | 'mr';
        is_active: number;
        created_at: string;
      }
    | undefined;
  if (!user) return null;

  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
  const preferences = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      phone: user.phone,
      preferredLanguage: user.preferred_language,
      createdAt: user.created_at,
    },
    profile,
    preferences,
    system: {
      geminiAvailable: isGeminiAvailable(),
      geminiModel: env.geminiModel,
    },
  };
}

authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, role, phone, preferredLanguage, adminSetupCode } = req.body ?? {};
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanName = typeof fullName === 'string' ? fullName.trim() : '';
    const rawPassword = typeof password === 'string' ? password : '';
    const selectedRole: UserRole = role === 'caregiver' || role === 'admin' ? role : 'senior';
    const lang: 'en' | 'hi' | 'mr' = preferredLanguage === 'hi' || preferredLanguage === 'mr' ? preferredLanguage : 'en';

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!cleanName || cleanName.length < 2) {
      res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
      return;
    }
    if (rawPassword.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }

    if (selectedRole === 'admin') {
      const adminCount = (db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'").get() as { cnt: number }).cnt;
      if (adminCount > 0 && (!env.adminSetupCode || adminSetupCode !== env.adminSetupCode)) {
        res.status(403).json({ error: 'An administrator account already exists. Valid admin setup code is required.' });
        return;
      }
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      return;
    }

    const passwordHash = await bcrypt.hash(rawPassword, 12);
    const userId = crypto.randomUUID();

    const createTx = db.transaction(() => {
      db.prepare(
        `INSERT INTO users (id, email, password_hash, full_name, role, phone, preferred_language)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(userId, cleanEmail, passwordHash, cleanName, selectedRole, typeof phone === 'string' ? phone.trim() : '', lang);

      db.prepare('INSERT INTO profiles (user_id) VALUES (?)').run(userId);
      db.prepare('INSERT INTO user_preferences (user_id) VALUES (?)').run(userId);

      // Link any pending caregiver invitations matching this email
      if (selectedRole === 'caregiver') {
        db.prepare('UPDATE caregiver_connections SET caregiver_id = ?, caregiver_name = ? WHERE lower(caregiver_email) = ? AND caregiver_id IS NULL').run(
          userId,
          cleanName,
          cleanEmail
        );
      }

      db.prepare(
        `INSERT INTO notifications (id, user_id, title, message, type)
         VALUES (?, ?, ?, ?, ?)`
      ).run(
        crypto.randomUUID(),
        userId,
        'Welcome to Buddy Elder AI',
        'Your personal account is ready. Your privacy and autonomy preferences remain under your full control.',
        'info'
      );
    });

    createTx();
    logAudit({ userId, action: 'REGISTER', resource: 'auth', status: 'success', ipAddress: req.ip, details: `Role: ${selectedRole}` });

    const token = signToken({
      id: userId,
      email: cleanEmail,
      fullName: cleanName,
      role: selectedRole,
      preferredLanguage: lang,
    });

    res.status(201).json({
      token,
      ...getFullUserPayload(userId),
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Unable to register account right now. Please try again.' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const rawPassword = typeof password === 'string' ? password : '';

    if (!cleanEmail || !rawPassword) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const row = db
      .prepare('SELECT id, email, password_hash, full_name, role, preferred_language, is_active FROM users WHERE email = ?')
      .get(cleanEmail) as
      | {
          id: string;
          email: string;
          password_hash: string;
          full_name: string;
          role: UserRole;
          preferred_language: 'en' | 'hi' | 'mr';
          is_active: number;
        }
      | undefined;

    if (!row) {
      logAudit({ action: 'LOGIN_FAILED', resource: 'auth', status: 'denied', ipAddress: req.ip, details: `Unknown email: ${cleanEmail}` });
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (!row.is_active) {
      logAudit({ userId: row.id, action: 'LOGIN_INACTIVE', resource: 'auth', status: 'denied', ipAddress: req.ip });
      res.status(403).json({ error: 'This account has been deactivated by an administrator.' });
      return;
    }

    const valid = await bcrypt.compare(rawPassword, row.password_hash);
    if (!valid) {
      logAudit({ userId: row.id, action: 'LOGIN_FAILED', resource: 'auth', status: 'denied', ipAddress: req.ip });
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    logAudit({ userId: row.id, action: 'LOGIN_SUCCESS', resource: 'auth', status: 'success', ipAddress: req.ip });

    const token = signToken({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      preferredLanguage: row.preferred_language,
    });

    res.json({
      token,
      ...getFullUserPayload(row.id),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Sign in failed. Please try again.' });
  }
});

authRouter.post('/logout', requireAuth, (req: AuthenticatedRequest, res) => {
  logAudit({ userId: req.user?.id, action: 'LOGOUT', resource: 'auth', status: 'success', ipAddress: req.ip });
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const payload = getFullUserPayload(req.user!.id);
  if (!payload) {
    res.status(404).json({ error: 'User profile not found.' });
    return;
  }
  res.json(payload);
});

authRouter.put('/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const { fullName, phone, preferredLanguage, age, city, medicalNotes, bloodGroup, allergies, emergencyInstructions } = req.body ?? {};
  const userId = req.user!.id;

  const lang = preferredLanguage === 'hi' || preferredLanguage === 'mr' ? preferredLanguage : req.user!.preferredLanguage;
  const cleanName = typeof fullName === 'string' && fullName.trim().length >= 2 ? fullName.trim() : req.user!.fullName;

  db.prepare(`UPDATE users SET full_name = ?, phone = ?, preferred_language = ?, updated_at = datetime('now') WHERE id = ?`).run(
    cleanName,
    typeof phone === 'string' ? phone.trim() : '',
    lang,
    userId
  );

  db.prepare(
    `UPDATE profiles SET
      age = ?,
      city = ?,
      medical_notes = ?,
      blood_group = ?,
      allergies = ?,
      emergency_instructions = ?,
      updated_at = datetime('now')
     WHERE user_id = ?`
  ).run(
    age ? Number(age) : null,
    typeof city === 'string' ? city.trim() : '',
    typeof medicalNotes === 'string' ? medicalNotes.trim() : '',
    typeof bloodGroup === 'string' ? bloodGroup.trim() : '',
    typeof allergies === 'string' ? allergies.trim() : '',
    typeof emergencyInstructions === 'string' ? emergencyInstructions.trim() : '',
    userId
  );

  logAudit({ userId, action: 'PROFILE_UPDATE', resource: 'profile', status: 'success', ipAddress: req.ip });
  res.json(getFullUserPayload(userId));
});

authRouter.put('/preferences', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { theme, fontSize, highContrast, voiceRate, voiceVolume, autoReadAloud, notificationsEnabled, timezone, preferredLanguage } = req.body ?? {};

  const current = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) as {
    theme: string;
    font_size: string;
    high_contrast: number;
    voice_rate: number;
    voice_volume: number;
    auto_read_aloud: number;
    notifications_enabled: number;
    timezone: string;
  };

  const nextTheme = theme === 'dark' || theme === 'light' ? theme : current.theme;
  const nextFont = fontSize === 'normal' || fontSize === 'large' || fontSize === 'xlarge' ? fontSize : current.font_size;
  const nextContrast = typeof highContrast === 'boolean' ? (highContrast ? 1 : 0) : current.high_contrast;
  const nextRate = typeof voiceRate === 'number' ? Math.min(1.8, Math.max(0.5, voiceRate)) : current.voice_rate;
  const nextVol = typeof voiceVolume === 'number' ? Math.min(1.0, Math.max(0.1, voiceVolume)) : current.voice_volume;
  const nextAutoRead = typeof autoReadAloud === 'boolean' ? (autoReadAloud ? 1 : 0) : current.auto_read_aloud;
  const nextNotify = typeof notificationsEnabled === 'boolean' ? (notificationsEnabled ? 1 : 0) : current.notifications_enabled;
  const nextTz = typeof timezone === 'string' && timezone.trim() ? timezone.trim() : current.timezone;

  db.prepare(
    `UPDATE user_preferences SET
      theme = ?, font_size = ?, high_contrast = ?, voice_rate = ?, voice_volume = ?,
      auto_read_aloud = ?, notifications_enabled = ?, timezone = ?, updated_at = datetime('now')
     WHERE user_id = ?`
  ).run(nextTheme, nextFont, nextContrast, nextRate, nextVol, nextAutoRead, nextNotify, nextTz, userId);

  if (preferredLanguage === 'en' || preferredLanguage === 'hi' || preferredLanguage === 'mr') {
    db.prepare(`UPDATE users SET preferred_language = ?, updated_at = datetime('now') WHERE id = ?`).run(preferredLanguage, userId);
  }

  res.json(getFullUserPayload(userId));
});

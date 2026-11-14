import crypto from 'node:crypto';
import { Router } from 'express';
import { db, logAudit } from '../db/database.ts';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.ts';

export const careAndWellnessRouter = Router();
careAndWellnessRouter.use(requireAuth);

careAndWellnessRouter.get('/dashboard/summary', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const pendingReminders = db
    .prepare('SELECT * FROM reminders WHERE user_id = ? AND completed = 0 ORDER BY scheduled_time ASC LIMIT 5')
    .all(userId);
  const completedRemindersCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM reminders WHERE user_id = ? AND completed = 1').get(userId) as { cnt: number }
  ).cnt;
  const totalRemindersCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM reminders WHERE user_id = ?').get(userId) as { cnt: number }
  ).cnt;
  const latestWellness = db
    .prepare('SELECT * FROM wellness_checkins WHERE user_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(userId);
  const completedCourses = (
    db.prepare("SELECT COUNT(*) as cnt FROM learning_progress WHERE user_id = ? AND status = 'completed'").get(userId) as { cnt: number }
  ).cnt;
  const totalCourses = (db.prepare('SELECT COUNT(*) as cnt FROM courses').get() as { cnt: number }).cnt;
  const notifications = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 8')
    .all(userId);
  const recentScams = db
    .prepare('SELECT id, input_type, risk_level, risk_score, created_at FROM scam_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 4')
    .all(userId);
  const recentConsents = db
    .prepare('SELECT * FROM consent_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 5')
    .all(userId);
  const activeCaregivers = (
    db.prepare("SELECT COUNT(*) as cnt FROM caregiver_connections WHERE senior_id = ? AND status = 'approved'").get(userId) as { cnt: number }
  ).cnt;

  res.json({
    pendingReminders,
    reminderStats: { completed: completedRemindersCount, total: totalRemindersCount },
    latestWellness,
    learningStats: { completed: completedCourses, total: totalCourses },
    notifications,
    recentScams,
    recentConsents,
    activeCaregivers,
  });
});

// Wellness Center
careAndWellnessRouter.get('/wellness', (req: AuthenticatedRequest, res) => {
  const entries = db
    .prepare('SELECT * FROM wellness_checkins WHERE user_id = ? ORDER BY created_at DESC LIMIT 60')
    .all(req.user!.id);
  res.json({ entries });
});

careAndWellnessRouter.post('/wellness', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { mood, hydrationGlasses, sleepHours, activityMinutes, medicationTaken, notes, visibility } = req.body ?? {};
  const validMoods = ['happy', 'okay', 'sad', 'stressed', 'tired'];
  const validVis = ['PRIVATE', 'LIMITED', 'AUTHORIZED'];

  if (!validMoods.includes(mood)) {
    res.status(400).json({ error: 'Please select a valid mood check-in option.' });
    return;
  }

  const vis = validVis.includes(visibility) ? visibility : 'LIMITED';
  const id = crypto.randomUUID();

  db.prepare(
    `INSERT INTO wellness_checkins (id, user_id, mood, hydration_glasses, sleep_hours, activity_minutes, medication_taken, notes, visibility)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
    mood,
    Math.max(0, Math.min(30, Number(hydrationGlasses) || 0)),
    Math.max(0, Math.min(24, Number(sleepHours) || 7)),
    Math.max(0, Math.min(600, Number(activityMinutes) || 0)),
    medicationTaken ? 1 : 0,
    typeof notes === 'string' ? notes.trim().slice(0, 1000) : '',
    vis
  );

  res.status(201).json({ entry: db.prepare('SELECT * FROM wellness_checkins WHERE id = ?').get(id) });
});

// Smart Reminders
careAndWellnessRouter.get('/reminders', (req: AuthenticatedRequest, res) => {
  const reminders = db
    .prepare('SELECT * FROM reminders WHERE user_id = ? ORDER BY completed ASC, scheduled_time ASC')
    .all(req.user!.id);
  res.json({ reminders });
});

careAndWellnessRouter.post('/reminders', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { title, category, scheduledTime, recurrence, timezone, notifyChannel } = req.body ?? {};
  if (typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'Reminder title is required.' });
    return;
  }
  const id = crypto.randomUUID();
  const validRecurrence = ['none', 'daily', 'weekly'].includes(recurrence) ? recurrence : 'none';

  db.prepare(
    `INSERT INTO reminders (id, user_id, title, category, scheduled_time, recurrence, timezone, notify_channel)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
    title.trim().slice(0, 200),
    typeof category === 'string' && category.trim() ? category.trim() : 'Custom',
    typeof scheduledTime === 'string' && scheduledTime.trim() ? scheduledTime.trim() : new Date().toISOString(),
    validRecurrence,
    typeof timezone === 'string' && timezone.trim() ? timezone.trim() : 'Asia/Kolkata',
    typeof notifyChannel === 'string' ? notifyChannel : 'in_app'
  );

  res.status(201).json({ reminder: db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) });
});

careAndWellnessRouter.put('/reminders/:id', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const existing = db.prepare('SELECT * FROM reminders WHERE id = ? AND user_id = ?').get(req.params.id, userId) as
    | { id: string; title: string; category: string; scheduled_time: string; recurrence: string; timezone: string; completed: number }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Reminder not found.' });
    return;
  }

  const { title, category, scheduledTime, recurrence, completed } = req.body ?? {};
  const nextCompleted = typeof completed === 'boolean' ? (completed ? 1 : 0) : existing.completed;
  const completedAt = nextCompleted ? new Date().toISOString() : null;

  db.prepare(
    `UPDATE reminders SET title = ?, category = ?, scheduled_time = ?, recurrence = ?, completed = ?, completed_at = ? WHERE id = ?`
  ).run(
    typeof title === 'string' && title.trim() ? title.trim() : existing.title,
    typeof category === 'string' && category.trim() ? category.trim() : existing.category,
    typeof scheduledTime === 'string' && scheduledTime.trim() ? scheduledTime.trim() : existing.scheduled_time,
    ['none', 'daily', 'weekly'].includes(recurrence) ? recurrence : existing.recurrence,
    nextCompleted,
    completedAt,
    existing.id
  );

  res.json({ reminder: db.prepare('SELECT * FROM reminders WHERE id = ?').get(existing.id) });
});

careAndWellnessRouter.delete('/reminders/:id', (req: AuthenticatedRequest, res) => {
  const info = db.prepare('DELETE FROM reminders WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Reminder not found.' });
    return;
  }
  res.json({ ok: true });
});

// Notifications
careAndWellnessRouter.get('/notifications', (req: AuthenticatedRequest, res) => {
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').all(req.user!.id);
  res.json({ notifications: rows });
});

careAndWellnessRouter.patch('/notifications/:id/read', (req: AuthenticatedRequest, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
  res.json({ ok: true });
});

// Trusted Contacts & Emergency
careAndWellnessRouter.get('/family/contacts', (req: AuthenticatedRequest, res) => {
  const contacts = db
    .prepare('SELECT * FROM trusted_contacts WHERE user_id = ? ORDER BY is_emergency DESC, priority ASC, created_at DESC')
    .all(req.user!.id);
  res.json({ contacts });
});

careAndWellnessRouter.post('/family/contacts', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { name, relationship, phone, email, isEmergency, priority } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim() || typeof phone !== 'string' || !phone.trim()) {
    res.status(400).json({ error: 'Contact name and phone number are required.' });
    return;
  }
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO trusted_contacts (id, user_id, name, relationship, phone, email, is_emergency, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
    name.trim(),
    typeof relationship === 'string' && relationship.trim() ? relationship.trim() : 'Family',
    phone.trim(),
    typeof email === 'string' ? email.trim() : '',
    isEmergency ? 1 : 0,
    Number(priority) || 1
  );

  res.status(201).json({ contact: db.prepare('SELECT * FROM trusted_contacts WHERE id = ?').get(id) });
});

careAndWellnessRouter.delete('/family/contacts/:id', (req: AuthenticatedRequest, res) => {
  const info = db.prepare('DELETE FROM trusted_contacts WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Contact not found.' });
    return;
  }
  res.json({ ok: true });
});

// Family Hub Connections & Consent
careAndWellnessRouter.get('/family/connections', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const asSenior = db
    .prepare(
      `SELECT cc.*, u.full_name as linked_caregiver_name
       FROM caregiver_connections cc
       LEFT JOIN users u ON u.id = cc.caregiver_id
       WHERE cc.senior_id = ?
       ORDER BY cc.created_at DESC`
    )
    .all(userId);
  const asCaregiver = db
    .prepare(
      `SELECT cc.*, u.full_name as senior_name, u.email as senior_email
       FROM caregiver_connections cc
       JOIN users u ON u.id = cc.senior_id
       WHERE cc.caregiver_id = ? OR lower(cc.caregiver_email) = ?
       ORDER BY cc.created_at DESC`
    )
    .all(userId, req.user!.email.toLowerCase());

  res.json({ connections: asSenior, caregiverInvites: asCaregiver });
});

careAndWellnessRouter.post('/family/connections/invite', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { caregiverEmail, caregiverName, relationship, privacyLevel } = req.body ?? {};
  const cleanEmail = typeof caregiverEmail === 'string' ? caregiverEmail.trim().toLowerCase() : '';
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    res.status(400).json({ error: 'Please enter a valid caregiver email address.' });
    return;
  }
  if (cleanEmail === req.user!.email.toLowerCase()) {
    res.status(400).json({ error: 'You cannot invite yourself as a caregiver.' });
    return;
  }

  const existingCaregiver = db
    .prepare("SELECT id, full_name FROM users WHERE lower(email) = ? AND role = 'caregiver'")
    .get(cleanEmail) as { id: string; full_name: string } | undefined;

  const validPrivacy = ['PRIVATE', 'LIMITED', 'AUTHORIZED'].includes(privacyLevel) ? privacyLevel : 'LIMITED';
  const id = crypto.randomUUID();

  db.prepare(
    `INSERT INTO caregiver_connections (id, senior_id, caregiver_id, caregiver_email, caregiver_name, relationship, status, privacy_level)
     VALUES (?, ?, ?, ?, ?, ?, 'approved', ?)`
  ).run(
    id,
    userId,
    existingCaregiver?.id ?? null,
    cleanEmail,
    existingCaregiver?.full_name || (typeof caregiverName === 'string' ? caregiverName.trim() : ''),
    typeof relationship === 'string' && relationship.trim() ? relationship.trim() : 'Family Caregiver',
    validPrivacy
  );

  db.prepare(
    `INSERT INTO consent_events (id, user_id, actor_id, module, action, decision, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), userId, userId, 'Family Hub', `Invited caregiver ${cleanEmail}`, 'approved', `Privacy level: ${validPrivacy}`);

  res.status(201).json({ connection: db.prepare('SELECT * FROM caregiver_connections WHERE id = ?').get(id) });
});

careAndWellnessRouter.patch('/family/connections/:id', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const conn = db.prepare('SELECT * FROM caregiver_connections WHERE id = ? AND senior_id = ?').get(req.params.id, userId) as
    | {
        id: string;
        status: string;
        privacy_level: string;
        share_wellness: number;
        share_reminders: number;
        share_learning: number;
        share_scam_alerts: number;
        share_emergency: number;
      }
    | undefined;

  if (!conn) {
    res.status(403).json({ error: 'Only the senior account owner can modify caregiver sharing permissions.' });
    return;
  }

  const { status, privacyLevel, shareWellness, shareReminders, shareLearning, shareScamAlerts, shareEmergency } = req.body ?? {};
  const nextStatus = ['pending', 'approved', 'rejected', 'revoked'].includes(status) ? status : conn.status;
  const nextPrivacy = ['PRIVATE', 'LIMITED', 'AUTHORIZED'].includes(privacyLevel) ? privacyLevel : conn.privacy_level;

  db.prepare(
    `UPDATE caregiver_connections SET
      status = ?,
      privacy_level = ?,
      share_wellness = ?,
      share_reminders = ?,
      share_learning = ?,
      share_scam_alerts = ?,
      share_emergency = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    nextStatus,
    nextPrivacy,
    typeof shareWellness === 'boolean' ? (shareWellness ? 1 : 0) : conn.share_wellness,
    typeof shareReminders === 'boolean' ? (shareReminders ? 1 : 0) : conn.share_reminders,
    typeof shareLearning === 'boolean' ? (shareLearning ? 1 : 0) : conn.share_learning,
    typeof shareScamAlerts === 'boolean' ? (shareScamAlerts ? 1 : 0) : conn.share_scam_alerts,
    typeof shareEmergency === 'boolean' ? (shareEmergency ? 1 : 0) : conn.share_emergency,
    conn.id
  );

  const decision = nextStatus === 'revoked' || nextStatus === 'rejected' ? 'revoked' : 'approved';
  db.prepare(
    `INSERT INTO consent_events (id, user_id, actor_id, module, action, decision, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), userId, userId, 'Family Hub', `Updated connection ${conn.id}`, decision, `Status=${nextStatus}, Privacy=${nextPrivacy}`);

  res.json({ connection: db.prepare('SELECT * FROM caregiver_connections WHERE id = ?').get(conn.id) });
});

careAndWellnessRouter.delete('/family/connections/:id', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const info = db.prepare('DELETE FROM caregiver_connections WHERE id = ? AND senior_id = ?').run(req.params.id, userId);
  if (info.changes === 0) {
    res.status(403).json({ error: 'Connection not found or only the senior can remove it.' });
    return;
  }
  db.prepare(
    `INSERT INTO consent_events (id, user_id, actor_id, module, action, decision, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), userId, userId, 'Family Hub', 'Removed caregiver connection', 'revoked', req.params.id);
  res.json({ ok: true });
});

// Autonomy Engine
careAndWellnessRouter.get('/autonomy/consents', (req: AuthenticatedRequest, res) => {
  const events = db
    .prepare('SELECT * FROM consent_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 60')
    .all(req.user!.id);
  const connections = db
    .prepare('SELECT id, caregiver_email, caregiver_name, relationship, status, privacy_level, share_wellness, share_reminders, share_learning, share_scam_alerts, share_emergency FROM caregiver_connections WHERE senior_id = ?')
    .all(req.user!.id);
  res.json({ events, connections });
});

careAndWellnessRouter.post('/autonomy/consents', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { module, action, decision, details } = req.body ?? {};
  if (!['approved', 'rejected', 'revoked'].includes(decision) || typeof module !== 'string' || typeof action !== 'string') {
    res.status(400).json({ error: 'Valid module, action, and decision are required.' });
    return;
  }
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO consent_events (id, user_id, actor_id, module, action, decision, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, userId, userId, module.trim(), action.trim(), decision, typeof details === 'string' ? details.trim() : '');
  res.status(201).json({ event: db.prepare('SELECT * FROM consent_events WHERE id = ?').get(id) });
});

// Caregiver Dashboard (Strictly Consent-Gated!)
careAndWellnessRouter.get('/caregiver/seniors', requireRole(['caregiver', 'admin']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const rows = db
    .prepare(
      `SELECT cc.*, u.full_name as senior_name, u.email as senior_email, u.phone as senior_phone, u.preferred_language
       FROM caregiver_connections cc
       JOIN users u ON u.id = cc.senior_id
       WHERE (cc.caregiver_id = ? OR lower(cc.caregiver_email) = ?) AND cc.status = 'approved'
       ORDER BY cc.updated_at DESC`
    )
    .all(user.id, user.email.toLowerCase());
  res.json({ seniors: rows });
});

careAndWellnessRouter.get('/caregiver/seniors/:seniorId/overview', requireRole(['caregiver', 'admin']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const seniorId = req.params.seniorId;

  const conn = db
    .prepare(
      `SELECT cc.*, u.full_name as senior_name, u.phone as senior_phone, u.preferred_language
       FROM caregiver_connections cc
       JOIN users u ON u.id = cc.senior_id
       WHERE cc.senior_id = ? AND (cc.caregiver_id = ? OR lower(cc.caregiver_email) = ?) AND cc.status = 'approved'`
    )
    .get(seniorId, user.id, user.email.toLowerCase()) as
    | {
        id: string;
        senior_name: string;
        senior_phone: string;
        preferred_language: string;
        privacy_level: 'PRIVATE' | 'LIMITED' | 'AUTHORIZED';
        share_wellness: number;
        share_reminders: number;
        share_learning: number;
        share_scam_alerts: number;
        share_emergency: number;
        caregiver_notes: string;
      }
    | undefined;

  if (!conn) {
    res.status(403).json({ error: 'No approved caregiver consent exists for this senior.' });
    return;
  }

  // Strictly obey PRIVATE / LIMITED / AUTHORIZED consent rules
  if (conn.privacy_level === 'PRIVATE') {
    res.json({
      connection: conn,
      privacyNotice: 'Senior has set sharing to PRIVATE. No wellness, reminder, learning, or alert details are shared.',
      wellness: null,
      reminders: null,
      learning: null,
      scamAlerts: null,
      emergencyContacts: null,
    });
    return;
  }

  const allowAll = conn.privacy_level === 'AUTHORIZED';

  const wellness =
    allowAll || conn.share_wellness
      ? db
          .prepare(
            "SELECT id, mood, hydration_glasses, sleep_hours, activity_minutes, medication_taken, created_at FROM wellness_checkins WHERE user_id = ? AND visibility != 'PRIVATE' ORDER BY created_at DESC LIMIT 7"
          )
          .all(seniorId)
      : null;

  const reminders =
    allowAll || conn.share_reminders
      ? db
          .prepare('SELECT id, title, category, scheduled_time, completed FROM reminders WHERE user_id = ? ORDER BY completed ASC, scheduled_time ASC LIMIT 10')
          .all(seniorId)
      : null;

  const learning =
    allowAll || conn.share_learning
      ? db
          .prepare(
            `SELECT c.title, c.category, lp.status, lp.progress_percent, lp.quiz_score
             FROM learning_progress lp JOIN courses c ON c.id = lp.course_id
             WHERE lp.user_id = ? ORDER BY lp.last_accessed_at DESC`
          )
          .all(seniorId)
      : null;

  const scamAlerts =
    allowAll || conn.share_scam_alerts
      ? db
          .prepare("SELECT id, input_type, risk_level, risk_score, created_at FROM scam_history WHERE user_id = ? AND risk_level != 'LOW' ORDER BY created_at DESC LIMIT 5")
          .all(seniorId)
      : null;

  const emergencyContacts =
    allowAll || conn.share_emergency
      ? db.prepare('SELECT id, name, relationship, phone, is_emergency FROM trusted_contacts WHERE user_id = ?').all(seniorId)
      : null;

  res.json({
    connection: conn,
    wellness,
    reminders,
    learning,
    scamAlerts,
    emergencyContacts,
  });
});

careAndWellnessRouter.patch('/caregiver/connections/:id/notes', requireRole(['caregiver', 'admin']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const notes = typeof req.body?.caregiverNotes === 'string' ? req.body.caregiverNotes.trim().slice(0, 1500) : '';
  const info = db
    .prepare(
      `UPDATE caregiver_connections SET caregiver_notes = ?, updated_at = datetime('now')
       WHERE id = ? AND (caregiver_id = ? OR lower(caregiver_email) = ?) AND status = 'approved'`
    )
    .run(notes, req.params.id, user.id, user.email.toLowerCase());

  if (info.changes === 0) {
    res.status(403).json({ error: 'Unable to update notes for this connection.' });
    return;
  }
  logAudit({ userId: user.id, action: 'CAREGIVER_NOTE_UPDATE', resource: 'caregiver_connections', status: 'success', ipAddress: req.ip });
  res.json({ ok: true });
});

// Emergency SOS event logger (only after double-confirmation in UI)
careAndWellnessRouter.post('/emergency/sos', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { locationShared, latitude, longitude, note } = req.body ?? {};
  db.prepare(
    `INSERT INTO consent_events (id, user_id, actor_id, module, action, decision, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    crypto.randomUUID(),
    userId,
    userId,
    'Emergency Assistance',
    'Confirmed SOS emergency action',
    'approved',
    locationShared ? `Location shared: ${latitude}, ${longitude}` : 'Location not shared'
  );
  db.prepare(
    `INSERT INTO notifications (id, user_id, title, message, type)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    crypto.randomUUID(),
    userId,
    'Emergency SOS Action Recorded',
    note || 'You confirmed an SOS alert. Keep 112 (Emergency) or 108 (Ambulance) ready on your phone dialer.',
    'alert'
  );
  logAudit({ userId, action: 'EMERGENCY_SOS_CONFIRMED', resource: 'emergency', status: 'success', ipAddress: req.ip });
  res.json({ ok: true, recordedAt: new Date().toISOString() });
});

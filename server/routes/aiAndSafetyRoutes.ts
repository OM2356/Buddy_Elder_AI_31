import crypto from 'node:crypto';
import { Router } from 'express';
import { db, logAudit } from '../db/database.ts';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.ts';
import { ALL_AGENTS, runBuddyOrchestrator, streamBuddyOrchestrator } from '../services/buddyOrchestrator.ts';
import { generateGeminiText, isGeminiAvailable } from '../services/geminiService.ts';
import { analyzeScamDeterministically, type ScamInputType } from '../services/scamDetector.ts';

export const aiAndSafetyRouter = Router();
aiAndSafetyRouter.use(requireAuth);

aiAndSafetyRouter.get('/chat/agents', (_req, res) => {
  res.json({ agents: ALL_AGENTS, geminiAvailable: isGeminiAvailable() });
});

aiAndSafetyRouter.get('/chat/conversations', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  const rows = query
    ? db
        .prepare(
          `SELECT DISTINCT c.* FROM conversations c
           LEFT JOIN messages m ON m.conversation_id = c.id
           WHERE c.user_id = ? AND (c.title LIKE ? OR m.content LIKE ?)
           ORDER BY c.updated_at DESC`
        )
        .all(userId, `%${query}%`, `%${query}%`)
    : db.prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC').all(userId);

  res.json({ conversations: rows });
});

aiAndSafetyRouter.post('/chat/conversations', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const title = typeof req.body?.title === 'string' && req.body.title.trim() ? req.body.title.trim() : 'New Conversation';
  const language = req.body?.language === 'hi' || req.body?.language === 'mr' ? req.body.language : req.user!.preferredLanguage;
  const id = crypto.randomUUID();

  db.prepare('INSERT INTO conversations (id, user_id, title, language) VALUES (?, ?, ?, ?)').run(id, userId, title, language);
  const created = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  res.status(201).json({ conversation: created });
});

aiAndSafetyRouter.patch('/chat/conversations/:id', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title) {
    res.status(400).json({ error: 'Conversation title cannot be empty.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, userId);
  if (!existing) {
    res.status(404).json({ error: 'Conversation not found.' });
    return;
  }

  db.prepare(`UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?`).run(title.slice(0, 120), req.params.id);
  res.json({ conversation: db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id) });
});

aiAndSafetyRouter.delete('/chat/conversations/:id', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const info = db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Conversation not found.' });
    return;
  }
  res.json({ ok: true });
});

aiAndSafetyRouter.get('/chat/conversations/:id/messages', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, userId);
  if (!conv) {
    res.status(404).json({ error: 'Conversation not found.' });
    return;
  }
  const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json({ conversation: conv, messages });
});

aiAndSafetyRouter.post('/chat/conversations/:id/message', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, userId) as
      | { id: string; title: string; language: 'en' | 'hi' | 'mr' }
      | undefined;
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    const { content, explicitAgent, transform, skipSaveUser, language } = req.body ?? {};
    const cleanContent = typeof content === 'string' ? content.trim() : '';
    if (!cleanContent) {
      res.status(400).json({ error: 'Message content cannot be empty.' });
      return;
    }

    const activeLang: 'en' | 'hi' | 'mr' = language === 'hi' || language === 'mr' || language === 'en' ? language : conv.language;

    let userMsgRow = null;
    if (!skipSaveUser) {
      const userMsgId = crypto.randomUUID();
      db.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)').run(userMsgId, conv.id, 'user', cleanContent);
      userMsgRow = db.prepare('SELECT * FROM messages WHERE id = ?').get(userMsgId);

      if (conv.title === 'New Conversation') {
        const autoTitle = cleanContent.length > 48 ? `${cleanContent.slice(0, 48)}...` : cleanContent;
        db.prepare(`UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?`).run(autoTitle, conv.id);
      }
    }

    const result = await runBuddyOrchestrator({
      ctx: {
        userId,
        userName: req.user!.fullName,
        role: req.user!.role,
        language: activeLang,
        explicitAgent,
      },
      conversationId: conv.id,
      userMessage: cleanContent,
      transform,
    });

    const assistantMsgId = crypto.randomUUID();
    db.prepare('INSERT INTO messages (id, conversation_id, role, content, agent_used, verified) VALUES (?, ?, ?, ?, ?, ?)').run(
      assistantMsgId,
      conv.id,
      'assistant',
      result.reply,
      result.agentUsed,
      result.verified ? 1 : 0
    );
    db.prepare(`UPDATE conversations SET agent_type = ?, updated_at = datetime('now') WHERE id = ?`).run(result.agentUsed, conv.id);

    const assistantMsgRow = db.prepare('SELECT * FROM messages WHERE id = ?').get(assistantMsgId);
    res.json({
      userMessage: userMsgRow,
      assistantMessage: assistantMsgRow,
      geminiUsed: result.geminiUsed,
      conversation: db.prepare('SELECT * FROM conversations WHERE id = ?').get(conv.id),
    });
  } catch (err) {
    console.error('Chat message error:', err);
    res.status(500).json({ error: 'Unable to process message.' });
  }
});

aiAndSafetyRouter.post('/chat/conversations/:id/stream', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, userId) as
    | { id: string; title: string; language: 'en' | 'hi' | 'mr' }
    | undefined;
  if (!conv) {
    res.status(404).json({ error: 'Conversation not found.' });
    return;
  }

  const { content, explicitAgent, language } = req.body ?? {};
  const cleanContent = typeof content === 'string' ? content.trim() : '';
  if (!cleanContent) {
    res.status(400).json({ error: 'Message content cannot be empty.' });
    return;
  }

  const activeLang: 'en' | 'hi' | 'mr' = language === 'hi' || language === 'mr' || language === 'en' ? language : conv.language;

  const userMsgId = crypto.randomUUID();
  db.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)').run(userMsgId, conv.id, 'user', cleanContent);

  if (conv.title === 'New Conversation') {
    const autoTitle = cleanContent.length > 48 ? `${cleanContent.slice(0, 48)}...` : cleanContent;
    db.prepare(`UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?`).run(autoTitle, conv.id);
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let fullReply = '';
  let agentUsed = 'General Conversational Agent';
  let verified = false;
  let geminiUsed = false;

  try {
    for await (const event of streamBuddyOrchestrator({
      ctx: {
        userId,
        userName: req.user!.fullName,
        role: req.user!.role,
        language: activeLang,
        explicitAgent,
      },
      conversationId: conv.id,
      userMessage: cleanContent,
    })) {
      if (event.type === 'meta' && event.agentUsed) {
        agentUsed = event.agentUsed;
        res.write(`data: ${JSON.stringify({ type: 'meta', agentUsed })}\n\n`);
      } else if (event.type === 'chunk' && event.text) {
        fullReply += event.text;
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: event.text })}\n\n`);
      } else if (event.type === 'done') {
        verified = Boolean(event.verified);
        geminiUsed = Boolean(event.geminiUsed);
      }
    }

    const assistantMsgId = crypto.randomUUID();
    db.prepare('INSERT INTO messages (id, conversation_id, role, content, agent_used, verified) VALUES (?, ?, ?, ?, ?, ?)').run(
      assistantMsgId,
      conv.id,
      'assistant',
      fullReply,
      agentUsed,
      verified ? 1 : 0
    );
    db.prepare(`UPDATE conversations SET agent_type = ?, updated_at = datetime('now') WHERE id = ?`).run(agentUsed, conv.id);

    const savedMessage = db.prepare('SELECT * FROM messages WHERE id = ?').get(assistantMsgId);
    res.write(`data: ${JSON.stringify({ type: 'done', message: savedMessage, geminiUsed })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Streaming failure:', err);
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'Streaming interrupted.' })}\n\n`);
    res.end();
  }
});

aiAndSafetyRouter.post('/scam/analyze', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { inputType, content, aiConsent } = req.body ?? {};
    const validTypes: ScamInputType[] = ['sms', 'whatsapp', 'email', 'url', 'payment', 'phone'];
    const type: ScamInputType = validTypes.includes(inputType) ? inputType : 'sms';
    const cleanContent = typeof content === 'string' ? content.trim() : '';

    if (!cleanContent) {
      res.status(400).json({ error: 'Please paste a message, link, payment request, or phone number to analyze.' });
      return;
    }

    const deterministic = analyzeScamDeterministically(type, cleanContent);
    let aiExplanation = '';
    const consentGiven = Boolean(aiConsent);

    if (consentGiven) {
      db.prepare(
        `INSERT INTO consent_events (id, user_id, actor_id, module, action, decision, details)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(crypto.randomUUID(), userId, userId, 'Scam Shield', 'AI-assisted message analysis', 'approved', `Input type: ${type}`);

      if (isGeminiAvailable()) {
        try {
          aiExplanation = await generateGeminiText({
            systemInstruction: `You are Buddy Elder AI Scam Shield in India. Explain clearly in plain language why the submitted ${type} may or may not be risky. Rule-based engine scored ${deterministic.riskScore}/100 (${deterministic.riskLevel}). NEVER claim any unchecked link is guaranteed safe. Always remind the user never to share OTP/UPI PIN and mention 1930 / cybercrime.gov.in for reporting.`,
            prompt: `Analyze this ${type} content safely:\n\n${cleanContent.slice(0, 2000)}`,
            lowLatency: true,
          });
        } catch (err) {
          console.error('Scam AI analysis fallback:', err);
          aiExplanation = 'AI assistant could not be reached right now. Please rely on the verified rule-based safety assessment above.';
        }
      } else {
        aiExplanation = 'Live Gemini AI is offline. Deterministic rule-based protection completed the safety assessment.';
      }
    }

    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO scam_history (id, user_id, input_type, content, risk_level, risk_score, triggers_json, rule_explanation, ai_explanation, ai_consent_given)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      type,
      cleanContent.slice(0, 4000),
      deterministic.riskLevel,
      deterministic.riskScore,
      JSON.stringify(deterministic.triggers),
      deterministic.ruleExplanation,
      aiExplanation,
      consentGiven ? 1 : 0
    );

    if (deterministic.riskLevel === 'HIGH') {
      db.prepare(
        `INSERT INTO notifications (id, user_id, title, message, type)
         VALUES (?, ?, ?, ?, ?)`
      ).run(
        crypto.randomUUID(),
        userId,
        'High Risk Scam Alert',
        `Scam Shield flagged a high-risk ${type.toUpperCase()} (${deterministic.riskScore}/100). Do not share OTPs, PINs, or click links.`,
        'warning'
      );
    }

    logAudit({ userId, action: 'SCAM_ANALYZE', resource: 'scam_shield', status: 'success', ipAddress: req.ip, details: `Risk: ${deterministic.riskLevel}` });

    res.json({
      id,
      inputType: type,
      ...deterministic,
      aiExplanation,
      aiConsentGiven: consentGiven,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Scam analyze error:', err);
    res.status(500).json({ error: 'Unable to analyze content right now.' });
  }
});

aiAndSafetyRouter.get('/scam/history', (req: AuthenticatedRequest, res) => {
  const rows = db
    .prepare('SELECT * FROM scam_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(req.user!.id);
  res.json({ history: rows });
});

aiAndSafetyRouter.post('/scam/:id/report', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const info = db.prepare('UPDATE scam_history SET reported = 1 WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Scam history item not found.' });
    return;
  }
  logAudit({ userId, action: 'SCAM_REPORTED', resource: 'scam_shield', status: 'success', ipAddress: req.ip, details: req.params.id });
  res.json({ ok: true, helpline: '1930', portal: 'https://cybercrime.gov.in' });
});

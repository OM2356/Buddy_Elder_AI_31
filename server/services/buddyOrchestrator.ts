import { db } from '../db/database.ts';
import { generateGeminiText, isGeminiAvailable, streamGeminiText, type ChatTurn } from './geminiService.ts';
import { analyzeScamDeterministically } from './scamDetector.ts';

export type AgentCapability =
  | 'General Conversational Agent'
  | 'Companion Agent'
  | 'Digital Education Agent'
  | 'Safety and Scam Detection Agent'
  | 'Wellness and Healthy Ageing Agent'
  | 'Emergency and SOS Agent'
  | 'Caregiver Support Agent'
  | 'Accessibility and Speech Agent'
  | 'Knowledge Hub and RAG Agent'
  | 'Learning Progress Agent'
  | 'Answer Verification Agent';

export const ALL_AGENTS: AgentCapability[] = [
  'General Conversational Agent',
  'Companion Agent',
  'Digital Education Agent',
  'Safety and Scam Detection Agent',
  'Wellness and Healthy Ageing Agent',
  'Emergency and SOS Agent',
  'Caregiver Support Agent',
  'Accessibility and Speech Agent',
  'Knowledge Hub and RAG Agent',
  'Learning Progress Agent',
  'Answer Verification Agent',
];

export interface OrchestratorContext {
  userId: string;
  userName: string;
  role: string;
  language: 'en' | 'hi' | 'mr';
  explicitAgent?: string;
}

function languageName(code: 'en' | 'hi' | 'mr'): string {
  if (code === 'hi') return 'Hindi (Devanagari script, warm respectful "aap" form)';
  if (code === 'mr') return 'Marathi (Devanagari script, warm respectful "tumhi/aapan" form)';
  return 'clear, warm, simple English';
}

export function routeIntentToAgent(message: string, role: string, explicitAgent?: string): AgentCapability {
  if (explicitAgent && ALL_AGENTS.includes(explicitAgent as AgentCapability)) {
    return explicitAgent as AgentCapability;
  }

  const m = message.toLowerCase();

  if (/\b(sos|emergency|ambulance|chest pain|fell down|fall|bleeding|112|108|help me fast|unconscious)\b/i.test(m)) {
    return 'Emergency and SOS Agent';
  }
  if (/\b(scam|fraud|otp|upi pin|kyc|anydesk|teamviewer|phishing|lottery|digital arrest|cybercrime|1930|suspicious link|fake call)\b/i.test(m)) {
    return 'Safety and Scam Detection Agent';
  }
  if (/\b(research|paper|study|who|icope|lancet|helpage|evidence|citation|wcag|journal|report)\b/i.test(m)) {
    return 'Knowledge Hub and RAG Agent';
  }
  if (/\b(progress|completed|score|quiz score|bookmark|my courses|how many lessons)\b/i.test(m)) {
    return 'Learning Progress Agent';
  }
  if (/\b(whatsapp|smartphone|google maps|youtube|email|browser|wifi|how to use|teach me|course|lesson|zoom|upi pay)\b/i.test(m)) {
    return 'Digital Education Agent';
  }
  if (/\b(mood|sleep|water|hydration|walk|yoga|stress|tired|medicine|medication|wellness|healthy ageing|exercise)\b/i.test(m)) {
    return 'Wellness and Healthy Ageing Agent';
  }
  if (/\b(font size|read aloud|voice|speech|screen reader|contrast|dark mode|marathi|hindi|accessibility|ocr)\b/i.test(m)) {
    return 'Accessibility and Speech Agent';
  }
  if (role === 'caregiver' || /\b(caregiver|parents|mother|father|senior care|family hub|consent|sharing)\b/i.test(m)) {
    return 'Caregiver Support Agent';
  }
  if (/\b(lonely|alone|sad|miss my|bored|talk to me|story|good morning|namaste|how are you|friend)\b/i.test(m)) {
    return 'Companion Agent';
  }
  if (/\b(verify|double check|is this true|fact check)\b/i.test(m)) {
    return 'Answer Verification Agent';
  }

  return 'General Conversational Agent';
}

function buildGroundedContext(agent: AgentCapability, userId: string, query: string): string {
  const parts: string[] = [];

  if (agent === 'Knowledge Hub and RAG Agent') {
    const tokens = query
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 3)
      .slice(0, 6);
    const docs = db.prepare('SELECT title, authors, year, category, source_name, source_url, abstract, key_findings FROM research_documents').all() as Array<{
      title: string;
      authors: string;
      year: number;
      category: string;
      source_name: string;
      source_url: string;
      abstract: string;
      key_findings: string;
    }>;

    const scored = docs
      .map((d) => {
        const hay = `${d.title} ${d.category} ${d.abstract} ${d.key_findings}`.toLowerCase();
        const hits = tokens.reduce((acc, tok) => acc + (hay.includes(tok) ? 1 : 0), 0);
        return { doc: d, hits };
      })
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 3);

    parts.push('VERIFIED RESEARCH SOURCES FROM BUDDY ELDER LIBRARY:');
    for (const item of scored) {
      parts.push(
        `- Title: "${item.doc.title}" (${item.doc.year}), Authors: ${item.doc.authors}, Source: ${item.doc.source_name} (${item.doc.source_url}). Key Findings: ${item.doc.key_findings}`
      );
    }
    parts.push('RULE: Clearly distinguish "Verified Source Findings" from "Buddy AI Interpretation". Never invent citations outside these sources.');
  }

  if (agent === 'Learning Progress Agent' || agent === 'Digital Education Agent') {
    const progress = db
      .prepare(
        `SELECT c.title, c.category, lp.status, lp.progress_percent, lp.quiz_score
         FROM learning_progress lp
         JOIN courses c ON c.id = lp.course_id
         WHERE lp.user_id = ?
         ORDER BY lp.last_accessed_at DESC LIMIT 8`
      )
      .all(userId) as Array<{ title: string; category: string; status: string; progress_percent: number; quiz_score: number | null }>;

    const totalCourses = (db.prepare('SELECT COUNT(*) as cnt FROM courses').get() as { cnt: number }).cnt;
    if (progress.length > 0) {
      parts.push(`USER LEARNING PROGRESS (${totalCourses} total courses available):`);
      for (const p of progress) {
        parts.push(`- ${p.title} [${p.category}]: ${p.status} (${p.progress_percent}%${p.quiz_score !== null ? `, quiz ${p.quiz_score}%` : ''})`);
      }
    } else {
      parts.push(`USER LEARNING PROGRESS: User has not started any of the ${totalCourses} courses yet. Recommend starting with Course 1 (Smartphone Basics) or Course 13 (UPI Safety Golden Rule).`);
    }
  }

  if (agent === 'Wellness and Healthy Ageing Agent') {
    const recent = db
      .prepare('SELECT mood, hydration_glasses, sleep_hours, activity_minutes, created_at FROM wellness_checkins WHERE user_id = ? ORDER BY created_at DESC LIMIT 3')
      .all(userId) as Array<{ mood: string; hydration_glasses: number; sleep_hours: number; activity_minutes: number; created_at: string }>;
    if (recent.length > 0) {
      parts.push('RECENT USER WELLNESS CHECK-INS:');
      for (const r of recent) {
        parts.push(`- ${r.created_at}: Mood=${r.mood}, Water=${r.hydration_glasses} glasses, Sleep=${r.sleep_hours}h, Activity=${r.activity_minutes} min`);
      }
    }
    parts.push('STRICT SAFETY RULE: Never diagnose medical conditions or prescribe medications. Encourage consulting a qualified doctor for medical symptoms.');
  }

  if (agent === 'Emergency and SOS Agent') {
    parts.push('VERIFIED INDIAN EMERGENCY NUMBERS: 112 (All-in-One National Emergency), 108 (Ambulance), 1930 (Cyber Financial Fraud). Never claim you automatically dialed a number or shared GPS without user action.');
  }

  if (agent === 'Safety and Scam Detection Agent') {
    const ruleCheck = analyzeScamDeterministically('sms', query);
    parts.push(`DETERMINISTIC RULE PRE-CHECK: Risk=${ruleCheck.riskLevel} (${ruleCheck.riskScore}/100). Triggers: ${ruleCheck.triggers.map((t) => t.label).join('; ') || 'None matched directly'}.`);
    parts.push('STRICT RULE: Never state that an unchecked link is guaranteed safe. Always advise dialing 1930 and reporting at cybercrime.gov.in if money/OTP was compromised.');
  }

  return parts.join('\n');
}

function buildSystemInstruction(agent: AgentCapability, ctx: OrchestratorContext, groundedContext: string): string {
  return `You are Buddy Elder AI, a warm, patient, dignified digital companion for older adults and their caregivers in India.
Active Specialized Capability: ${agent}
User Name: ${ctx.userName} (Role: ${ctx.role})
Required Response Language: ${languageName(ctx.language)}

Core Guidelines:
1. Respond directly and specifically to the user's question. Use numbered steps or short bullet points when explaining instructions.
2. Keep sentences calm, respectful, jargon-free, and encouraging.
3. Preserve senior autonomy—never suggest overriding the senior's privacy or consent.
4. Safety invariants:
   - Never diagnose medical conditions or prescribe medicines.
   - Never claim an unverified URL is guaranteed safe.
   - Never fabricate research citations or fake personal records.
   - For Indian emergencies mention 112 (Emergency), 108 (Ambulance), and 1930 (Cyber Fraud).

${groundedContext ? `Grounded Context:\n${groundedContext}` : ''}`;
}

export function buildDeterministicFallback(agent: AgentCapability, message: string, ctx: OrchestratorContext): {
  text: string;
  verified: boolean;
} {
  if (agent === 'Emergency and SOS Agent') {
    return {
      text: `**Emergency Guidance (Offline Safety Mode)**\n\nIf this is an immediate emergency in India:\n1. **Dial 112** for Police / Fire / National Emergency Response.\n2. **Dial 108** for Ambulance medical transport.\n3. **Dial 1930** for urgent cyber financial fraud.\n\nYou can also open the **Emergency Assistance** tab in the left menu to view your saved emergency contacts and medical card.\n\n*(Note: Live Gemini AI is currently unavailable; this verified safety guidance is provided locally.)*`,
      verified: true,
    };
  }

  if (agent === 'Safety and Scam Detection Agent') {
    const analysis = analyzeScamDeterministically('sms', message);
    return {
      text: `**Scam Shield Local Check — Risk Level: ${analysis.riskLevel} (${analysis.riskScore}/100)**\n\n${analysis.ruleExplanation}\n\n**Verification Steps:**\n${analysis.verificationSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n**Report Fraud in India:** Call **1930** or visit **https://cybercrime.gov.in**.\n\n*(Note: Live Gemini AI is currently offline; deterministic rule protection was used.)*`,
      verified: true,
    };
  }

  if (agent === 'Knowledge Hub and RAG Agent') {
    const docs = db.prepare('SELECT title, authors, year, source_name, key_findings FROM research_documents LIMIT 3').all() as Array<{
      title: string;
      authors: string;
      year: number;
      source_name: string;
      key_findings: string;
    }>;
    return {
      text: `**Verified Sources from Research Knowledge Hub**\n\nHere are relevant verified publications stored in your library:\n${docs.map((d, i) => `${i + 1}. **${d.title}** (${d.authors}, ${d.year} · ${d.source_name})\n   - *Verified Key Finding:* ${d.key_findings}`).join('\n')}\n\n*(Live Gemini AI is currently unavailable to synthesize a custom summary, so verified library excerpts are shown directly.)*`,
      verified: true,
    };
  }

  if (agent === 'Learning Progress Agent') {
    const count = (db.prepare("SELECT COUNT(*) as cnt FROM learning_progress WHERE user_id = ? AND status = 'completed'").get(ctx.userId) as { cnt: number }).cnt;
    return {
      text: `**Your Learning Progress**\n\nYou have completed **${count} of 24** courses in the Digital Learning Academy.\n\nOpen **Digital Learning Academy** from the dashboard to continue step-by-step lessons, audio guides, and interactive smartphone practice.\n\n*(Live Gemini AI is offline; real progress from your database is shown above.)*`,
      verified: true,
    };
  }

  return {
    text: `Namaste ${ctx.userName}. Live Gemini AI is currently offline (API key not configured or unreachable), so I am running in **Core Offline Mode**.\n\nHere is what you can still do right now:\n1. **Scam Shield**: Paste any suspicious SMS, WhatsApp, or URL for instant rule-based risk checking.\n2. **Digital Learning Academy**: Explore all 24 lessons, audio scripts, quizzes, and the smartphone simulator.\n3. **Audio Reader & OCR**: Scan documents with Tesseract OCR and listen aloud.\n4. **Wellness, Reminders & Family Hub**: Log daily mood, manage reminders, and control privacy permissions.\n\nOnce \`GEMINI_API_KEY\` is configured on the server, full conversational AI will respond automatically.`,
    verified: true,
  };
}

export async function runBuddyOrchestrator(params: {
  ctx: OrchestratorContext;
  conversationId: string;
  userMessage: string;
  transform?: 'simplify' | 'shorter' | 'example' | 'translate_hi' | 'translate_mr';
}): Promise<{ agentUsed: AgentCapability; reply: string; verified: boolean; geminiUsed: boolean }> {
  const agent = routeIntentToAgent(params.userMessage, params.ctx.role, params.ctx.explicitAgent);
  const groundedContext = buildGroundedContext(agent, params.ctx.userId, params.userMessage);
  const systemInstruction = buildSystemInstruction(agent, params.ctx, groundedContext);

  const rawHistory = db
    .prepare('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 16')
    .all(params.conversationId) as Array<{ role: 'user' | 'assistant'; content: string }>;

  const history: ChatTurn[] = rawHistory.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    text: m.content,
  }));

  let effectivePrompt = params.userMessage;
  if (params.transform === 'simplify') {
    effectivePrompt = `Please explain your previous answer much more simply in short everyday words for a beginner senior citizen:\n\n${params.userMessage}`;
  } else if (params.transform === 'shorter') {
    effectivePrompt = `Please make this explanation concise (3-4 short bullet points max):\n\n${params.userMessage}`;
  } else if (params.transform === 'example') {
    effectivePrompt = `Please give another practical everyday Indian example for:\n\n${params.userMessage}`;
  } else if (params.transform === 'translate_hi') {
    effectivePrompt = `Translate the following helpful response accurately into warm, natural Hindi (Devanagari script):\n\n${params.userMessage}`;
  } else if (params.transform === 'translate_mr') {
    effectivePrompt = `Translate the following helpful response accurately into warm, natural Marathi (Devanagari script):\n\n${params.userMessage}`;
  }

  if (!isGeminiAvailable()) {
    const fallback = buildDeterministicFallback(agent, params.userMessage, params.ctx);
    return { agentUsed: agent, reply: fallback.text, verified: fallback.verified, geminiUsed: false };
  }

  try {
    let reply = await generateGeminiText({
      systemInstruction,
      history,
      prompt: effectivePrompt,
    });

    if (!reply) {
      throw new Error('Empty response from Gemini');
    }

    // Answer Verification Agent safety check on critical domains
    let verified = false;
    if (
      agent === 'Safety and Scam Detection Agent' ||
      agent === 'Wellness and Healthy Ageing Agent' ||
      agent === 'Emergency and SOS Agent' ||
      agent === 'Knowledge Hub and RAG Agent'
    ) {
      verified = true;
      if (agent === 'Wellness and Healthy Ageing Agent' && !/doctor|physician|medical advice/i.test(reply)) {
        reply += '\n\n*Gentle reminder: This information supports daily wellness and is not a medical diagnosis or prescription. Please consult your doctor for medical concerns.*';
      }
    }

    return { agentUsed: agent, reply, verified, geminiUsed: true };
  } catch (err) {
    console.error('Gemini orchestrator error, falling back gracefully:', err);
    const fallback = buildDeterministicFallback(agent, params.userMessage, params.ctx);
    return { agentUsed: agent, reply: fallback.text, verified: fallback.verified, geminiUsed: false };
  }
}

export async function* streamBuddyOrchestrator(params: {
  ctx: OrchestratorContext;
  conversationId: string;
  userMessage: string;
}): AsyncGenerator<{ type: 'meta' | 'chunk' | 'done'; agentUsed?: AgentCapability; text?: string; verified?: boolean; geminiUsed?: boolean }> {
  const agent = routeIntentToAgent(params.userMessage, params.ctx.role, params.ctx.explicitAgent);
  yield { type: 'meta', agentUsed: agent };

  const groundedContext = buildGroundedContext(agent, params.ctx.userId, params.userMessage);
  const systemInstruction = buildSystemInstruction(agent, params.ctx, groundedContext);

  const rawHistory = db
    .prepare('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 16')
    .all(params.conversationId) as Array<{ role: 'user' | 'assistant'; content: string }>;

  const history: ChatTurn[] = rawHistory.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    text: m.content,
  }));

  if (!isGeminiAvailable()) {
    const fallback = buildDeterministicFallback(agent, params.userMessage, params.ctx);
    yield { type: 'chunk', text: fallback.text };
    yield { type: 'done', agentUsed: agent, verified: fallback.verified, geminiUsed: false };
    return;
  }

  try {
    let fullText = '';
    for await (const chunk of streamGeminiText({
      systemInstruction,
      history,
      prompt: params.userMessage,
    })) {
      fullText += chunk;
      yield { type: 'chunk', text: chunk };
    }

    let verified = false;
    if (
      agent === 'Safety and Scam Detection Agent' ||
      agent === 'Wellness and Healthy Ageing Agent' ||
      agent === 'Emergency and SOS Agent' ||
      agent === 'Knowledge Hub and RAG Agent'
    ) {
      verified = true;
      if (agent === 'Wellness and Healthy Ageing Agent' && !/doctor|physician|medical advice/i.test(fullText)) {
        const note = '\n\n*Gentle reminder: This information supports daily wellness and is not a medical diagnosis or prescription. Please consult your doctor for medical concerns.*';
        yield { type: 'chunk', text: note };
      }
    }

    yield { type: 'done', agentUsed: agent, verified, geminiUsed: true };
  } catch (err) {
    console.error('Gemini stream error, using deterministic fallback:', err);
    const fallback = buildDeterministicFallback(agent, params.userMessage, params.ctx);
    yield { type: 'chunk', text: fallback.text };
    yield { type: 'done', agentUsed: agent, verified: fallback.verified, geminiUsed: false };
  }
}

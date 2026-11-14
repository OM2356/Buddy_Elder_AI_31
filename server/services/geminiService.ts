import { GoogleGenAI, ThinkingLevel, type GenerateContentResponse } from '@google/genai';
import { env } from '../config/env.ts';

let client: GoogleGenAI | null = null;

export function isGeminiAvailable(): boolean {
  return Boolean(env.geminiApiKey);
}

function getClient(): GoogleGenAI {
  if (!env.geminiApiKey) {
    throw new Error('GEMINI_UNAVAILABLE: GEMINI_API_KEY is not configured.');
  }
  if (!client) {
    client = new GoogleGenAI({
      apiKey: env.geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return client;
}

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export async function generateGeminiText(params: {
  systemInstruction: string;
  history?: ChatTurn[];
  prompt: string;
  lowLatency?: boolean;
}): Promise<string> {
  const ai = getClient();
  const contents = [
    ...(params.history || []).map((t) => ({
      role: t.role,
      parts: [{ text: t.text }],
    })),
    {
      role: 'user' as const,
      parts: [{ text: params.prompt }],
    },
  ];

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: env.geminiModel,
    contents,
    config: {
      systemInstruction: params.systemInstruction,
      ...(env.geminiModel.startsWith('gemini-4-') || env.geminiModel.startsWith('gemini-3')
        ? {
            thinkingConfig: {
              thinkingLevel: params.lowLatency ? ThinkingLevel.LOW : ThinkingLevel.MEDIUM,
            },
          }
        : {}),
    },
  });

  return (response.text ?? '').trim();
}

export async function* streamGeminiText(params: {
  systemInstruction: string;
  history?: ChatTurn[];
  prompt: string;
}): AsyncGenerator<string> {
  const ai = getClient();
  const contents = [
    ...(params.history || []).map((t) => ({
      role: t.role,
      parts: [{ text: t.text }],
    })),
    {
      role: 'user' as const,
      parts: [{ text: params.prompt }],
    },
  ];

  const stream = await ai.models.generateContentStream({
    model: env.geminiModel,
    contents,
    config: {
      systemInstruction: params.systemInstruction,
    },
  });

  for await (const chunk of stream) {
    const text = (chunk as GenerateContentResponse).text;
    if (text) {
      yield text;
    }
  }
}

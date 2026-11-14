import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Check,
  Copy,
  Edit3,
  Mic,
  MicOff,
  Plus,
  RefreshCw,
  Search,
  Send,
  Square,
  Trash2,
  Volume2,
  Bot,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useVoiceRecognition } from '../../hooks/useVoiceRecognition';
import { apiRequest, streamChatMessage } from '../../lib/api';
import type { ChatMessage, Conversation } from '../../types';

export const BuddyChatView: React.FC = () => {
  const { language, speakText, stopSpeech, isSpeaking } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingAgent, setStreamingAgent] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const voice = useVoiceRecognition(language);

  const loadConversations = async (q = searchQuery) => {
    try {
      const res = await apiRequest<{ conversations: Conversation[] }>(
        `/api/chat/conversations${q ? `?q=${encodeURIComponent(q)}` : ''}`
      );
      setConversations(res.conversations);
      if (!activeConvId && res.conversations.length > 0) {
        setActiveConvId(res.conversations[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load conversations.');
    }
  };

  useEffect(() => {
    apiRequest<{ agents: string[] }>('/api/chat/agents')
      .then((d) => setAgents(d.agents))
      .catch(() => {});
    loadConversations('');
  }, []);

  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    apiRequest<{ messages: ChatMessage[] }>(`/api/chat/conversations/${activeConvId}/messages`)
      .then((d) => setMessages(d.messages))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load messages.'));
  }, [activeConvId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleNewConversation = async () => {
    try {
      const res = await apiRequest<{ conversation: Conversation }>('/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Conversation', language }),
      });
      setConversations((prev) => [res.conversation, ...prev]);
      setActiveConvId(res.conversation.id);
      setMessages([]);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start new conversation.');
    }
  };

  const ensureActiveConversation = async (): Promise<string> => {
    if (activeConvId) return activeConvId;
    const res = await apiRequest<{ conversation: Conversation }>('/api/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Conversation', language }),
    });
    setConversations((prev) => [res.conversation, ...prev]);
    setActiveConvId(res.conversation.id);
    return res.conversation.id;
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setError('');
    setSending(true);
    setInput('');
    setStreamingText('');
    setStreamingAgent('');

    try {
      const convId = await ensureActiveConversation();
      const optimisticUser: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: convId,
        role: 'user',
        content: text,
        agent_used: '',
        verified: 0,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticUser]);

      await streamChatMessage(
        convId,
        {
          content: text,
          explicitAgent: selectedAgent || undefined,
          language,
        },
        (ev) => {
          if (ev.type === 'meta' && ev.agentUsed) {
            setStreamingAgent(ev.agentUsed);
          } else if (ev.type === 'chunk' && ev.text) {
            setStreamingText((prev) => prev + ev.text);
          } else if (ev.type === 'done' && ev.message) {
            setMessages((prev) => [...prev, ev.message as ChatMessage]);
            setStreamingText('');
            setStreamingAgent('');
            loadConversations();
          } else if (ev.type === 'error') {
            setError(ev.error || 'Response stream failed.');
          }
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleTransform = async (
    msg: ChatMessage,
    transform?: 'simplify' | 'shorter' | 'example' | 'translate_hi' | 'translate_mr'
  ) => {
    if (!activeConvId || sending) return;
    setSending(true);
    setError('');
    try {
      let promptText = msg.content;
      if (!transform) {
        // Regenerate using last user message before this assistant reply
        const idx = messages.findIndex((m) => m.id === msg.id);
        const prevUser = [...messages.slice(0, idx)].reverse().find((m) => m.role === 'user');
        promptText = prevUser?.content || msg.content;
      }

      const res = await apiRequest<{ assistantMessage: ChatMessage }>(
        `/api/chat/conversations/${activeConvId}/message`,
        {
          method: 'POST',
          body: JSON.stringify({
            content: promptText,
            transform,
            skipSaveUser: true,
            explicitAgent: selectedAgent || undefined,
            language,
          }),
        }
      );
      setMessages((prev) => [...prev, res.assistantMessage]);
      loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to transform response.');
    } finally {
      setSending(false);
    }
  };

  const handleRenameSubmit = async (id: string) => {
    if (!renameTitle.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      await apiRequest(`/api/chat/conversations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: renameTitle.trim() }),
      });
      setRenamingId(null);
      loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rename failed.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiRequest(`/api/chat/conversations/${deleteTarget.id}`, { method: 'DELETE' });
      const remaining = conversations.filter((c) => c.id !== deleteTarget.id);
      setConversations(remaining);
      if (activeConvId === deleteTarget.id) {
        setActiveConvId(remaining[0]?.id ?? null);
      }
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const copyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('Clipboard permission unavailable.');
    }
  };

  const starterPrompts = [
    'How do I spot a fake UPI refund or KYC message?',
    'Explain how to make a WhatsApp video call step by step',
    'What does WHO ICOPE recommend for healthy ageing?',
    'Suggest gentle daily wellness habits for seniors',
  ];

  return (
    <div className="grid lg:grid-cols-12 gap-6 min-h-[75vh]">
      {/* Conversation Sidebar */}
      <aside className="lg:col-span-4 xl:col-span-3 bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
        <button
          type="button"
          onClick={handleNewConversation}
          className="w-full min-h-[52px] px-4 py-3 rounded-xl bg-[#0F3D5E] hover:bg-[#0B2D47] dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Conversation</span>
        </button>

        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-[#4A5A68] dark:text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              loadConversations(e.target.value);
            }}
            placeholder="Search conversations..."
            className="w-full min-h-[48px] pl-11 pr-3 py-2 rounded-xl border border-[#D8CEB8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-base"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 max-h-[52vh]">
          {conversations.length === 0 ? (
            <p className="text-base text-[#4A5A68] dark:text-slate-400 p-3">No saved conversations yet. Start a new chat above.</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-3 rounded-xl border transition-colors ${
                  activeConvId === conv.id
                    ? 'bg-[#F3EFE6] dark:bg-slate-800 border-[#0D7377] dark:border-teal-400'
                    : 'border-transparent hover:bg-[#FAF8F4] dark:hover:bg-slate-800/60'
                }`}
              >
                {renamingId === conv.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={renameTitle}
                      onChange={(e) => setRenameTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit(conv.id)}
                      className="flex-1 px-2 py-1 rounded-lg border border-[#D8CEB8] dark:border-slate-600 bg-white dark:bg-slate-900 text-base"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleRenameSubmit(conv.id)}
                      className="px-3 py-1 rounded-lg bg-[#0D7377] text-white text-sm font-semibold"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveConvId(conv.id)}
                      className="text-left flex-1 min-w-0"
                    >
                      <p className="text-base font-bold truncate">{conv.title}</p>
                      <p className="text-xs text-[#4A5A68] dark:text-slate-400 tabular-nums mt-0.5">
                        {new Date(conv.updated_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} · {conv.agent_type.replace(' Agent', '')}
                      </p>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingId(conv.id);
                          setRenameTitle(conv.title);
                        }}
                        aria-label="Rename conversation"
                        className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(conv)}
                        aria-label="Delete conversation"
                        className="p-2 rounded-lg text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Workspace */}
      <section className="lg:col-span-8 xl:col-span-9 bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden">
        {/* Agent Selector Header */}
        <div className="p-4 sm:px-6 border-b border-[#E5DEC9] dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6 text-[#0D7377] dark:text-teal-400" />
            <div>
              <h1 className="text-xl font-bold">Buddy Agent Orchestrator (11 Capabilities)</h1>
              <p className="text-sm text-[#4A5A68] dark:text-slate-400">
                Automatically routes to Safety, Education, Wellness, RAG Research, or Companion support.
              </p>
            </div>
          </div>

          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            aria-label="Select specialized AI agent capability"
            className="min-h-[44px] px-3 py-2 rounded-xl border border-[#D8CEB8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-sm font-semibold"
          >
            <option value="">Auto-Route Intent (Recommended)</option>
            {agents.map((ag) => (
              <option key={ag} value={ag}>
                {ag}
              </option>
            ))}
          </select>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 max-h-[58vh]">
          {messages.length === 0 && !streamingText && (
            <div className="space-y-5 py-6">
              <p className="text-xl font-semibold text-[#0F3D5E] dark:text-white">
                How can Buddy help you today? Tap a question or speak/type your own:
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {starterPrompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setInput(p)}
                    className="text-left p-4 rounded-xl border border-[#E5DEC9] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 hover:border-[#0D7377] text-base font-medium transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-3xl rounded-2xl p-5 ${
                  msg.role === 'user'
                    ? 'bg-[#0F3D5E] text-white dark:bg-sky-600'
                    : 'bg-[#FAF8F4] dark:bg-slate-900 border border-[#E5DEC9] dark:border-slate-800 text-[#14212B] dark:text-slate-100'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="text-xs font-medium text-[#0D7377] dark:text-teal-300 mb-2 tabular-nums">
                    {msg.agent_used || 'Buddy Assistant'}
                    {msg.verified ? ' · Answer Verified' : ''}
                    {' · '}
                    {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}

                <div className="prose prose-lg dark:prose-invert max-w-none leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>

                {msg.role === 'assistant' && (
                  <div className="mt-4 pt-3 border-t border-[#E5DEC9] dark:border-slate-800 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => copyMessage(msg.id, msg.content)}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#D8CEB8] dark:border-slate-700 text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white dark:hover:bg-slate-800"
                    >
                      {copiedId === msg.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => (isSpeaking ? stopSpeech() : speakText(msg.content))}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#D8CEB8] dark:border-slate-700 text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white dark:hover:bg-slate-800"
                    >
                      {isSpeaking ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      <span>{isSpeaking ? 'Stop Speaking' : 'Read Aloud'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => handleTransform(msg)}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#D8CEB8] dark:border-slate-700 text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white dark:hover:bg-slate-800"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Regenerate</span>
                    </button>

                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => handleTransform(msg, 'simplify')}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#D8CEB8] dark:border-slate-700 text-sm font-semibold hover:bg-white dark:hover:bg-slate-800"
                    >
                      Explain Simpler
                    </button>

                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => handleTransform(msg, 'shorter')}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#D8CEB8] dark:border-slate-700 text-sm font-semibold hover:bg-white dark:hover:bg-slate-800"
                    >
                      Make Shorter
                    </button>

                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => handleTransform(msg, 'example')}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#D8CEB8] dark:border-slate-700 text-sm font-semibold hover:bg-white dark:hover:bg-slate-800"
                    >
                      Another Example
                    </button>

                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => handleTransform(msg, 'translate_hi')}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#D8CEB8] dark:border-slate-700 text-sm font-semibold hover:bg-white dark:hover:bg-slate-800"
                    >
                      Translate Hindi
                    </button>

                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => handleTransform(msg, 'translate_mr')}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#D8CEB8] dark:border-slate-700 text-sm font-semibold hover:bg-white dark:hover:bg-slate-800"
                    >
                      Translate Marathi
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {streamingText && (
            <div className="flex flex-col items-start">
              <div className="max-w-3xl rounded-2xl p-5 bg-[#FAF8F4] dark:bg-slate-900 border border-[#0D7377]">
                <div className="text-xs font-medium text-[#0D7377] dark:text-teal-300 mb-2">
                  {streamingAgent || 'Buddy Assistant'} · Writing response...
                </div>
                <div className="prose prose-lg dark:prose-invert max-w-none leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingText}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Composer */}
        <div className="p-4 sm:p-5 border-t border-[#E5DEC9] dark:border-slate-800 space-y-3">
          {(error || voice.error) && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-base">
              {error || voice.error}
            </div>
          )}

          {voice.listening && (
            <div className="p-3 rounded-xl bg-[#F3EFE6] dark:bg-slate-800 text-base font-medium">
              Listening ({language.toUpperCase()}): {voice.transcript || 'Speak calmly now...'}
            </div>
          )}

          <form onSubmit={handleSend} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Buddy anything in English, Hindi, or Marathi..."
              className="flex-1 min-h-[54px] px-4 py-3 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg focus:outline-none focus:ring-2 focus:ring-[#0D7377]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (voice.listening) {
                    voice.stopListening();
                  } else {
                    voice.startListening((finalText) => {
                      setInput((prev) => (prev ? `${prev} ${finalText}` : finalText));
                    });
                  }
                }}
                className={`min-h-[54px] px-4 py-3 rounded-xl border font-bold inline-flex items-center gap-2 transition-colors ${
                  voice.listening
                    ? 'bg-red-600 text-white border-red-600'
                    : 'border-[#D8CEB8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-800 hover:bg-[#F3EFE6]'
                }`}
              >
                {voice.listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                <span>{voice.listening ? 'Stop' : 'Speak'}</span>
              </button>

              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="min-h-[54px] px-6 py-3 rounded-xl bg-[#0F3D5E] hover:bg-[#0B2D47] dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-bold inline-flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <Send className="w-5 h-5" />
                <span>{sending ? 'Sending...' : 'Send'}</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="max-w-md w-full bg-white dark:bg-[#121F2C] rounded-2xl border border-[#E5DEC9] dark:border-slate-700 p-6 space-y-4">
            <h2 className="text-2xl font-bold">Delete Conversation?</h2>
            <p className="text-base text-[#4A5A68] dark:text-slate-300">
              Are you sure you want to permanently delete &ldquo;{deleteTarget.title}&rdquo;? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="min-h-[48px] px-5 py-2.5 rounded-xl border border-[#D8CEB8] dark:border-slate-700 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="min-h-[48px] px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpenCheck, ExternalLink, Search, Send } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import type { ResearchDocument } from '../../types';

export const ResearchHubView: React.FC = () => {
  const [docs, setDocs] = useState<ResearchDocument[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedDoc, setSelectedDoc] = useState<ResearchDocument | null>(null);
  const [ragQuestion, setRagQuestion] = useState('');
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResult, setRagResult] = useState<{
    verifiedSources: Array<{ id: string; title: string; authors: string; year: number; sourceName: string; sourceUrl: string; keyFindings: string }>;
    aiInterpretation: string;
    geminiUsed: boolean;
  } | null>(null);
  const [error, setError] = useState('');

  const loadDocs = async (q = query, cat = category) => {
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (cat && cat !== 'All') params.set('category', cat);
      const data = await apiRequest<{ documents: ResearchDocument[] }>(`/api/research?${params.toString()}`);
      setDocs(data.documents);
      if (!selectedDoc && data.documents.length > 0) {
        setSelectedDoc(data.documents[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load research library.');
    }
  };

  useEffect(() => {
    loadDocs('', 'All');
  }, []);

  const askRag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ragQuestion.trim()) return;
    setRagLoading(true);
    setError('');
    try {
      const res = await apiRequest<{
        verifiedSources: Array<{ id: string; title: string; authors: string; year: number; sourceName: string; sourceUrl: string; keyFindings: string }>;
        aiInterpretation: string;
        geminiUsed: boolean;
      }>('/api/research/ask', {
        method: 'POST',
        body: JSON.stringify({ question: ragQuestion }),
      });
      setRagResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Research query failed.');
    } finally {
      setRagLoading(false);
    }
  };

  const categories = ['All', 'Healthy Ageing', 'Cognitive Health', 'Digital Safety', 'Digital Inclusion', 'Mental & Social Wellbeing', 'Accessibility Standards'];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-[#0F3D5E] dark:text-white">Research Knowledge Hub</h1>
        <p className="text-lg text-[#4A5A68] dark:text-slate-300">
          Verified healthy-ageing, accessibility, and Indian cyber-safety publications. Verified source findings are strictly separated from AI interpretation.
        </p>
      </header>

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 text-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      {/* RAG Evidence-Based Q&A */}
      <section className="p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpenCheck className="w-6 h-6 text-[#0D7377]" />
          <span>Ask the Research Library (RAG)</span>
        </h2>
        <form onSubmit={askRag} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={ragQuestion}
            onChange={(e) => setRagQuestion(e.target.value)}
            placeholder="e.g., What modifiable factors protect cognitive health in older adults?"
            className="flex-1 min-h-[52px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg"
          />
          <button
            type="submit"
            disabled={ragLoading || !ragQuestion.trim()}
            className="min-h-[52px] px-6 py-3 rounded-xl bg-[#0F3D5E] hover:bg-[#0B2D47] dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-bold inline-flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            <span>{ragLoading ? 'Searching...' : 'Ask Sources'}</span>
          </button>
        </form>

        {ragResult && (
          <div className="grid lg:grid-cols-12 gap-5 pt-3">
            <div className="lg:col-span-7 p-5 rounded-xl bg-[#FAF8F4] dark:bg-slate-900 border border-[#E5DEC9] dark:border-slate-800 space-y-2">
              <p className="text-sm font-bold text-[#0D7377] dark:text-teal-300">
                {ragResult.geminiUsed ? 'AI-Assisted Interpretation (Grounded in Verified Sources)' : 'Direct Verified Excerpts (Offline Mode)'}
              </p>
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{ragResult.aiInterpretation}</ReactMarkdown>
              </div>
            </div>

            <div className="lg:col-span-5 p-5 rounded-xl bg-[#FAF8F4] dark:bg-slate-900 border border-[#E5DEC9] dark:border-slate-800 space-y-3">
              <p className="text-sm font-bold">Verified Source Citations</p>
              <ul className="space-y-3">
                {ragResult.verifiedSources.map((src) => (
                  <li key={src.id} className="text-sm border-b border-[#E5DEC9] dark:border-slate-800 pb-2 last:border-0">
                    <p className="font-bold">{src.title}</p>
                    <p className="text-[#4A5A68] dark:text-slate-400">{src.authors} ({src.year}) · {src.sourceName}</p>
                    {src.sourceUrl && (
                      <a href={src.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#0D7377] dark:text-teal-300 inline-flex items-center gap-1 hover:underline mt-1">
                        <span>Official Source</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-[#4A5A68]" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              loadDocs(e.target.value, category);
            }}
            placeholder="Filter research papers by keyword or author..."
            className="w-full min-h-[48px] pl-11 pr-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-white dark:bg-[#121F2C] text-lg"
          />
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            loadDocs(query, e.target.value);
          }}
          className="min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-white dark:bg-[#121F2C] text-base font-bold"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Library Split */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-5 space-y-3">
          {docs.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setSelectedDoc(doc)}
              className={`w-full text-left p-5 rounded-2xl border transition-colors ${
                selectedDoc?.id === doc.id
                  ? 'bg-[#F3EFE6] dark:bg-slate-800 border-[#0D7377] dark:border-teal-400'
                  : 'bg-white dark:bg-[#121F2C] border-[#E5DEC9] dark:border-slate-800 hover:border-[#0D7377]'
              }`}
            >
              <p className="text-sm font-medium text-[#0D7377] dark:text-teal-300 tabular-nums">
                {doc.category} · {doc.year}
              </p>
              <h3 className="text-lg font-bold mt-1">{doc.title}</h3>
              <p className="text-sm text-[#4A5A68] dark:text-slate-400 mt-1">{doc.authors}</p>
            </button>
          ))}
        </aside>

        <section className="lg:col-span-7 bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl p-6 space-y-5">
          {selectedDoc ? (
            <>
              <div className="space-y-2">
                <p className="text-sm font-bold text-[#0D7377] dark:text-teal-300 tabular-nums">
                  {selectedDoc.category} · Published {selectedDoc.year} · {selectedDoc.source_name}
                </p>
                <h2 className="text-2xl font-bold">{selectedDoc.title}</h2>
                <p className="text-base text-[#4A5A68] dark:text-slate-400">Authors: {selectedDoc.authors}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold">Abstract</h3>
                <p className="text-lg leading-relaxed">{selectedDoc.abstract}</p>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-slate-900 border border-[#E5DEC9] dark:border-slate-800 space-y-2">
                <h3 className="text-lg font-bold">Verified Key Findings</h3>
                <p className="text-base leading-relaxed">{selectedDoc.key_findings}</p>
              </div>

              {selectedDoc.source_url && (
                <a
                  href={selectedDoc.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 min-h-[48px] px-5 py-2.5 rounded-xl bg-[#0F3D5E] text-white font-bold hover:bg-[#0B2D47]"
                >
                  <span>View Official Source Document</span>
                  <ExternalLink className="w-5 h-5" />
                </a>
              )}
            </>
          ) : (
            <p className="text-base text-[#4A5A68]">Select a paper on the left to read its verified summary.</p>
          )}
        </section>
      </div>
    </div>
  );
};

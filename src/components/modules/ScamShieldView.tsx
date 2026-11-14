import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Flag, PhoneCall, ShieldAlert, ShieldCheck, Volume2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiRequest } from '../../lib/api';

type InputType = 'sms' | 'whatsapp' | 'email' | 'url' | 'payment' | 'phone';

interface AnalysisResponse {
  id: string;
  inputType: InputType;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number;
  triggers: Array<{ category: string; label: string; weight: number; guidance: string }>;
  hasUnverifiedUrl: boolean;
  ruleExplanation: string;
  aiExplanation: string;
  aiConsentGiven: boolean;
  verificationSteps: string[];
  reportingGuidance: {
    helpline: string;
    portal: string;
    steps: string[];
  };
}

interface HistoryItem {
  id: string;
  input_type: string;
  content: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  risk_score: number;
  rule_explanation: string;
  reported: number;
  created_at: string;
}

export const ScamShieldView: React.FC = () => {
  const { speakText } = useApp();
  const [inputType, setInputType] = useState<InputType>('sms');
  const [content, setContent] = useState('');
  const [aiConsent, setAiConsent] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState('');
  const [reportNotice, setReportNotice] = useState('');

  const loadHistory = async () => {
    try {
      const data = await apiRequest<{ history: HistoryItem[] }>('/api/scam/history');
      setHistory(data.history);
    } catch {
      // Ignore initial history failure
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setAnalyzing(true);
    setError('');
    setReportNotice('');
    try {
      const res = await apiRequest<AnalysisResponse>('/api/scam/analyze', {
        method: 'POST',
        body: JSON.stringify({ inputType, content, aiConsent }),
      });
      setResult(res);
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to analyze content.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReport = async (id: string) => {
    try {
      await apiRequest(`/api/scam/${id}/report`, { method: 'POST' });
      setReportNotice('Marked as suspicious activity in your history. Please dial 1930 or visit cybercrime.gov.in if any money or OTP was shared.');
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to mark as reported.');
    }
  };

  const samples: Array<{ label: string; type: InputType; text: string }> = [
    {
      label: 'Test Fake Electricity SMS',
      type: 'sms',
      text: 'Dear customer your electricity power will be disconnected tonight 9:30 PM due to unpaid bill. Call immediately 9876543210 or click http://bit.ly/pay-elec-kyc',
    },
    {
      label: 'Test Fake UPI Refund',
      type: 'payment',
      text: 'You received Rs 4,500 cashback refund! Approve the collect request and enter your UPI PIN to receive money into bank account.',
    },
    {
      label: 'Test Digital Arrest Threat',
      type: 'whatsapp',
      text: 'Urgent CBI & TRAI notice: Your Aadhaar and FedEx parcel seized with illegal items. Stay on WhatsApp video call for Digital Arrest verification.',
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-[#0F3D5E] dark:text-white">Scam Shield — Indian Digital Fraud Protection</h1>
        <p className="text-lg text-[#4A5A68] dark:text-slate-300">
          Paste any suspicious SMS, WhatsApp forward, email, web link, payment request, or customer-care number before taking action.
        </p>
      </header>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Analyzer Form */}
        <section className="lg:col-span-7 bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['sms', 'SMS'],
                ['whatsapp', 'WhatsApp'],
                ['email', 'Email'],
                ['url', 'Website Link'],
                ['payment', 'Payment / UPI'],
                ['phone', 'Phone Number'],
              ] as Array<[InputType, string]>
            ).map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => setInputType(val)}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-base font-bold transition-colors ${
                  inputType === val
                    ? 'bg-[#0F3D5E] text-white dark:bg-sky-500 dark:text-slate-950'
                    : 'bg-[#F3EFE6] dark:bg-slate-800 text-[#14212B] dark:text-slate-200 hover:bg-[#E5DEC9]'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label htmlFor="scam-input" className="block text-base font-semibold mb-2">
                Paste suspicious {inputType.toUpperCase()} text or link here
              </label>
              <textarea
                id="scam-input"
                rows={5}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste message text, link, or phone number..."
                className="w-full p-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg focus:outline-none focus:ring-2 focus:ring-[#0D7377]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {samples.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => {
                    setInputType(s.type);
                    setContent(s.text);
                  }}
                  className="px-3 py-2 rounded-lg border border-[#D8CEB8] dark:border-slate-700 text-sm font-semibold hover:bg-[#F3EFE6] dark:hover:bg-slate-800"
                >
                  {s.label}
                </button>
              ))}
            </div>

            <label className="flex items-start gap-3 p-4 rounded-xl bg-[#FAF8F4] dark:bg-slate-900 border border-[#E5DEC9] dark:border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={aiConsent}
                onChange={(e) => setAiConsent(e.target.checked)}
                className="w-6 h-6 mt-0.5 accent-[#0D7377]"
              />
              <span className="text-base">
                <strong>Optional AI-Assisted Explanation (Consent):</strong> Also send this message text to Buddy Gemini AI for a plain-language explanation. Deterministic rule checks always run locally even if unchecked.
              </span>
            </label>

            {error && (
              <div role="alert" className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 text-red-900 dark:text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={analyzing || !content.trim()}
              className="w-full min-h-[56px] px-6 py-3.5 rounded-xl bg-[#0F3D5E] hover:bg-[#0B2D47] dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 text-xl font-bold transition-colors disabled:opacity-50"
            >
              {analyzing ? 'Checking Safety Rules...' : 'Analyze for Fraud Signs'}
            </button>
          </form>

          {/* Result Panel */}
          {result && (
            <div className="mt-6 p-6 rounded-2xl border border-[#D8CEB8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {result.riskLevel === 'HIGH' ? (
                    <ShieldAlert className="w-9 h-9 text-red-600 dark:text-red-400" />
                  ) : result.riskLevel === 'MEDIUM' ? (
                    <AlertTriangle className="w-9 h-9 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-9 h-9 text-emerald-700 dark:text-emerald-400" />
                  )}
                  <div>
                    <p className="text-2xl font-bold tabular-nums">
                      Risk Level: {result.riskLevel} ({result.riskScore}/100)
                    </p>
                    <p className="text-sm text-[#4A5A68] dark:text-slate-400">
                      Rule-Based Assessment {result.aiConsentGiven ? '· AI Explanation Included' : '· Local Rules Only'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => speakText(`Risk level ${result.riskLevel}. ${result.ruleExplanation}`)}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-[#D8CEB8] dark:border-slate-700 font-semibold inline-flex items-center gap-2"
                  >
                    <Volume2 className="w-5 h-5" />
                    <span>Read Result</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReport(result.id)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold inline-flex items-center gap-2"
                  >
                    <Flag className="w-5 h-5" />
                    <span>Flag &amp; Report</span>
                  </button>
                </div>
              </div>

              {reportNotice && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-base font-medium">
                  {reportNotice}
                </div>
              )}

              <p className="text-lg leading-relaxed">{result.ruleExplanation}</p>

              {result.triggers.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-bold">Warning Signs Detected:</h3>
                  <ul className="space-y-2">
                    {result.triggers.map((tr, i) => (
                      <li key={i} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-[#E5DEC9] dark:border-slate-700">
                        <p className="font-bold">{tr.category}: {tr.label}</p>
                        <p className="text-base text-[#4A5A68] dark:text-slate-300 mt-1">{tr.guidance}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.aiExplanation && (
                <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-[#0D7377]/40 space-y-1">
                  <p className="text-sm font-bold text-[#0D7377] dark:text-teal-300">AI-Assisted Explanation (Consented)</p>
                  <p className="text-base leading-relaxed whitespace-pre-wrap">{result.aiExplanation}</p>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-lg font-bold">Safe Verification Steps:</h3>
                <ol className="list-decimal pl-6 space-y-1.5 text-base">
                  {result.verificationSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </section>

        {/* Right Reporting Guidance & Scam Education */}
        <aside className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-[#0F3D5E] text-white space-y-4">
            <div className="flex items-center gap-3">
              <PhoneCall className="w-7 h-7 text-teal-300" />
              <h2 className="text-2xl font-bold">Report Indian Cyber Fraud</h2>
            </div>
            <p className="text-lg leading-relaxed text-sky-100">
              If money was transferred or an OTP/PIN was shared, act in the first hour (Golden Hour) to freeze the fraudster account:
            </p>
            <div className="space-y-3">
              <a
                href="tel:1930"
                className="block w-full min-h-[52px] px-5 py-3.5 rounded-xl bg-white text-[#0F3D5E] text-center text-xl font-bold hover:bg-sky-50 transition-colors"
              >
                Call 1930 (Cyber Crime Helpline)
              </a>
              <a
                href="https://cybercrime.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full min-h-[52px] px-5 py-3.5 rounded-xl border border-sky-300 text-white text-center text-lg font-bold hover:bg-white/10 transition-colors"
              >
                Open cybercrime.gov.in Portal
              </a>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#0D7377] dark:text-teal-400" />
              <span>6 Golden Safety Rules</span>
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-base text-[#374754] dark:text-slate-300">
              <li>Never enter your UPI PIN to receive money or refunds.</li>
              <li>Never share OTPs with callers claiming to be bank or courier staff.</li>
              <li>Never install AnyDesk, TeamViewer, or QuickSupport on a caller request.</li>
              <li>"Digital Arrest" over video call does not exist in Indian law.</li>
              <li>Verify KYC or power bill warnings directly inside official apps.</li>
              <li>Do not trust Google Search "Sponsored" ads for customer care numbers.</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 space-y-3">
            <h2 className="text-xl font-bold">Recent Safety Checks</h2>
            {history.length === 0 ? (
              <p className="text-base text-[#4A5A68] dark:text-slate-400">No checks recorded yet.</p>
            ) : (
              <ul className="divide-y divide-[#E5DEC9] dark:divide-slate-800">
                {history.slice(0, 6).map((item) => (
                  <li key={item.id} className="py-3 space-y-1">
                    <div className="flex justify-between items-center text-sm font-bold tabular-nums">
                      <span>{item.input_type.toUpperCase()} · {item.risk_level} ({item.risk_score}/100)</span>
                      <span className="text-[#4A5A68] dark:text-slate-400">
                        {new Date(item.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <p className="text-sm text-[#4A5A68] dark:text-slate-300 truncate">{item.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Bookmark, CheckCircle2, Search, Smartphone, Volume2, Wifi, ShieldAlert, MessageCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiRequest } from '../../lib/api';
import type { Course } from '../../types';

export const AcademyView: React.FC = () => {
  const { language, speakText, stopSpeech, isSpeaking } = useApp();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizFeedback, setQuizFeedback] = useState<string>('');
  const [simWifi, setSimWifi] = useState(false);
  const [simTextLarge, setSimTextLarge] = useState(false);
  const [simStatus, setSimStatus] = useState('Tap any practice action on the virtual phone screen.');
  const [imgErr, setImgErr] = useState(false);
  const [error, setError] = useState('');

  const loadCourses = async () => {
    try {
      const data = await apiRequest<{ courses: Course[] }>('/api/courses');
      setCourses(data.courses);
      if (!selectedId && data.courses.length > 0) {
        setSelectedId(data.courses[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load courses.');
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const categories = ['All', ...Array.from(new Set(courses.map((c) => c.category)))];

  const filtered = courses.filter((c) => {
    if (category === 'Bookmarked' && !c.progress.bookmarked) return false;
    if (category !== 'All' && category !== 'Bookmarked' && c.category !== category) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return `${c.title} ${c.titleHi} ${c.titleMr} ${c.summary} ${c.category}`.toLowerCase().includes(q);
    }
    return true;
  });

  const activeCourse = courses.find((c) => c.id === selectedId) || filtered[0] || null;

  const updateProgress = async (courseId: string, patch: Record<string, unknown>) => {
    try {
      await apiRequest(`/api/courses/${courseId}/progress`, {
        method: 'POST',
        body: JSON.stringify(patch),
      });
      loadCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update learning progress.');
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeCourse || activeCourse.quiz.length === 0) return;
    let correct = 0;
    activeCourse.quiz.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctIndex) correct++;
    });
    const score = Math.round((correct / activeCourse.quiz.length) * 100);
    setQuizFeedback(`You scored ${score}% (${correct} of ${activeCourse.quiz.length} correct).`);
    await updateProgress(activeCourse.id, {
      status: score >= 50 ? 'completed' : 'in_progress',
      progressPercent: score >= 50 ? 100 : 60,
      quizScore: score,
    });
  };

  const displayTitle = (c: Course) => {
    if (language === 'hi' && c.titleHi) return c.titleHi;
    if (language === 'mr' && c.titleMr) return c.titleMr;
    return c.title;
  };

  const completedCount = courses.filter((c) => c.progress.status === 'completed').length;

  return (
    <div className="space-y-8">
      <header className="bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl overflow-hidden grid lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-center gap-3">
          <p className="text-sm font-bold text-[#0D7377] dark:text-teal-300 tabular-nums">
            24 Guided Courses · {completedCount} of {courses.length} Completed
          </p>
          <h1 className="text-3xl font-bold text-[#0F3D5E] dark:text-white">Digital Learning Academy</h1>
          <p className="text-lg text-[#4A5A68] dark:text-slate-300">
            Learn smartphones, WhatsApp, video calls, UPI safety, Google Maps, and fraud defense step by step with audio lessons and hands-on practice.
          </p>
        </div>
        <div className="lg:col-span-4 min-h-[180px] bg-[#F3EFE6] dark:bg-slate-900">
          {!imgErr ? (
            <img
              src="/src/assets/images/academy_digital_learning_1794661355323.jpg"
              alt="Senior gentleman smiling while learning on a smartphone"
              referrerPolicy="no-referrer"
              onError={() => setImgErr(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-6">
              <Smartphone className="w-12 h-12 text-[#0D7377]" />
            </div>
          )}
        </div>
      </header>

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 text-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-[#4A5A68]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search 24 courses (e.g., UPI, WhatsApp, Maps)..."
            className="w-full min-h-[48px] pl-11 pr-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-white dark:bg-[#121F2C] text-lg"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="min-h-[48px] px-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-white dark:bg-[#121F2C] text-base font-bold"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
          <option value="Bookmarked">Bookmarked</option>
        </select>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Course Catalog List */}
        <aside className="lg:col-span-5 bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl p-4 max-h-[75vh] overflow-y-auto space-y-2">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSelectedId(c.id);
                setQuizAnswers({});
                setQuizFeedback('');
                if (c.progress.status === 'not_started') {
                  updateProgress(c.id, { status: 'in_progress', progressPercent: 25 });
                }
              }}
              className={`w-full text-left p-4 rounded-xl border transition-colors ${
                activeCourse?.id === c.id
                  ? 'bg-[#F3EFE6] dark:bg-slate-800 border-[#0D7377] dark:border-teal-400'
                  : 'border-transparent hover:bg-[#FAF8F4] dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-lg font-bold">{displayTitle(c)}</p>
                {c.progress.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-1" />}
              </div>
              <p className="text-sm text-[#4A5A68] dark:text-slate-400 mt-1 tabular-nums">
                {c.category} · {c.difficulty} · {c.durationMinutes} min
                {c.progress.quizScore !== null ? ` · Quiz ${c.progress.quizScore}%` : ''}
              </p>
            </button>
          ))}
        </aside>

        {/* Active Course Lesson + Virtual Smartphone Simulator */}
        <section className="lg:col-span-7 space-y-6">
          {activeCourse && (
            <div className="bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                  <p className="text-sm font-bold text-[#0D7377] dark:text-teal-300">
                    {activeCourse.category} · {activeCourse.difficulty} · {activeCourse.durationMinutes} min
                  </p>
                  <h2 className="text-2xl font-bold mt-1">{displayTitle(activeCourse)}</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      isSpeaking
                        ? stopSpeech()
                        : speakText(`${activeCourse.title}. ${activeCourse.audioScript}`)
                    }
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0D7377] text-white font-bold inline-flex items-center gap-2"
                  >
                    <Volume2 className="w-5 h-5" />
                    <span>{isSpeaking ? 'Stop Audio' : 'Audio Lesson'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateProgress(activeCourse.id, { bookmarked: !activeCourse.progress.bookmarked })}
                    className={`min-h-[44px] px-4 py-2 rounded-xl border font-bold inline-flex items-center gap-2 ${
                      activeCourse.progress.bookmarked
                        ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-400 text-amber-900 dark:text-amber-200'
                        : 'border-[#D8CEB8] dark:border-slate-700'
                    }`}
                  >
                    <Bookmark className="w-5 h-5" />
                    <span>{activeCourse.progress.bookmarked ? 'Saved' : 'Bookmark'}</span>
                  </button>
                </div>
              </div>

              <p className="text-lg leading-relaxed text-[#374754] dark:text-slate-300">{activeCourse.summary}</p>

              <div className="space-y-3">
                <h3 className="text-xl font-bold">Step-by-Step Guide</h3>
                <ol className="list-decimal pl-6 space-y-2.5 text-lg">
                  {activeCourse.steps.map((st, idx) => (
                    <li key={idx}>{st}</li>
                  ))}
                </ol>
              </div>

              {activeCourse.quiz.length > 0 && (
                <div className="pt-5 border-t border-[#E5DEC9] dark:border-slate-800 space-y-4">
                  <h3 className="text-xl font-bold">Quick Understanding Check</h3>
                  {activeCourse.quiz.map((q, qIdx) => (
                    <div key={qIdx} className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-slate-900 border border-[#E5DEC9] dark:border-slate-800 space-y-3">
                      <p className="text-lg font-bold">{q.question}</p>
                      <div className="space-y-2">
                        {q.options.map((opt, oIdx) => (
                          <label key={oIdx} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800">
                            <input
                              type="radio"
                              name={`quiz-${qIdx}`}
                              checked={quizAnswers[qIdx] === oIdx}
                              onChange={() => setQuizAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))}
                              className="w-5 h-5 accent-[#0D7377]"
                            />
                            <span className="text-base">{opt}</span>
                          </label>
                        ))}
                      </div>
                      {quizFeedback && (
                        <p className="text-sm font-medium text-[#0D7377] dark:text-teal-300">{q.explanation}</p>
                      )}
                    </div>
                  ))}

                  {quizFeedback && (
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 font-bold">
                      {quizFeedback}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSubmitQuiz}
                      className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#0F3D5E] text-white font-bold"
                    >
                      Check Quiz &amp; Save Progress
                    </button>
                    <button
                      type="button"
                      onClick={() => updateProgress(activeCourse.id, { status: 'completed', progressPercent: 100 })}
                      className="min-h-[48px] px-5 py-2.5 rounded-xl border border-[#0D7377] text-[#0D7377] dark:text-teal-300 font-bold"
                    >
                      Mark Course Completed
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Virtual Smartphone Tap-and-Practice Simulator */}
          <div className="bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-[#0D7377]" />
              <span>Virtual Smartphone Practice Simulator</span>
            </h3>
            <p className="text-base text-[#4A5A68] dark:text-slate-300">
              Practice safely with zero real-world risk. Tap any button inside this simulated phone screen:
            </p>

            <div className="max-w-sm mx-auto rounded-3xl border-4 border-[#14212B] dark:border-slate-600 bg-[#FAF8F4] dark:bg-slate-900 p-5 space-y-4">
              <div className="flex justify-between items-center text-xs font-mono border-b border-[#E5DEC9] dark:border-slate-800 pb-2">
                <span>10:30 AM</span>
                <span>{simWifi ? 'Wi-Fi: ON' : 'Wi-Fi: OFF'} · 92%</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSimWifi(!simWifi);
                    setSimStatus(!simWifi ? 'Great! Wi-Fi switched ON safely for home browsing.' : 'Wi-Fi switched OFF. Use mobile SIM data for banking.');
                  }}
                  className={`p-3 rounded-xl border font-bold flex flex-col items-center gap-1 ${
                    simWifi ? 'bg-[#0D7377] text-white border-[#0D7377]' : 'bg-white dark:bg-slate-800 border-[#D8CEB8] dark:border-slate-700'
                  }`}
                >
                  <Wifi className="w-6 h-6" />
                  <span className="text-sm">Toggle Wi-Fi</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSimTextLarge(!simTextLarge);
                    setSimStatus(!simTextLarge ? 'Display text enlarged for comfortable reading!' : 'Returned phone sample text to standard size.');
                  }}
                  className="p-3 rounded-xl border bg-white dark:bg-slate-800 border-[#D8CEB8] dark:border-slate-700 font-bold flex flex-col items-center gap-1"
                >
                  <span className="text-xl">Aa</span>
                  <span className="text-sm">Text Size</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSimStatus('WhatsApp Practice: You tapped the green microphone to send a friendly voice greeting to family!')}
                  className="p-3 rounded-xl border bg-white dark:bg-slate-800 border-[#D8CEB8] dark:border-slate-700 font-bold flex flex-col items-center gap-1"
                >
                  <MessageCircle className="w-6 h-6 text-emerald-600" />
                  <span className="text-sm">WhatsApp Voice</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSimStatus('UPI Practice: A stranger asked for your UPI PIN to "send Rs 2000 refund". You tapped DECLINE! Correct—PIN is only for sending money.')}
                  className="p-3 rounded-xl border bg-white dark:bg-slate-800 border-[#D8CEB8] dark:border-slate-700 font-bold flex flex-col items-center gap-1"
                >
                  <ShieldAlert className="w-6 h-6 text-red-600" />
                  <span className="text-sm">Decline Fake PIN</span>
                </button>
              </div>

              <div className={`p-3 rounded-xl bg-white dark:bg-slate-800 border border-[#E5DEC9] dark:border-slate-700 ${simTextLarge ? 'text-lg font-semibold' : 'text-sm'}`}>
                {simStatus}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

import React, { useRef, useState } from 'react';
import { Camera, FileText, Pause, Play, RotateCcw, Square, Upload, Volume2 } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { useApp } from '../../context/AppContext';
import type { AppLanguage } from '../../types';

export const AudioReaderView: React.FC = () => {
  const { language, voiceRate, voiceVolume, updatePreferences, speakText, pauseSpeech, resumeSpeech, stopSpeech, isSpeaking, isPaused } = useApp();
  const [ocrLang, setOcrLang] = useState<AppLanguage>(language);
  const [extractedText, setExtractedText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [error, setError] = useState('');
  const [activeParaIndex, setActiveParaIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const tessLangCode = ocrLang === 'hi' ? 'hin' : ocrLang === 'mr' ? 'mar' : 'eng';

  const runOcrOnSource = async (source: File | Blob | string) => {
    setProcessing(true);
    setOcrProgress(0);
    setError('');
    try {
      const result = await Tesseract.recognize(source, tessLangCode, {
        logger: (m) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });
      const text = result.data.text.trim();
      if (!text) {
        setError('No readable text was detected in this image. Try taking a clearer photo in bright light.');
      } else {
        setExtractedText(text);
        setActiveParaIndex(null);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `OCR reading failed (${err.message}). If Hindi/Marathi language pack failed to download offline, try English or type/paste text below.`
          : 'Unable to extract text from this document.'
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const txt = await file.text();
      setExtractedText(txt);
      setPreviewUrl(null);
      return;
    }

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      await runOcrOnSource(file);
      return;
    }

    setError(`Unsupported file format (${file.type || file.name}). Please upload a clear photo (JPG, PNG, WEBP) or a plain text (.txt) document.`);
  };

  const startCamera = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera capture is not supported in this browser. Please upload a photo instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch {
      setError('Camera permission was denied or no camera was found. Allow camera permission in browser settings or upload an image file.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopCamera();

    const dataUrl = canvas.toDataURL('image/png');
    setPreviewUrl(dataUrl);
    await runOcrOnSource(dataUrl);
  };

  const paragraphs = extractedText
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const readParagraphsFrom = (startIdx: number) => {
    if (startIdx >= paragraphs.length) {
      setActiveParaIndex(null);
      return;
    }
    setActiveParaIndex(startIdx);
    speakText(paragraphs[startIdx], ocrLang, () => {
      readParagraphsFrom(startIdx + 1);
    });
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-[#0F3D5E] dark:text-white">Audio Reader &amp; Document OCR</h1>
        <p className="text-lg text-[#4A5A68] dark:text-slate-300">
          Take a photo or upload a medicine strip, bill, or letter to extract editable text and hear it read aloud clearly.
        </p>
      </header>

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-base font-medium">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Capture & Settings */}
        <section className="lg:col-span-5 bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl p-6 space-y-5">
          <div>
            <label htmlFor="ocr-lang" className="block text-base font-bold mb-2">
              Document &amp; Reading Language
            </label>
            <select
              id="ocr-lang"
              value={ocrLang}
              onChange={(e) => setOcrLang(e.target.value as AppLanguage)}
              className="w-full min-h-[48px] px-4 py-2 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg font-semibold"
            >
              <option value="en">English (eng)</option>
              <option value="hi">Hindi / हिन्दी (hin)</option>
              <option value="mr">Marathi / मराठी (mar)</option>
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[54px] px-4 py-3 rounded-xl bg-[#0F3D5E] hover:bg-[#0B2D47] dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-bold flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              <span>Upload Photo / Txt</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.txt,text/plain"
              onChange={handleFileUpload}
              className="hidden"
            />

            {!cameraOpen ? (
              <button
                type="button"
                onClick={startCamera}
                className="min-h-[54px] px-4 py-3 rounded-xl border border-[#0D7377] text-[#0D7377] dark:text-teal-300 dark:border-teal-400 font-bold flex items-center justify-center gap-2 hover:bg-[#0D7377]/10"
              >
                <Camera className="w-5 h-5" />
                <span>Use Camera</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="min-h-[54px] px-4 py-3 rounded-xl bg-red-600 text-white font-bold flex items-center justify-center gap-2"
              >
                <Square className="w-5 h-5" />
                <span>Close Camera</span>
              </button>
            )}
          </div>

          {cameraOpen && (
            <div className="space-y-3">
              <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl border border-[#E5DEC9] dark:border-slate-700 bg-black" />
              <button
                type="button"
                onClick={capturePhoto}
                className="w-full min-h-[52px] px-5 py-3 rounded-xl bg-[#0D7377] text-white font-bold"
              >
                Capture Photo &amp; Extract Text
              </button>
            </div>
          )}

          {processing && (
            <div className="p-4 rounded-xl bg-[#F3EFE6] dark:bg-slate-800 space-y-2">
              <p className="font-bold tabular-nums">Reading text from image... {ocrProgress}%</p>
              <div className="w-full h-3 bg-white dark:bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-[#0D7377]" style={{ width: `${ocrProgress}%` }} />
              </div>
            </div>
          )}

          {previewUrl && (
            <img
              src={previewUrl}
              alt="Uploaded document preview"
              className="w-full max-h-64 object-contain rounded-xl border border-[#E5DEC9] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900"
            />
          )}

          {/* Voice Playback Controls */}
          <div className="pt-4 border-t border-[#E5DEC9] dark:border-slate-800 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-[#0D7377]" />
              <span>Voice Speed &amp; Volume</span>
            </h2>

            <div>
              <div className="flex justify-between text-sm font-semibold mb-1 tabular-nums">
                <label htmlFor="voice-rate">Reading Speed</label>
                <span>{voiceRate.toFixed(2)}x</span>
              </div>
              <input
                id="voice-rate"
                type="range"
                min={0.6}
                max={1.6}
                step={0.05}
                value={voiceRate}
                onChange={(e) => updatePreferences({ voiceRate: Number(e.target.value) })}
                className="w-full accent-[#0D7377]"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm font-semibold mb-1 tabular-nums">
                <label htmlFor="voice-volume">Volume</label>
                <span>{Math.round(voiceVolume * 100)}%</span>
              </div>
              <input
                id="voice-volume"
                type="range"
                min={0.2}
                max={1.0}
                step={0.1}
                value={voiceVolume}
                onChange={(e) => updatePreferences({ voiceVolume: Number(e.target.value) })}
                className="w-full accent-[#0D7377]"
              />
            </div>
          </div>
        </section>

        {/* Right Extracted Text & Highlighted Reader */}
        <section className="lg:col-span-7 bg-white dark:bg-[#121F2C] border border-[#E5DEC9] dark:border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#0D7377]" />
              <span>Extracted &amp; Editable Text</span>
            </h2>

            <div className="flex flex-wrap gap-2">
              {!isSpeaking ? (
                <button
                  type="button"
                  disabled={!paragraphs.length}
                  onClick={() => readParagraphsFrom(activeParaIndex ?? 0)}
                  className="min-h-[48px] px-4 py-2 rounded-xl bg-[#0D7377] hover:bg-[#0A5A5E] text-white font-bold inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Play className="w-5 h-5" />
                  <span>Play</span>
                </button>
              ) : isPaused ? (
                <button
                  type="button"
                  onClick={resumeSpeech}
                  className="min-h-[48px] px-4 py-2 rounded-xl bg-[#0D7377] text-white font-bold inline-flex items-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  <span>Resume</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={pauseSpeech}
                  className="min-h-[48px] px-4 py-2 rounded-xl bg-amber-600 text-white font-bold inline-flex items-center gap-2"
                >
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </button>
              )}

              <button
                type="button"
                disabled={!isSpeaking}
                onClick={() => {
                  stopSpeech();
                  setActiveParaIndex(null);
                }}
                className="min-h-[48px] px-4 py-2 rounded-xl border border-[#D8CEB8] dark:border-slate-700 font-bold inline-flex items-center gap-2 disabled:opacity-40"
              >
                <Square className="w-5 h-5" />
                <span>Stop</span>
              </button>

              <button
                type="button"
                disabled={!paragraphs.length}
                onClick={() => readParagraphsFrom(0)}
                className="min-h-[48px] px-4 py-2 rounded-xl border border-[#D8CEB8] dark:border-slate-700 font-bold inline-flex items-center gap-2 disabled:opacity-40"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Repeat</span>
              </button>
            </div>
          </div>

          <textarea
            rows={6}
            value={extractedText}
            onChange={(e) => setExtractedText(e.target.value)}
            placeholder="Extracted text appears here—you can also paste or edit any text to hear it read aloud paragraph by paragraph."
            className="w-full p-4 rounded-xl border border-[#CFC6B2] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-900 text-lg leading-relaxed"
          />

          {paragraphs.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold">Tap Any Paragraph to Read From There:</h3>
              <div className="space-y-2">
                {paragraphs.map((para, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => readParagraphsFrom(idx)}
                    className={`w-full text-left p-4 rounded-xl border text-lg leading-relaxed transition-colors ${
                      activeParaIndex === idx
                        ? 'bg-[#0D7377]/15 border-[#0D7377] dark:border-teal-400 font-semibold'
                        : 'bg-[#FAF8F4] dark:bg-slate-900 border-[#E5DEC9] dark:border-slate-800 hover:border-[#0D7377]'
                    }`}
                  >
                    {para}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

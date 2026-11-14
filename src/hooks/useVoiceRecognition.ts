import { useCallback, useRef, useState } from 'react';
import type { AppLanguage } from '../types';

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function useVoiceRecognition(language: AppLanguage) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recRef = useRef<SpeechRecognitionInstance | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    );

  const startListening = useCallback(
    (onFinalText?: (text: string) => void) => {
      setError('');
      if (!isSupported) {
        setError('Voice dictation is not supported in this browser. Please type your message below.');
        return;
      }

      try {
        const Ctor = ((window as unknown as Record<string, unknown>).SpeechRecognition ||
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as new () => SpeechRecognitionInstance;

        const recognition = new Ctor();
        recognition.lang = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';
        recognition.interimResults = true;
        recognition.continuous = false;

        let latestText = '';
        recognition.onresult = (event) => {
          let combined = '';
          for (let i = 0; i < event.results.length; i++) {
            combined += event.results[i][0].transcript;
          }
          latestText = combined.trim();
          setTranscript(latestText);
        };

        recognition.onerror = (event) => {
          setListening(false);
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setError('Microphone permission was denied. Please allow microphone access in your browser settings or type instead.');
          } else if (event.error === 'no-speech') {
            setError('No speech was heard. Please tap Try Again and speak calmly near the microphone.');
          } else {
            setError(`Voice recognition stopped (${event.error}). You can type or retry.`);
          }
        };

        recognition.onend = () => {
          setListening(false);
          if (latestText && onFinalText) {
            onFinalText(latestText);
          }
        };

        recRef.current = recognition;
        setTranscript('');
        setListening(true);
        recognition.start();
      } catch {
        setListening(false);
        setError('Unable to start microphone recognition. Please type your question.');
      }
    },
    [isSupported, language]
  );

  const stopListening = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      // Ignore stop error
    }
    setListening(false);
  }, []);

  return {
    isSupported,
    listening,
    transcript,
    error,
    setTranscript,
    setError,
    startListening,
    stopListening,
  };
}

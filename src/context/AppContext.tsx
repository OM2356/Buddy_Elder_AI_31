import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { TRANSLATIONS } from '../i18n/translations';
import { apiRequest, getAuthToken, setAuthToken } from '../lib/api';
import type { AppLanguage, FontSizeSetting, Profile, SystemStatus, ThemeSetting, User, UserPreferences } from '../types';

interface AppContextValue {
  user: User | null;
  profile: Profile | null;
  preferences: UserPreferences | null;
  system: SystemStatus;
  loading: boolean;
  language: AppLanguage;
  theme: ThemeSetting;
  fontSize: FontSizeSetting;
  highContrast: boolean;
  voiceRate: number;
  voiceVolume: number;
  isSpeaking: boolean;
  isPaused: boolean;
  t: (key: string) => string;
  refreshSession: () => Promise<void>;
  setSessionData: (data: {
    token?: string;
    user: User;
    profile: Profile;
    preferences: UserPreferences;
    system: SystemStatus;
  }) => void;
  logout: () => Promise<void>;
  updatePreferences: (patch: {
    theme?: ThemeSetting;
    fontSize?: FontSizeSetting;
    highContrast?: boolean;
    voiceRate?: number;
    voiceVolume?: number;
    autoReadAloud?: boolean;
    notificationsEnabled?: boolean;
    timezone?: string;
    preferredLanguage?: AppLanguage;
  }) => Promise<void>;
  speakText: (text: string, langOverride?: AppLanguage, onEnd?: () => void) => void;
  pauseSpeech: () => void;
  resumeSpeech: () => void;
  stopSpeech: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [system, setSystem] = useState<SystemStatus>({ geminiAvailable: false, geminiModel: 'gemini-4-hydrogen' });
  const [loading, setLoading] = useState(true);

  const [localLanguage, setLocalLanguage] = useState<AppLanguage>('en');
  const [localTheme, setLocalTheme] = useState<ThemeSetting>('light');
  const [localFontSize, setLocalFontSize] = useState<FontSizeSetting>('normal');
  const [localHighContrast, setLocalHighContrast] = useState(false);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const language: AppLanguage = user?.preferredLanguage || localLanguage;
  const theme: ThemeSetting = (preferences?.theme as ThemeSetting) || localTheme;
  const fontSize: FontSizeSetting = (preferences?.font_size as FontSizeSetting) || localFontSize;
  const highContrast: boolean = preferences ? Boolean(preferences.high_contrast) : localHighContrast;
  const voiceRate: number = preferences?.voice_rate ?? 0.95;
  const voiceVolume: number = preferences?.voice_volume ?? 1.0;

  // Sync HTML root classes for Tailwind v4 dark mode, font sizes, and high contrast
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    root.classList.remove('font-size-normal', 'font-size-large', 'font-size-xlarge');
    root.classList.add(`font-size-${fontSize}`);

    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [theme, fontSize, highContrast]);

  const setSessionData = useCallback(
    (data: { token?: string; user: User; profile: Profile; preferences: UserPreferences; system: SystemStatus }) => {
      if (data.token) {
        setAuthToken(data.token);
      }
      setUser(data.user);
      setProfile(data.profile);
      setPreferences(data.preferences);
      setSystem(data.system);
    },
    []
  );

  const refreshSession = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest<{
        user: User;
        profile: Profile;
        preferences: UserPreferences;
        system: SystemStatus;
      }>('/api/auth/me');
      setSessionData(data);
    } catch {
      setAuthToken(null);
      setUser(null);
      setProfile(null);
      setPreferences(null);
    } finally {
      setLoading(false);
    }
  }, [setSessionData]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const logout = useCallback(async () => {
    stopSpeech();
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // Proceed with local cleanup
    }
    setAuthToken(null);
    setUser(null);
    setProfile(null);
    setPreferences(null);
  }, [stopSpeech]);

  const updatePreferences = useCallback(
    async (patch: {
      theme?: ThemeSetting;
      fontSize?: FontSizeSetting;
      highContrast?: boolean;
      voiceRate?: number;
      voiceVolume?: number;
      autoReadAloud?: boolean;
      notificationsEnabled?: boolean;
      timezone?: string;
      preferredLanguage?: AppLanguage;
    }) => {
      if (patch.theme) setLocalTheme(patch.theme);
      if (patch.fontSize) setLocalFontSize(patch.fontSize);
      if (typeof patch.highContrast === 'boolean') setLocalHighContrast(patch.highContrast);
      if (patch.preferredLanguage) setLocalLanguage(patch.preferredLanguage);

      if (!getAuthToken()) return;
      const data = await apiRequest<{
        user: User;
        profile: Profile;
        preferences: UserPreferences;
        system: SystemStatus;
      }>('/api/auth/preferences', {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      setSessionData(data);
    },
    [setSessionData]
  );

  const speakText = useCallback(
    (text: string, langOverride?: AppLanguage, onEnd?: () => void) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }
      window.speechSynthesis.cancel();
      const targetLang = langOverride || language;
      const bcp47 = targetLang === 'hi' ? 'hi-IN' : targetLang === 'mr' ? 'mr-IN' : 'en-IN';
      const clean = text.replace(/[*#_`>-]/g, ' ').trim();
      if (!clean) return;

      const utt = new SpeechSynthesisUtterance(clean);
      utt.lang = bcp47;
      utt.rate = voiceRate;
      utt.volume = voiceVolume;

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice =
        voices.find((v) => v.lang.toLowerCase() === bcp47.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(targetLang));
      if (matchedVoice) {
        utt.voice = matchedVoice;
      }

      utt.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
      };
      utt.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        if (onEnd) onEnd();
      };
      utt.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };

      utteranceRef.current = utt;
      window.speechSynthesis.speak(utt);
    },
    [language, voiceRate, voiceVolume]
  );

  const pauseSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, []);

  const resumeSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, []);

  const t = useCallback(
    (key: string) => {
      return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
    },
    [language]
  );

  return (
    <AppContext.Provider
      value={{
        user,
        profile,
        preferences,
        system,
        loading,
        language,
        theme,
        fontSize,
        highContrast,
        voiceRate,
        voiceVolume,
        isSpeaking,
        isPaused,
        t,
        refreshSession,
        setSessionData,
        logout,
        updatePreferences,
        speakText,
        pauseSpeech,
        resumeSpeech,
        stopSpeech,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

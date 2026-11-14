export type UserRole = 'senior' | 'caregiver' | 'admin';
export type AppLanguage = 'en' | 'hi' | 'mr';
export type FontSizeSetting = 'normal' | 'large' | 'xlarge';
export type ThemeSetting = 'light' | 'dark';
export type PrivacyLevel = 'PRIVATE' | 'LIMITED' | 'AUTHORIZED';

export type ModuleId =
  | 'dashboard'
  | 'chat'
  | 'scam'
  | 'reader'
  | 'wellness'
  | 'family'
  | 'autonomy'
  | 'academy'
  | 'research'
  | 'reminders'
  | 'emergency'
  | 'caregiver'
  | 'admin'
  | 'settings';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone: string;
  preferredLanguage: AppLanguage;
  createdAt: string;
}

export interface Profile {
  user_id: string;
  age: number | null;
  city: string;
  medical_notes: string;
  blood_group: string;
  allergies: string;
  emergency_instructions: string;
}

export interface UserPreferences {
  user_id: string;
  theme: ThemeSetting;
  font_size: FontSizeSetting;
  high_contrast: number;
  voice_rate: number;
  voice_volume: number;
  auto_read_aloud: number;
  notifications_enabled: number;
  timezone: string;
}

export interface SystemStatus {
  geminiAvailable: boolean;
  geminiModel: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  agent_type: string;
  language: AppLanguage;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  agent_used: string;
  verified: number;
  created_at: string;
}

export interface CourseQuizItem {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Course {
  id: string;
  title: string;
  titleHi: string;
  titleMr: string;
  category: string;
  difficulty: string;
  durationMinutes: number;
  summary: string;
  steps: string[];
  quiz: CourseQuizItem[];
  audioScript: string;
  simulatorTask: string;
  progress: {
    status: 'not_started' | 'in_progress' | 'completed';
    progressPercent: number;
    quizScore: number | null;
    bookmarked: boolean;
    completedAt: string | null;
  };
}

export interface ResearchDocument {
  id: string;
  title: string;
  authors: string;
  year: number;
  category: string;
  source_name: string;
  source_url: string;
  abstract: string;
  key_findings: string;
}

export interface WellnessEntry {
  id: string;
  mood: 'happy' | 'okay' | 'sad' | 'stressed' | 'tired';
  hydration_glasses: number;
  sleep_hours: number;
  activity_minutes: number;
  medication_taken: number;
  notes: string;
  visibility: PrivacyLevel;
  created_at: string;
}

export interface Reminder {
  id: string;
  title: string;
  category: string;
  scheduled_time: string;
  recurrence: 'none' | 'daily' | 'weekly';
  timezone: string;
  completed: number;
  completed_at: string | null;
}

export interface TrustedContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  is_emergency: number;
  priority: number;
}

export interface CaregiverConnection {
  id: string;
  senior_id: string;
  caregiver_id: string | null;
  caregiver_email: string;
  caregiver_name: string;
  linked_caregiver_name?: string;
  senior_name?: string;
  senior_email?: string;
  relationship: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  privacy_level: PrivacyLevel;
  share_wellness: number;
  share_reminders: number;
  share_learning: number;
  share_scam_alerts: number;
  share_emergency: number;
  caregiver_notes: string;
  created_at: string;
}

export interface ConsentEvent {
  id: string;
  module: string;
  action: string;
  decision: 'approved' | 'rejected' | 'revoked';
  details: string;
  created_at: string;
}

import type { EducationLevelCode } from '@/lib/education-system';

/**
 * @deprecated Legacy education level enum. Use V2 system instead.
 */
export type EducationLevel = EducationLevelCode;

/**
 * @deprecated Legacy user role enum. Use V2 system instead.
 */
export type UserRole = 'student' | 'parent' | 'teacher' | 'school_admin' | 'school' | 'admin' | 'super_admin';

/**
 * @deprecated Legacy exam mode. V2 adds 'quiz' mode. Use V2 system instead.
 */
export type ExamMode = 'practice' | 'simulation';

export interface StudyReminder {
  id: string;
  subject: string;
  time: string;
  active: boolean;
}

/**
 * @deprecated Legacy question history tracking. Use V2 submissions system instead.
 */
export interface QuestionHistoryItem {
  questionPartId: string;
  examId: string;
  lastAttempt: string;
  isCorrect: boolean;
  streak: number;
  nextReview: string;
}

/**
 * @deprecated Legacy user interface. Use V2 system instead.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  avatarUrl?: string;
  level?: EducationLevel;
  school?: string;
  dob?: string;
  xp?: number;
  streak?: number;
  achievements?: string[];
  lastExamDate?: string;
  questionHistory?: QuestionHistoryItem[];
  studyReminders?: StudyReminder[];
  phone?: string;
  subscription?: {
    plan: SubscriptionPlan;
    billingHistory: BillingRecord[];
  };
  contactPerson?: string;
}

/**
 * @deprecated LEGACY EXAM INTERFACE - DO NOT USE FOR NEW DEVELOPMENT
 * This interface represents the old exam engine structure which lacked:
 * - Section support
 * - Instruction groups
 * - Context blocks
 * - Teacher review workflows
 * - Answer versioning
 * 
 * Use the V2 exam types from @/types/v2 instead.
 */
export interface Exam {
  id: string;
  title: string;
  subject: string;
  topic?: string;
  year: number;
  level: EducationLevel;
  timeLimit: number;
  questionCount: number;
  avgScore: number;
  isFree: boolean;
  type: 'Past Paper' | 'Practice Paper';
  questions: Question[];
  description?: string;
  pdfSummary?: string;
  explanationPdfUrl?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  /** Country code for regional metadata (e.g., 'UGANDA', 'KENYA') */
  country?: string;
  /** Exam authority for Past Papers (e.g., 'UNEB', 'KNEC', 'NECTA') */
  examAuthority?: string;
  /** Source attribution for Practice Papers (school, institution, or publisher name) */
  source?: string;
  /** Type of source for Practice Papers — e.g. 'school', 'publisher', 'institution' */
  sourceType?: string;
}

/**
 * @deprecated Legacy question part interface. Use V2 Interaction instead.
 */
export interface QuestionPart {
  id: string;
  text: string;
  marks: number;
  answer: string;
  explanation?: string;
  answerType?: 'text' | 'numeric' | 'open-ended';
}

export interface QuestionTable {
  headers: string[];
  rows: string[][];
}

/**
 * @deprecated Legacy question interface. Use V2 Item + Interactions instead.
 */
export interface Question {
  id: string;
  questionNumber: number;
  text: string;
  imageUrl?: string;
  table?: QuestionTable;
  parts: QuestionPart[];
}

/**
 * @deprecated Legacy exam attempt interface. Use V2 ExamAttempt instead.
 */
export interface ExamAttempt {
  subject: string;
  year: number;
  score: number;
  date: string;
}

export interface SubjectPerformance {
  name: string;
  average: number;
  attempts: number;
  improvement: number;
}

export interface WeakArea {
  subject: string;
  average: number;
  topic: string;
}

export interface LinkRequest {
  id: string;
  from: string;
  to: string;
  status: 'pending';
}

export interface LinkedAccount {
  userId1: string;
  userId2: string;
}

export type SubscriptionPlan = 'Free' | 'Premium';

export interface BillingRecord {
  id: string;
  date: string;
  amount: number;
  description: string;
}

export interface Notification {
  id: string;
  userId: string;
  text: string;
  date: string;
  read: boolean;
}

export type PublicPage = 'landing' | 'past-papers' | 'practice-papers' | 'pricing';

export type EducationLevel = 'PLE' | 'UCE' | 'UACE';
export type UserRole = 'student' | 'parent' | 'school' | 'admin';
export type ExamMode = 'practice' | 'simulation';

export interface StudyReminder {
  id: string;
  subject: string;
  time: string;
  active: boolean;
}

export interface QuestionHistoryItem {
  questionPartId: string;
  examId: string;
  lastAttempt: string;
  isCorrect: boolean;
  streak: number;
  nextReview: string;
}

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
}

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

export interface Question {
  id: string;
  questionNumber: number;
  text: string;
  imageUrl?: string;
  table?: QuestionTable;
  parts: QuestionPart[];
}

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

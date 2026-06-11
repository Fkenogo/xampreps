import type { EducationLevelCode } from '@/lib/education-system';

/**
 * XamPreps V2 Type Definitions
 * 
 * This file contains all TypeScript interfaces for the V2 exam engine.
 * These types follow the Firestore schema spec with camelCase naming only.
 * 
 * @module v2
 */

// ============================================================================
// ENUMS - Allowed values for V2 fields
// ============================================================================

/** Education levels supported in the system */
export type V2EducationLevel = EducationLevelCode;

/** User roles with V2-specific additions */
export type V2UserRole = 'student' | 'parent' | 'school' | 'admin' | 'teacher' | 'content_editor';

/** Student exam attempt modes */
export type V2ExamMode = 'practice' | 'quiz' | 'simulation';

/** Exam publication status */
export type V2ExamStatus = 'draft' | 'reviewed' | 'published' | 'revised' | 'archived';

/** Context block types for shared stimulus content */
export type V2ContextBlockType =
  | 'plainText'
  | 'markdown'
  | 'passage'
  | 'poem'
  | 'table'
  | 'image'
  | 'imageSet'
  | 'diagram'
  | 'map'
  | 'compositionPrompt';

/** Item types representing different question formats */
export type V2ItemType =
  | 'singleBlank'
  | 'shortText'
  | 'rewrite'
  | 'mcqSingle'
  | 'mcqMulti'
  | 'trueFalse'
  | 'matching'
  | 'ordering'
  | 'multiPart'
  | 'tableCompletion'
  | 'passageComprehension'
  | 'poemComprehension'
  | 'diagramInterpretation'
  | 'pictureStory'
  | 'essay'
  | 'composition'
  | 'drawingResponse';

/** Response modes for student interactions */
export type V2ResponseMode =
  | 'textShort'
  | 'textLong'
  | 'textarea'
  | 'selectSingle'
  | 'selectMultiple'
  | 'matchPairs'
  | 'orderSequence'
  | 'tableInputs'
  | 'canvasDraw'
  | 'imageUpload'
  | 'fileUpload'
  | 'structuredComposition';

/** Marking modes for auto/hybrid/manual evaluation */
export type V2MarkingMode =
  | 'exactMatch'
  | 'normalizedTextMatch'
  | 'alternativeAnswers'
  | 'keywordBased'
  | 'conceptMatch'
  | 'mcqOptionMatch'
  | 'manualReviewRequired'
  | 'rubricBasedManualReview'
  | 'hybridAutoPlusManual';

/** Item layout modes for rendering */
export type V2ItemLayoutMode = 'single' | 'multiPart' | 'contextDriven' | 'tableDriven' | 'composition';

/** Instruction group display modes */
export type V2InstructionDisplayMode = 'boxed' | 'inline' | 'sticky' | 'highlighted';

/** Submission review status */
export type V2ReviewStatus = 'pending' | 'unanswered' | 'autoMarked' | 'teacherReview' | 'reviewed' | 'flagged';

/** Review task status */
export type V2ReviewTaskStatus = 'pending' | 'assigned' | 'inProgress' | 'completed' | 'escalated';

/** Review task priority */
export type V2ReviewTaskPriority = 'low' | 'normal' | 'high' | 'urgent';

/** Model answer version status */
export type V2ModelAnswerStatus = 'draft' | 'pending_approval' | 'approved' | 'archived';

// ============================================================================
// CORE CONTENT ENTITIES
// ============================================================================

/**
 * Exam - Top-level paper container
 */
export interface V2Exam {
  examId: string;
  title: string;
  subject: string;
  level: V2EducationLevel;
  year: number;
  country: string;
  curriculumVersion: string;
  durationMinutes: number;
  totalMarks: number;
  status: V2ExamStatus;
  overallInstructions?: string;
  sourceFiles?: V2SourceFile[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  createdBy: string;
  updatedBy?: string;
}

/** Source file reference for exam content */
export interface V2SourceFile {
  name: string;
  url: string;
  type: 'pdf' | 'image' | 'doc' | 'docx';
  uploadedAt: Date;
}

/**
 * Section - Major division of the paper
 */
export interface V2Section {
  sectionId: string;
  examId: string;
  title: string;
  orderIndex: number;
  marks: number;
  sharedInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * InstructionGroup - Shared instructions for a range of questions
 */
export interface V2InstructionGroup {
  instructionGroupId: string;
  sectionId: string;
  title: string;
  orderIndex: number;
  questionRangeLabel?: string;
  instructionsMarkdown: string;
  displayMode: V2InstructionDisplayMode;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ContextBlock - Shared stimulus content (passage, poem, table, etc.)
 */
export interface V2ContextBlock {
  contextBlockId: string;
  instructionGroupId?: string;
  itemId?: string;
  type: V2ContextBlockType;
  title?: string;
  contentMarkdown: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Item - A complete question (may contain multiple interactions)
 */
export interface V2Item {
  itemId: string;
  examId: string;
  instructionGroupId?: string;
  contextBlockId?: string;
  orderIndex: number;
  itemType: V2ItemType;
  promptMarkdown: string;
  marks: number;
  required: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interaction - One student response point within an item
 */
export interface V2Interaction {
  interactionId: string;
  itemId: string;
  orderIndex: number;
  label?: string;
  promptMarkdown?: string;
  responseMode: V2ResponseMode;
  marks: number;
  required: boolean;
  validationRules?: V2ValidationRule[];
  markingRuleId?: string;
  rubricId?: string;
  manualReviewDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Validation rule for student input */
export interface V2ValidationRule {
  type: 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: unknown;
  message?: string;
}

// ============================================================================
// MARKING ENTITIES
// ============================================================================

/**
 * MarkingRule - The logic for evaluating one interaction
 */
export interface V2MarkingRule {
  markingRuleId: string;
  markingMode: V2MarkingMode;
  type?: 'strict' | 'flexible';
  exactAnswer?: string;
  acceptedAnswers?: string[];
  alternativeAnswers?: string[];
  acceptedKeywords?: string[];
  conceptGroups?: string[][];
  minimumConceptGroupsRequired?: number;
  allowFullSentenceContainingAnswer?: boolean;
  normalizedMatchConfig?: V2NormalizedMatchConfig;
  normalizationProfile?: V2AnswerNormalizationProfile;
  keywordRules?: V2KeywordRule[];
  regexRules?: V2RegexRule[];
  partialCreditRules?: V2PartialCreditRule[];
  manualReviewRequired: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Configuration for normalized text matching */
export interface V2NormalizedMatchConfig {
  caseSensitive: boolean;
  trimWhitespace: boolean;
  ignorePunctuation: boolean;
  normalizeSpaces: boolean;
}

/** Additional answer normalization controls for short-answer comparison */
export interface V2AnswerNormalizationProfile {
  caseSensitive?: boolean;
  trimWhitespace?: boolean;
  ignorePunctuation?: boolean;
  normalizeSpaces?: boolean;
  normalizeNumeric?: boolean;
  allowUnitOmission?: boolean;
  unitTokens?: string[];
}

/** Keyword-based marking rule */
export interface V2KeywordRule {
  keywords: string[];
  matchMode: 'all' | 'any' | 'none';
  weight?: number;
}

/** Regex-based marking rule */
export interface V2RegexRule {
  pattern: string;
  flags?: string;
  matchMode: 'match' | 'noMatch';
}

/** Partial credit rule for multi-point answers */
export interface V2PartialCreditRule {
  criterion: string;
  points: number;
  description?: string;
}

/**
 * Rubric - Criteria for manual or hybrid marking
 */
export interface V2Rubric {
  rubricId: string;
  title: string;
  criteria: V2RubricCriterion[];
  maxScore: number;
  descriptors: V2RubricDescriptor[];
  feedbackTemplateIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** Individual rubric criterion */
export interface V2RubricCriterion {
  name: string;
  description: string;
  maxPoints: number;
  weight?: number;
}

/** Score descriptor for rubric levels */
export interface V2RubricDescriptor {
  level: number;
  label?: string;
  description: string;
}

/**
 * ModelAnswerVersion - Versioned answer/explanation layer
 */
export interface V2ModelAnswerVersion {
  modelAnswerVersionId: string;
  itemId: string;
  interactionId: string;
  versionNumber: number;
  approvedAnswer: string;
  acceptableAlternatives?: string[];
  explanation?: string;
  teacherNotes?: string;
  status: V2ModelAnswerStatus;
  changeReason?: string;
  updatedBy: string;
  approvedBy?: string;
  createdAt: Date;
}

// ============================================================================
// STUDENT ACTIVITY ENTITIES
// ============================================================================

/**
 * ExamAttempt - One student attempt at an exam
 */
export interface V2ExamAttempt {
  attemptId: string;
  userId: string;
  examId: string;
  mode: V2ExamMode;
  status: 'inProgress' | 'submitted' | 'pending_review' | 'completed' | 'abandoned';
  startedAt: Date;
  submittedAt?: Date;
  completedAt?: Date;
  durationSeconds: number;
  autoScore: number;
  manualScore?: number;
  finalScore: number;
  performanceSummary?: V2PerformanceSummary;
  createdAt: Date;
  updatedAt: Date;
}

/** Performance summary for an attempt */
export interface V2PerformanceSummary {
  totalItems: number;
  correctItems: number;
  partiallyCorrectItems: number;
  incorrectItems: number;
  flaggedForReview: number;
  timePerSection?: Record<string, number>;
}

/**
 * Submission - One student response to an interaction
 */
export interface V2Submission {
  submissionId: string;
  attemptId: string;
  examId: string;
  itemId: string;
  interactionId: string;
  userId: string;
  responsePayload: V2ResponsePayload;
  isAnswered?: boolean;
  autoScore?: number;
  manualScore?: number;
  finalScore?: number;
  autoFeedback?: V2AutoFeedback;
  teacherFeedback?: V2TeacherFeedback;
  reviewStatus: V2ReviewStatus;
  reviewedBy?: string;
  submittedAt: Date;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Student response payload - varies by response mode */
export interface V2ResponsePayload {
  textAnswer?: string | Record<string, string>;
  selectedOptions?: string[];
  matchedPairs?: V2MatchedPair[];
  orderedSequence?: string[];
  tableAnswers?: Record<string, string>;
  uploadedFileUrl?: string;
  drawingRef?: string;
}

/** Matched pair for matching-type interactions */
export interface V2MatchedPair {
  leftId: string;
  rightId: string;
}

/** Auto-generated feedback */
export interface V2AutoFeedback {
  isCorrect: boolean;
  correctAnswer: string;
  explanation?: string;
  acceptableAlternatives?: string[];
  matchedConceptGroups?: number;
  totalConceptGroups?: number;
  matchedConceptTerms?: string[];
  markingModeUsed?: V2MarkingMode | string;
}

/** Teacher-provided feedback */
export interface V2TeacherFeedback {
  comments: string;
  interventionNotes?: string;
  rubricScores?: Record<string, number>;
  partialCreditApplied: boolean;
  teacherId?: string;
  teacherName?: string;
  score?: number;
  reviewedAt?: Date;
}

// ============================================================================
// REVIEW & MANAGEMENT ENTITIES
// ============================================================================

/**
 * ReviewTask - A submission flagged for teacher review
 */
export interface V2ReviewTask {
  reviewTaskId: string;
  submissionId: string;
  interactionId: string;
  examId: string;
  itemId: string;
  userId: string;
  assignedTeacherId?: string;
  reason: string;
  priority: V2ReviewTaskPriority;
  status: V2ReviewTaskStatus;
  teacherComments?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * FeedbackTemplate - Reusable feedback snippets
 */
export interface V2FeedbackTemplate {
  feedbackTemplateId: string;
  title: string;
  subject?: string;
  level?: string;
  templateMarkdown: string;
  category?: string;
  tags?: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type V2AnswerSuggestionIssueType =
  | 'question_wording_issue'
  | 'wrong_or_too_strict_answer_key'
  | 'missing_alternative_answer'
  | 'weak_explanation'
  | 'marking_mode_should_change'
  | 'needs_manual_review_instead_of_auto_mark'
  | 'typo_or_media_issue';

export type V2AnswerSuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'needs_discussion';

export interface V2AnswerSuggestion {
  suggestionId: string;
  examId: string;
  itemId: string;
  interactionId: string;
  markingRuleId?: string | null;
  modelAnswerVersionId?: string | null;
  teacherId: string;
  teacherName: string;
  studentSubmissionId: string;
  reviewTaskId?: string | null;
  issueType: V2AnswerSuggestionIssueType;
  currentQuestionText?: string;
  currentAnswer?: string;
  currentAlternatives?: string[];
  currentExplanation?: string;
  currentMarkingMode?: V2MarkingMode | string | null;
  suggestedAnswer?: string;
  suggestedAlternatives?: string[];
  suggestedExplanation?: string;
  suggestedMarkingMode?: V2MarkingMode | string;
  teacherComment?: string;
  status: V2AnswerSuggestionStatus;
  adminComment?: string;
  appliedModelAnswerVersionId?: string;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

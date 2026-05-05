/**
 * XamPreps V2 Validation Helpers
 * 
 * Provides validation functions for all V2 entities to ensure data integrity
 * before writing to Firestore.
 */

import type {
  V2Exam,
  V2Section,
  V2InstructionGroup,
  V2ContextBlock,
  V2Item,
  V2Interaction,
  V2MarkingRule,
  V2Rubric,
  V2ModelAnswerVersion,
  V2ExamAttempt,
  V2Submission,
  V2ReviewTask,
  V2FeedbackTemplate,
} from '@/types/v2';
import {
  normalizeCountry,
  normalizeCountryAndLevel,
  SUPPORTED_COUNTRIES,
} from '@/lib/education-system';

// ============================================================================
// ALLOWED VALUES - Single source of truth for validation
// ============================================================================

const ALLOWED_USER_ROLES = ['student', 'parent', 'school', 'admin', 'teacher', 'content_editor'] as const;
const ALLOWED_EXAM_MODES = ['practice', 'quiz', 'simulation'] as const;
const ALLOWED_EXAM_STATUSES = ['draft', 'reviewed', 'published', 'revised', 'archived'] as const;
const ALLOWED_CONTEXT_TYPES = ['plainText', 'markdown', 'passage', 'poem', 'table', 'image', 'imageSet', 'diagram', 'map', 'compositionPrompt'] as const;
const ALLOWED_ITEM_TYPES = [
  'singleBlank', 'shortText', 'rewrite', 'mcqSingle', 'mcqMulti', 'trueFalse',
  'matching', 'ordering', 'multiPart', 'tableCompletion', 'passageComprehension',
  'poemComprehension', 'diagramInterpretation', 'pictureStory', 'essay',
  'composition', 'drawingResponse'
] as const;
const ALLOWED_RESPONSE_MODES = [
  'textShort', 'textLong', 'textarea', 'selectSingle', 'selectMultiple',
  'matchPairs', 'orderSequence', 'tableInputs', 'canvasDraw', 'imageUpload',
  'fileUpload', 'structuredComposition'
] as const;
const ALLOWED_MARKING_MODES = [
  'exactMatch', 'normalizedTextMatch', 'alternativeAnswers', 'keywordBased',
  'conceptMatch', 'mcqOptionMatch', 'manualReviewRequired', 'rubricBasedManualReview', 'hybridAutoPlusManual'
] as const;
const ALLOWED_LAYOUT_MODES = ['single', 'multiPart', 'contextDriven', 'tableDriven', 'composition'] as const;
const ALLOWED_INSTRUCTION_DISPLAY_MODES = ['boxed', 'inline', 'sticky', 'highlighted'] as const;
const ALLOWED_REVIEW_STATUSES = ['pending', 'unanswered', 'autoMarked', 'teacherReview', 'reviewed', 'flagged'] as const;
const ALLOWED_REVIEW_TASK_STATUSES = ['pending', 'assigned', 'inProgress', 'completed', 'escalated'] as const;
const ALLOWED_REVIEW_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
const ALLOWED_MODEL_ANSWER_STATUSES = ['draft', 'pending_approval', 'approved', 'archived'] as const;
const ALLOWED_ATTEMPT_STATUSES = ['inProgress', 'submitted', 'completed', 'abandoned'] as const;
const ALLOWED_REVIEW_REASONS = [
  'manualMarkingRequired', 'lowConfidenceAutoMark', 'studentFlagged',
  'teacherEscalated', 'contentIssue', 'appeal'
] as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function isValidEnum(value: string, allowed: readonly string[]): boolean {
  return allowed.includes(value as any);
}

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveNumber(value: unknown): boolean {
  return typeof value === 'number' && value > 0;
}

function isNonNegativeNumber(value: unknown): boolean {
  return typeof value === 'number' && value >= 0;
}

function isDate(value: unknown): boolean {
  return value instanceof Date && !isNaN(value.getTime());
}

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

export interface V2ValidationError {
  field: string;
  message: string;
}

export interface V2ValidationResult {
  valid: boolean;
  errors: V2ValidationError[];
}

function createError(field: string, message: string): V2ValidationError {
  return { field, message };
}

function validResult(): V2ValidationResult {
  return { valid: true, errors: [] };
}

function invalidResult(errors: V2ValidationError[]): V2ValidationResult {
  return { valid: false, errors };
}

// ============================================================================
// EXAM VALIDATION
// ============================================================================

export function validateExam(exam: Partial<V2Exam>): V2ValidationResult {
  const errors: V2ValidationError[] = [];

  if (exam.title && !isNonEmptyString(exam.title)) {
    errors.push(createError('title', 'Title must be a non-empty string'));
  }

  if (exam.subject && !isNonEmptyString(exam.subject)) {
    errors.push(createError('subject', 'Subject must be a non-empty string'));
  }

  if (exam.year && (!isPositiveNumber(exam.year) || exam.year < 2000 || exam.year > 2100)) {
    errors.push(createError('year', 'Year must be a valid year'));
  }

  if (exam.country && !isNonEmptyString(exam.country)) {
    errors.push(createError('country', 'Country must be a non-empty string'));
  } else if (exam.country && !normalizeCountry(exam.country)) {
    errors.push(
      createError(
        'country',
        `Country must be one of: ${SUPPORTED_COUNTRIES.map((country) => country.label).join(', ')}`,
      ),
    );
  }

  if (exam.level) {
    const normalized = normalizeCountryAndLevel({
      country: exam.country,
      level: exam.level,
    });

    if (!normalized.valid) {
      if (exam.country) {
        errors.push(
          createError(
            'level',
            `Level "${exam.level}" is not valid for country "${exam.country}"`,
          ),
        );
      } else {
        errors.push(
          createError(
            'level',
            `Level "${exam.level}" is not valid for legacy Uganda-default records without a country`,
          ),
        );
      }
    }
  }

  if (exam.durationMinutes !== undefined && (!isPositiveNumber(exam.durationMinutes) || exam.durationMinutes < 1)) {
    errors.push(createError('durationMinutes', 'Duration must be a positive number'));
  }

  if (exam.totalMarks !== undefined && (!isPositiveNumber(exam.totalMarks) || exam.totalMarks < 1)) {
    errors.push(createError('totalMarks', 'Total marks must be a positive number'));
  }

  if (exam.status && !isValidEnum(exam.status, ALLOWED_EXAM_STATUSES)) {
    errors.push(createError('status', `Status must be one of: ${ALLOWED_EXAM_STATUSES.join(', ')}`));
  }

  if (exam.version !== undefined && (!isPositiveNumber(exam.version) || exam.version < 1)) {
    errors.push(createError('version', 'Version must be a positive number'));
  }

  if (exam.createdBy && !isNonEmptyString(exam.createdBy)) {
    errors.push(createError('createdBy', 'CreatedBy must be a non-empty string'));
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

// ============================================================================
// SECTION VALIDATION
// ============================================================================

export function validateSection(section: Partial<V2Section>): V2ValidationResult {
  const errors: V2ValidationError[] = [];

  if (!isNonEmptyString(section.examId)) {
    errors.push(createError('examId', 'ExamId is required and must be a non-empty string'));
  }

  if (section.orderIndex !== undefined && (!isNonNegativeNumber(section.orderIndex))) {
    errors.push(createError('orderIndex', 'OrderIndex must be a non-negative number'));
  }

  if (section.title && !isNonEmptyString(section.title)) {
    errors.push(createError('title', 'Title must be a non-empty string'));
  }

  if (section.marks !== undefined && (!isPositiveNumber(section.marks) || section.marks < 0)) {
    errors.push(createError('marks', 'Marks must be a positive number'));
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

// ============================================================================
// INSTRUCTION GROUP VALIDATION
// ============================================================================

export function validateInstructionGroup(group: Partial<V2InstructionGroup>): V2ValidationResult {
  const errors: V2ValidationError[] = [];

  if (!isNonEmptyString(group.examId)) {
    errors.push(createError('examId', 'ExamId is required and must be a non-empty string'));
  }

  if (!isNonEmptyString(group.sectionId)) {
    errors.push(createError('sectionId', 'SectionId is required and must be a non-empty string'));
  }

  if (group.orderIndex !== undefined && !isNonNegativeNumber(group.orderIndex)) {
    errors.push(createError('orderIndex', 'OrderIndex must be a non-negative number'));
  }

  if (!isNonEmptyString(group.instructionsMarkdown)) {
    errors.push(createError('instructionsMarkdown', 'InstructionsMarkdown is required and must be non-empty'));
  }

  if (group.displayMode && !isValidEnum(group.displayMode, ALLOWED_INSTRUCTION_DISPLAY_MODES)) {
    errors.push(createError('displayMode', `DisplayMode must be one of: ${ALLOWED_INSTRUCTION_DISPLAY_MODES.join(', ')}`));
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

// ============================================================================
// CONTEXT BLOCK VALIDATION
// ============================================================================

export function validateContextBlock(block: Partial<V2ContextBlock>): V2ValidationResult {
  const errors: V2ValidationError[] = [];

  if (!isNonEmptyString(block.examId)) {
    errors.push(createError('examId', 'ExamId is required and must be a non-empty string'));
  }

  if (!isValidEnum(block.type as string, ALLOWED_CONTEXT_TYPES)) {
    errors.push(createError('type', `Type must be one of: ${ALLOWED_CONTEXT_TYPES.join(', ')}`));
  }

  // For text-based types, require content
  if (block.type === 'plainText' || block.type === 'passage' || block.type === 'poem') {
    if (!isNonEmptyString(block.contentText) && !isNonEmptyString(block.contentMarkdown)) {
      errors.push(createError('contentText/contentMarkdown', 'Text-based context blocks require content'));
    }
  }

  // For table type, require tableData
  if (block.type === 'table' && !block.tableData) {
    errors.push(createError('tableData', 'Table context blocks require tableData'));
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

// ============================================================================
// ITEM VALIDATION
// ============================================================================

export function validateItem(item: Partial<V2Item>): V2ValidationResult {
  const errors: V2ValidationError[] = [];

  if (!isNonEmptyString(item.examId)) {
    errors.push(createError('examId', 'ExamId is required and must be a non-empty string'));
  }

  if (!isNonEmptyString(item.sectionId)) {
    errors.push(createError('sectionId', 'SectionId is required and must be a non-empty string'));
  }

  if (item.orderIndex !== undefined && !isNonNegativeNumber(item.orderIndex)) {
    errors.push(createError('orderIndex', 'OrderIndex must be a non-negative number'));
  }

  if (!isValidEnum(item.itemType as string, ALLOWED_ITEM_TYPES)) {
    errors.push(createError('itemType', `ItemType must be one of: ${ALLOWED_ITEM_TYPES.join(', ')}`));
  }

  if (item.marksTotal !== undefined && (!isPositiveNumber(item.marksTotal) || item.marksTotal < 0)) {
    errors.push(createError('marksTotal', 'MarksTotal must be a positive number'));
  }

  if (item.layoutMode && !isValidEnum(item.layoutMode, ALLOWED_LAYOUT_MODES)) {
    errors.push(createError('layoutMode', `LayoutMode must be one of: ${ALLOWED_LAYOUT_MODES.join(', ')}`));
  }

  if (item.status && !isValidEnum(item.status, ALLOWED_EXAM_STATUSES)) {
    errors.push(createError('status', `Status must be one of: ${ALLOWED_EXAM_STATUSES.join(', ')}`));
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

// ============================================================================
// INTERACTION VALIDATION
// ============================================================================

export function validateInteraction(interaction: Partial<V2Interaction>): V2ValidationResult {
  const errors: V2ValidationError[] = [];

  if (!isNonEmptyString(interaction.itemId)) {
    errors.push(createError('itemId', 'ItemId is required and must be a non-empty string'));
  }

  if (!isNonEmptyString(interaction.examId)) {
    errors.push(createError('examId', 'ExamId is required and must be a non-empty string'));
  }

  if (interaction.orderIndex !== undefined && !isNonNegativeNumber(interaction.orderIndex)) {
    errors.push(createError('orderIndex', 'OrderIndex must be a non-negative number'));
  }

  if (!isValidEnum(interaction.responseMode as string, ALLOWED_RESPONSE_MODES)) {
    errors.push(createError('responseMode', `ResponseMode must be one of: ${ALLOWED_RESPONSE_MODES.join(', ')}`));
  }

  if (interaction.marks !== undefined && (!isPositiveNumber(interaction.marks) || interaction.marks < 0)) {
    errors.push(createError('marks', 'Marks must be a positive number'));
  }

  if (typeof interaction.required !== 'boolean') {
    errors.push(createError('required', 'Required must be a boolean'));
  }

  if (typeof interaction.manualReviewDefault !== 'boolean') {
    errors.push(createError('manualReviewDefault', 'ManualReviewDefault must be a boolean'));
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

// ============================================================================
// MARKING RULE VALIDATION
// ============================================================================

export function validateMarkingRule(rule: Partial<V2MarkingRule>): V2ValidationResult {
  const errors: V2ValidationError[] = [];

  if (!isValidEnum(rule.markingMode as string, ALLOWED_MARKING_MODES)) {
    errors.push(createError('markingMode', `MarkingMode must be one of: ${ALLOWED_MARKING_MODES.join(', ')}`));
  }

  if (typeof rule.manualReviewRequired !== 'boolean') {
    errors.push(createError('manualReviewRequired', 'ManualReviewRequired must be a boolean'));
  }

  // For exactMatch mode, require exactAnswer
  if (rule.markingMode === 'exactMatch' && !isNonEmptyString(rule.exactAnswer)) {
    errors.push(createError('exactAnswer', 'ExactAnswer is required for exactMatch mode'));
  }

  // For alternativeAnswers mode, require alternativeAnswers array
  if (rule.markingMode === 'alternativeAnswers' && (!Array.isArray(rule.alternativeAnswers) || rule.alternativeAnswers.length === 0)) {
    errors.push(createError('alternativeAnswers', 'AlternativeAnswers array is required for alternativeAnswers mode'));
  }

  if (rule.markingMode === 'conceptMatch') {
    if (!Array.isArray(rule.conceptGroups) || rule.conceptGroups.length === 0) {
      errors.push(createError('conceptGroups', 'ConceptGroups array is required for conceptMatch mode'));
    } else {
      rule.conceptGroups.forEach((group, groupIndex) => {
        if (!Array.isArray(group) || group.length === 0) {
          errors.push(createError(`conceptGroups.${groupIndex}`, 'Each concept group must be a non-empty array'));
          return;
        }
        group.forEach((term, termIndex) => {
          if (!isNonEmptyString(term)) {
            errors.push(createError(`conceptGroups.${groupIndex}.${termIndex}`, 'Concept terms must be non-empty strings'));
          }
        });
      });
    }

    if (!isPositiveNumber(rule.minimumConceptGroupsRequired)) {
      errors.push(createError('minimumConceptGroupsRequired', 'MinimumConceptGroupsRequired must be a positive number for conceptMatch mode'));
    } else if (
      Array.isArray(rule.conceptGroups) &&
      rule.minimumConceptGroupsRequired > rule.conceptGroups.length
    ) {
      errors.push(createError('minimumConceptGroupsRequired', 'MinimumConceptGroupsRequired cannot exceed the number of concept groups'));
    }
  }

  if (rule.acceptedAnswers !== undefined) {
    if (!Array.isArray(rule.acceptedAnswers) || rule.acceptedAnswers.some((answer) => !isNonEmptyString(answer))) {
      errors.push(createError('acceptedAnswers', 'AcceptedAnswers must be an array of non-empty strings'));
    }
  }

  if (rule.acceptedKeywords !== undefined) {
    if (!Array.isArray(rule.acceptedKeywords) || rule.acceptedKeywords.some((keyword) => !isNonEmptyString(keyword))) {
      errors.push(createError('acceptedKeywords', 'AcceptedKeywords must be an array of non-empty strings'));
    }
  }

  if (
    rule.allowFullSentenceContainingAnswer !== undefined &&
    typeof rule.allowFullSentenceContainingAnswer !== 'boolean'
  ) {
    errors.push(createError('allowFullSentenceContainingAnswer', 'AllowFullSentenceContainingAnswer must be a boolean when provided'));
  }

  if (rule.type !== undefined && rule.type !== 'strict' && rule.type !== 'flexible') {
    errors.push(createError('type', 'Type must be either strict or flexible'));
  }

  if (rule.normalizationProfile !== undefined) {
    const profile = rule.normalizationProfile;
    const booleanFields = [
      'caseSensitive',
      'trimWhitespace',
      'ignorePunctuation',
      'normalizeSpaces',
      'normalizeNumeric',
      'allowUnitOmission',
    ] as const;

    booleanFields.forEach((field) => {
      const value = profile[field];
      if (value !== undefined && typeof value !== 'boolean') {
        errors.push(createError(`normalizationProfile.${field}`, `${field} must be a boolean when provided`));
      }
    });

    if (profile.unitTokens !== undefined) {
      if (!Array.isArray(profile.unitTokens) || profile.unitTokens.some((token) => !isNonEmptyString(token))) {
        errors.push(createError('normalizationProfile.unitTokens', 'unitTokens must be an array of non-empty strings'));
      }
    }
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

// ============================================================================
// RUBRIC VALIDATION
// ============================================================================

export function validateRubric(rubric: Partial<V2Rubric>): V2ValidationResult {
  const errors: V2ValidationError[] = [];

  if (!isNonEmptyString(rubric.title)) {
    errors.push(createError('title', 'Title is required and must be non-empty'));
  }

  if (!Array.isArray(rubric.criteria) || rubric.criteria.length === 0) {
    errors.push(createError('criteria', 'Rubric must have at least one criterion'));
  }

  if (rubric.maxScore !== undefined && (!isPositiveNumber(rubric.maxScore) || rubric.maxScore < 1)) {
    errors.push(createError('maxScore', 'MaxScore must be a positive number'));
  }

  // Validate each criterion
  if (Array.isArray(rubric.criteria)) {
    rubric.criteria.forEach((criterion, index) => {
      if (!isNonEmptyString(criterion.name)) {
        errors.push(createError(`criteria[${index}].name`, 'Criterion name is required'));
      }
      if (!isNonEmptyString(criterion.description)) {
        errors.push(createError(`criteria[${index}].description`, 'Criterion description is required'));
      }
      if (criterion.maxPoints !== undefined && (!isPositiveNumber(criterion.maxPoints) || criterion.maxPoints < 1)) {
        errors.push(createError(`criteria[${index}].maxPoints`, 'MaxPoints must be a positive number'));
      }
    });
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

// ============================================================================
// MODEL ANSWER VERSION VALIDATION
// ============================================================================

export function validateModelAnswerVersion(version: Partial<V2ModelAnswerVersion>): V2ValidationResult {
  const errors: V2ValidationError[] = [];

  if (!isNonEmptyString(version.itemId)) {
    errors.push(createError('itemId', 'ItemId is required and must be non-empty'));
  }

  if (!isNonEmptyString(version.interactionId)) {
    errors.push(createError('interactionId', 'InteractionId is required and must be non-empty'));
  }

  if (version.versionNumber !== undefined && (!isPositiveNumber(version.versionNumber) || version.versionNumber < 1)) {
    errors.push(createError('versionNumber', 'VersionNumber must be a positive number'));
  }

  if (!isNonEmptyString(version.approvedAnswer)) {
    errors.push(createError('approvedAnswer', 'ApprovedAnswer is required and must be non-empty'));
  }

  if (version.status && !isValidEnum(version.status, ALLOWED_MODEL_ANSWER_STATUSES)) {
    errors.push(createError('status', `Status must be one of: ${ALLOWED_MODEL_ANSWER_STATUSES.join(', ')}`));
  }

  if (!isNonEmptyString(version.updatedBy)) {
    errors.push(createError('updatedBy', 'UpdatedBy is required and must be non-empty'));
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

// ============================================================================
// EXAM ATTEMPT VALIDATION
// ============================================================================

export function validateExamAttempt(attempt: Partial<V2ExamAttempt>): V2ValidationResult {
  const errors: V2ValidationError[] = [];

  if (!isNonEmptyString(attempt.userId)) {
    errors.push(createError('userId', 'UserId is required and must be non-empty'));
  }

  if (!isNonEmptyString(attempt.examId)) {
    errors.push(createError('examId', 'ExamId is required and must be non-empty'));
  }

  if (attempt.mode && !isValidEnum(attempt.mode, ALLOWED_EXAM_MODES)) {
    errors.push(createError('mode', `Mode must be one of: ${ALLOWED_EXAM_MODES.join(', ')}`));
  }

  if (attempt.status && !isValidEnum(attempt.status, ALLOWED_ATTEMPT_STATUSES)) {
    errors.push(createError('status', `Status must be one of: ${ALLOWED_ATTEMPT_STATUSES.join(', ')}`));
  }

  if (attempt.durationSeconds !== undefined && !isNonNegativeNumber(attempt.durationSeconds)) {
    errors.push(createError('durationSeconds', 'DurationSeconds must be a non-negative number'));
  }

  if (attempt.autoScore !== undefined && !isNonNegativeNumber(attempt.autoScore)) {
    errors.push(createError('autoScore', 'AutoScore must be a non-negative number'));
  }

  if (attempt.finalScore !== undefined && !isNonNegativeNumber(attempt.finalScore)) {
    errors.push(createError('finalScore', 'FinalScore must be a non-negative number'));
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

// ============================================================================
// SUBMISSION VALIDATION
// ============================================================================

export function validateSubmission(submission: Partial<V2Submission>): V2ValidationResult {
  const errors: V2ValidationError[] = [];

  if (!isNonEmptyString(submission.attemptId)) {
    errors.push(createError('attemptId', 'AttemptId is required and must be non-empty'));
  }

  if (!isNonEmptyString(submission.examId)) {
    errors.push(createError('examId', 'ExamId is required and must be non-empty'));
  }

  if (!isNonEmptyString(submission.itemId)) {
    errors.push(createError('itemId', 'ItemId is required and must be non-empty'));
  }

  if (!isNonEmptyString(submission.interactionId)) {
    errors.push(createError('interactionId', 'InteractionId is required and must be non-empty'));
  }

  if (!isNonEmptyString(submission.userId)) {
    errors.push(createError('userId', 'UserId is required and must be non-empty'));
  }

  if (!submission.responsePayload) {
    errors.push(createError('responsePayload', 'ResponsePayload is required'));
  }

  if (submission.reviewStatus && !isValidEnum(submission.reviewStatus, ALLOWED_REVIEW_STATUSES)) {
    errors.push(createError('reviewStatus', `ReviewStatus must be one of: ${ALLOWED_REVIEW_STATUSES.join(', ')}`));
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

// ============================================================================
// REVIEW TASK VALIDATION
// ============================================================================

export function validateReviewTask(task: Partial<V2ReviewTask>): V2ValidationResult {
  const errors: V2ValidationError[] = [];

  if (!isNonEmptyString(task.submissionId)) {
    errors.push(createError('submissionId', 'SubmissionId is required and must be non-empty'));
  }

  if (!isNonEmptyString(task.examId)) {
    errors.push(createError('examId', 'ExamId is required and must be non-empty'));
  }

  if (!isNonEmptyString(task.itemId)) {
    errors.push(createError('itemId', 'ItemId is required and must be non-empty'));
  }

  if (!isNonEmptyString(task.interactionId)) {
    errors.push(createError('interactionId', 'InteractionId is required and must be non-empty'));
  }

  if (!isNonEmptyString(task.userId)) {
    errors.push(createError('userId', 'UserId is required and must be non-empty'));
  }

  if (task.reason && !isValidEnum(task.reason, ALLOWED_REVIEW_REASONS)) {
    errors.push(createError('reason', `Reason must be one of: ${ALLOWED_REVIEW_REASONS.join(', ')}`));
  }

  if (task.priority && !isValidEnum(task.priority, ALLOWED_REVIEW_PRIORITIES)) {
    errors.push(createError('priority', `Priority must be one of: ${ALLOWED_REVIEW_PRIORITIES.join(', ')}`));
  }

  if (task.status && !isValidEnum(task.status, ALLOWED_REVIEW_TASK_STATUSES)) {
    errors.push(createError('status', `Status must be one of: ${ALLOWED_REVIEW_TASK_STATUSES.join(', ')}`));
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

// ============================================================================
// FEEDBACK TEMPLATE VALIDATION
// ============================================================================

export function validateFeedbackTemplate(template: Partial<V2FeedbackTemplate>): V2ValidationResult {
  const errors: V2ValidationError[] = [];

  if (!isNonEmptyString(template.title)) {
    errors.push(createError('title', 'Title is required and must be non-empty'));
  }

  if (!isNonEmptyString(template.text)) {
    errors.push(createError('text', 'Text is required and must be non-empty'));
  }

  if (typeof template.active !== 'boolean') {
    errors.push(createError('active', 'Active must be a boolean'));
  }

  if (!isNonEmptyString(template.createdBy)) {
    errors.push(createError('createdBy', 'CreatedBy is required and must be non-empty'));
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

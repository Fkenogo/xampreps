/**
 * XamPreps V2 Marking Engine Cloud Functions
 * 
 * Handles auto-marking, review task creation, score aggregation,
 * and model answer versioning.
 * 
 * NOTE: This file is imported into the main functions/index.js.
 * The db parameter is passed from the main entry point.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const CALLABLE_OPTIONS = {
  region: "us-central1",
  invoker: "public",
};

const DEFAULT_UNIT_TOKENS = [
  'degree', 'degrees', 'deg', '°c', '°f', '°',
  'ugx', 'rwf', 'kes', 'tzs', 'bif', 'frw', 'usd', 'eur', 'gbp', 'ksh', 'shs',
  'kg', 'kgs', 'g', 'mg', 'lb', 'lbs', 'cm', 'mm', 'km', 'm', 'l', 'ml',
  'percent', '%',
];

const ANSWER_STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'causes', 'from',
  'in', 'into', 'is', 'it', 'of', 'on', 'or', 'the', 'them', 'they', 'to',
  'when', 'with',
]);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(text, profile = {}) {
  if (text === null || text === undefined) return '';

  const {
    trimWhitespace = true,
    caseSensitive = false,
    ignorePunctuation = true,
    normalizeSpaces = true,
  } = profile;

  let normalized = String(text);

  if (trimWhitespace) normalized = normalized.trim();
  if (!caseSensitive) normalized = normalized.toLowerCase();
  if (ignorePunctuation) normalized = normalized.replace(/[.,!?;:'"()]/g, '');
  if (normalizeSpaces) normalized = normalized.replace(/\s+/g, ' ');

  return normalized;
}

function stripConfiguredUnits(text, unitTokens) {
  if (!text) return '';

  const tokens = unitTokens
    .map((token) => normalizeText(token, { caseSensitive: false }))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (tokens.length === 0) {
    return text;
  }

  const tokenPattern = tokens.map(escapeRegExp).join('|');
  const leadingPattern = new RegExp(`^(?:${tokenPattern})\\s+`, 'i');
  const trailingPattern = new RegExp(`\\s+(?:${tokenPattern})$`, 'i');

  let normalized = text.trim();
  let previous = null;

  while (normalized && normalized !== previous) {
    previous = normalized;
    normalized = normalized.replace(leadingPattern, '').replace(trailingPattern, '').trim();
  }

  return normalized;
}

function normalizeNumericText(text) {
  if (!text) return '';

  const compact = text.replace(/,/g, '').trim();
  if (!/^[+-]?\d+(\.\d+)?$/.test(compact)) {
    return text;
  }

  const numeric = Number(compact);
  if (!Number.isFinite(numeric)) {
    return text;
  }

  return String(numeric);
}

function normalizeAnswerToken(token) {
  if (!token) return '';

  const verbForms = {
    absorbs: 'absorb',
    absorbed: 'absorb',
    absorbing: 'absorb',
    absorption: 'absorb',
    evaporates: 'evaporate',
    evaporated: 'evaporate',
    evaporating: 'evaporate',
    evaporation: 'evaporate',
  };

  if (verbForms[token]) return verbForms[token];

  if (
    token.length > 3 &&
    token.endsWith('s') &&
    !token.endsWith('ss') &&
    !token.endsWith('us') &&
    !token.endsWith('is') &&
    !token.endsWith('sis')
  ) {
    return token.slice(0, -1);
  }

  return token;
}

function normalizeAnswer(input) {
  if (input === null || input === undefined) return '';

  return String(input)
    .replace(/[’‘`´]/g, "'")
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"()[\]{}\\/|_`~@#$%^&*+=<>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(normalizeAnswerToken)
    .filter(Boolean)
    .join(' ');
}

function tokenizeNormalizedAnswer(input) {
  return normalizeAnswer(input)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token && !ANSWER_STOPWORDS.has(token));
}

function normalizeAnswerForComparison(text, rule, fallbackProfile = {}) {
  const profile = {
    ...fallbackProfile,
    ...(rule.normalizationProfile || {}),
  };

  const base = normalizeText(text, profile);
  const unitTokens = rule.normalizationProfile?.unitTokens || DEFAULT_UNIT_TOKENS;
  const withoutUnits = profile.allowUnitOmission ? stripConfiguredUnits(base, unitTokens) : base;
  const normalized = profile.normalizeNumeric ? normalizeNumericText(withoutUnits) : withoutUnits;
  return normalizeAnswer(normalized);
}

function getAcceptedAnswers(rule) {
  return [
    rule.exactAnswer,
    ...(rule.acceptedAnswers || []),
    ...(rule.alternativeAnswers || []),
  ].filter((answer) => typeof answer === 'string' && answer.trim().length > 0);
}

function countNormalizedWords(text) {
  const normalized = buildNormalizedText(text);
  if (!normalized) return 0;
  return normalized.split(' ').filter(Boolean).length;
}

function hasFullSentenceContainingAnswer(studentAnswer, rule, acceptedAnswers) {
  if (!shouldAllowFullSentenceContainingAnswer(rule)) {
    return false;
  }

  const normalizedStudentAnswer = buildNormalizedText(studentAnswer);
  const studentWordCount = countNormalizedWords(studentAnswer);
  if (!normalizedStudentAnswer || studentWordCount === 0) {
    return false;
  }

  return acceptedAnswers.some((acceptedAnswer) => {
    const normalizedAcceptedAnswer = buildNormalizedText(acceptedAnswer);
    const acceptedWordCount = countNormalizedWords(acceptedAnswer);
    if (!normalizedAcceptedAnswer || acceptedWordCount === 0 || acceptedWordCount > 3) {
      return false;
    }
    if (studentWordCount <= acceptedWordCount) {
      return false;
    }
    return containsNormalizedPhrase(normalizedStudentAnswer, normalizedAcceptedAnswer);
  });
}

function shouldAllowFullSentenceContainingAnswer(rule) {
  if (rule.allowFullSentenceContainingAnswer === true) {
    return true;
  }
  if (rule.allowFullSentenceContainingAnswer === false) {
    return false;
  }

  if (rule.responseMode !== 'textShort') {
    return false;
  }

  if (rule.manualReviewRequired === true) {
    return false;
  }

  const itemType = rule.itemType || '';
  if (!['singleBlank', 'shortText'].includes(itemType)) {
    return false;
  }

  const promptContext = [
    rule.promptMarkdown,
    rule.promptText,
    rule.itemPromptMarkdown,
    rule.itemStemMarkdown,
    rule.instructionMarkdown,
  ].filter(Boolean).join(' ');

  return /\b(correct form of the word|word given in brackets|one word|one-word|____+|blank|fill in)\b/i.test(promptContext);
}

function isFlexibleRule(rule) {
  return rule.type === 'flexible' || (Array.isArray(rule.acceptedKeywords) && rule.acceptedKeywords.length > 0);
}

function logExactMatchFailure(rule, studentAnswer) {
  if (!isFlexibleRule(rule)) return;
  console.info('[v2AutoMarkSubmission] exact/alias match failed for flexible rule', {
    markingRuleId: rule.markingRuleId || null,
    markingMode: rule.markingMode,
    studentAnswer: normalizeAnswer(studentAnswer),
  });
}

function logKeywordMatchSuccess(rule, studentAnswer, matchedKeywords) {
  console.info('[v2AutoMarkSubmission] keyword fallback match succeeded', {
    markingRuleId: rule.markingRuleId || null,
    markingMode: rule.markingMode,
    studentAnswer: normalizeAnswer(studentAnswer),
    matchedKeywords,
  });
}

function keywordFallbackMatch(studentAnswer, rule) {
  if (!isFlexibleRule(rule)) {
    return { isCorrect: false, matchedKeywords: [] };
  }

  const studentTokens = new Set(tokenizeNormalizedAnswer(studentAnswer));

  if (Array.isArray(rule.acceptedKeywords) && rule.acceptedKeywords.length > 0) {
    const expectedKeywords = rule.acceptedKeywords
      .flatMap((keyword) => tokenizeNormalizedAnswer(keyword))
      .filter(Boolean);
    const matchedKeywords = expectedKeywords.filter((keyword) => studentTokens.has(keyword));
    return {
      isCorrect: expectedKeywords.length > 0 && matchedKeywords.length === expectedKeywords.length,
      matchedKeywords,
    };
  }

  const acceptedAnswers = getAcceptedAnswers(rule);
  for (const acceptedAnswer of acceptedAnswers) {
    const expectedTokens = tokenizeNormalizedAnswer(acceptedAnswer);
    if (expectedTokens.length === 0) continue;
    const matchedKeywords = expectedTokens.filter((keyword) => studentTokens.has(keyword));
    if (matchedKeywords.length === expectedTokens.length) {
      return { isCorrect: true, matchedKeywords };
    }
  }

  return { isCorrect: false, matchedKeywords: [] };
}

function applyKeywordFallback(studentAnswer, rule, baseResult) {
  if (baseResult.isCorrect) return baseResult;

  logExactMatchFailure(rule, studentAnswer);
  const fallback = keywordFallbackMatch(studentAnswer, rule);
  if (!fallback.isCorrect) return baseResult;

  logKeywordMatchSuccess(rule, studentAnswer, fallback.matchedKeywords);

  return {
    ...baseResult,
    isCorrect: true,
    score: rule.marks || 1,
    maxScore: rule.marks || baseResult.maxScore || 1,
    confidence: Math.max(baseResult.confidence || 0, 0.82),
    matchedKeywords: fallback.matchedKeywords,
  };
}

/**
 * Safe MCQ option parsing - handles both array and JSON string formats
 */
function parseMcqOptions(exactAnswer) {
  if (Array.isArray(exactAnswer)) {
    return exactAnswer;
  }
  if (typeof exactAnswer === 'string') {
    try {
      const parsed = JSON.parse(exactAnswer);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      // Try comma-separated
      return exactAnswer.split(',').map(s => s.trim());
    }
  }
  return [];
}

/**
 * Exact match marking
 */
function markExactMatch(studentAnswer, rule) {
  const normalized = normalizeAnswerForComparison(studentAnswer, rule, {
    trimWhitespace: true,
    caseSensitive: false,
    ignorePunctuation: true,
    normalizeSpaces: true,
    normalizeNumeric: false,
    allowUnitOmission: false,
  });
  const acceptedAnswers = getAcceptedAnswers(rule);
  const isCorrect = acceptedAnswers.some((acceptedAnswer) => (
    normalizeAnswerForComparison(acceptedAnswer, rule, {
      trimWhitespace: true,
      caseSensitive: false,
      ignorePunctuation: true,
      normalizeSpaces: true,
      normalizeNumeric: false,
      allowUnitOmission: false,
    }) === normalized
  )) || hasFullSentenceContainingAnswer(studentAnswer, rule, acceptedAnswers);

  return applyKeywordFallback(studentAnswer, rule, {
    isCorrect,
    score: isCorrect ? (rule.marks || 1) : 0,
    maxScore: rule.marks || 1,
    confidence: 1.0
  });
}

/**
 * Normalized text match marking
 */
function markNormalizedMatch(studentAnswer, rule) {
  const config = rule.normalizedMatchConfig || {};
  const normalizedAnswer = normalizeAnswerForComparison(studentAnswer, rule, {
    trimWhitespace: config.trimWhitespace !== false,
    caseSensitive: config.caseSensitive === true,
    ignorePunctuation: config.ignorePunctuation !== false,
    normalizeSpaces: config.normalizeSpaces !== false,
    normalizeNumeric: true,
    allowUnitOmission: false,
  });
  const acceptedAnswers = getAcceptedAnswers(rule);
  const isCorrect = acceptedAnswers.some((acceptedAnswer) => (
    normalizeAnswerForComparison(acceptedAnswer, rule, {
      trimWhitespace: config.trimWhitespace !== false,
      caseSensitive: config.caseSensitive === true,
      ignorePunctuation: config.ignorePunctuation !== false,
      normalizeSpaces: config.normalizeSpaces !== false,
      normalizeNumeric: true,
      allowUnitOmission: false,
    }) === normalizedAnswer
  ));

  return applyKeywordFallback(studentAnswer, rule, {
    isCorrect,
    score: isCorrect ? (rule.marks || 1) : 0,
    maxScore: rule.marks || 1,
    confidence: 0.9
  });
}

/**
 * Alternative answers marking
 */
function markAlternativeAnswers(studentAnswer, rule) {
  const normalized = normalizeAnswerForComparison(studentAnswer, rule, {
    trimWhitespace: true,
    caseSensitive: false,
    ignorePunctuation: true,
    normalizeSpaces: true,
    normalizeNumeric: true,
    allowUnitOmission: false,
  });
  const alternatives = getAcceptedAnswers(rule);
  
  for (const alt of alternatives) {
    if (normalizeAnswerForComparison(alt, rule, {
      trimWhitespace: true,
      caseSensitive: false,
      ignorePunctuation: true,
      normalizeSpaces: true,
      normalizeNumeric: true,
      allowUnitOmission: false,
    }) === normalized) {
      return {
        isCorrect: true,
        score: rule.marks || 1,
        maxScore: rule.marks || 1,
        confidence: 0.95
      };
    }
  }

  if (hasFullSentenceContainingAnswer(studentAnswer, rule, alternatives)) {
    return {
      isCorrect: true,
      score: rule.marks || 1,
      maxScore: rule.marks || 1,
      confidence: 0.92,
      matchedBy: 'fullSentenceContainingAnswer'
    };
  }

  return applyKeywordFallback(studentAnswer, rule, {
    isCorrect: false,
    score: 0,
    maxScore: rule.marks || 1,
    confidence: 0.95
  });
}

function withMarkingMode(result, markingMode) {
  return {
    ...result,
    markingModeUsed: markingMode,
  };
}

/**
 * Keyword-based marking
 */
function markKeywordBased(studentAnswer, rule) {
  const normalized = normalizeText(studentAnswer);
  const keywordRules = rule.keywordRules || [];
  let totalPoints = 0;
  let maxPoints = 0;
  const matchedKeywords = [];

  for (const kwRule of keywordRules) {
    const matchMode = kwRule.matchMode || 'any';
    const keywords = kwRule.keywords || [];
    const weight = kwRule.weight || 1;
    maxPoints += weight;

    if (matchMode === 'all') {
      const allMatch = keywords.every(kw => normalized.includes(normalizeText(kw)));
      if (allMatch) {
        totalPoints += weight;
        matchedKeywords.push(...keywords);
      }
    } else if (matchMode === 'any') {
      const anyMatch = keywords.some(kw => normalized.includes(normalizeText(kw)));
      if (anyMatch) {
        totalPoints += weight;
      }
    } else if (matchMode === 'none') {
      const noneMatch = keywords.every(kw => !normalized.includes(normalizeText(kw)));
      if (noneMatch) {
        totalPoints += weight;
      }
    }
  }

  return {
    isCorrect: totalPoints >= maxPoints * 0.5,
    score: totalPoints,
    maxScore: maxPoints,
    confidence: 0.7,
    matchedKeywords,
    requiresManualReview: totalPoints > 0 && totalPoints < maxPoints
  };
}

/**
 * Build normalized text for concept matching
 * Lowercase, trim, remove punctuation, collapse whitespace
 */
function buildNormalizedText(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/[’‘`´]/g, "'")
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"()[\]{}\\/|_~@#$%^&*+=<>-]/g, ' ')
    .replace(/\s+/g, ' ');
}

function containsNormalizedPhrase(normalizedAnswer, normalizedPhrase) {
  if (!normalizedAnswer || !normalizedPhrase) return false;
  return ` ${normalizedAnswer} `.includes(` ${normalizedPhrase} `);
}

function omitUndefined(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  );
}

/**
 * Concept-based semantic matching for comprehension/open-ended factual questions
 * 
 * Logic:
 * - Normalize the student answer
 * - For each conceptGroup (array of keyword/phrase variants), check if ANY variant is found
 * - Count how many concept groups were matched
 * - Mark correct if matchedGroups >= minimumConceptGroupsRequired
 * 
 * This allows students to express the same concept in different ways while still
 * requiring them to demonstrate understanding of the key ideas.
 */
function markConceptMatch(studentAnswer, rule) {
  const conceptGroups = normalizeConceptGroups(rule.conceptGroups);
  const minimumRequired = rule.minimumConceptGroupsRequired || conceptGroups.length;
  
  if (conceptGroups.length === 0) {
    return {
      isCorrect: false,
      score: 0,
      maxScore: rule.marks || 1,
      confidence: 0,
      reason: 'no_concept_groups_defined'
    };
  }

  const normalizedAnswer = buildNormalizedText(studentAnswer);
  let matchedGroups = 0;
  const matchedGroupIndices = [];
  const matchedConceptTerms = [];

  for (let i = 0; i < conceptGroups.length; i++) {
    const group = conceptGroups[i];
    if (!Array.isArray(group) || group.length === 0) continue;

    // Check if ANY keyword/phrase in this group is found in the answer
    const matchedTerm = group.find(keyword => {
      const normalizedKeyword = buildNormalizedText(keyword);
      if (!normalizedKeyword) return false;
      return containsNormalizedPhrase(normalizedAnswer, normalizedKeyword);
    });

    if (matchedTerm) {
      matchedGroups++;
      matchedGroupIndices.push(i);
      matchedConceptTerms.push(matchedTerm);
    }
  }

  const totalGroups = conceptGroups.length;
  const isCorrect = matchedGroups >= minimumRequired;
  const score = isCorrect ? (rule.marks || 1) : 0;

  return {
    isCorrect,
    score,
    maxScore: rule.marks || 1,
    confidence: totalGroups > 0 ? Math.round((matchedGroups / totalGroups) * 100) / 100 : 0,
    matchedConceptGroups: matchedGroups,
    totalConceptGroups: totalGroups,
    matchedConceptTerms,
    markingModeUsed: 'conceptMatch',
    matchedGroupIndices
  };
}

function normalizeConceptGroups(conceptGroups) {
  if (Array.isArray(conceptGroups)) {
    return conceptGroups;
  }

  if (conceptGroups && typeof conceptGroups === 'object') {
    return Object.keys(conceptGroups)
      .sort((left, right) => Number(left) - Number(right))
      .map((key) => conceptGroups[key])
      .filter((group) => Array.isArray(group));
  }

  return [];
}

/**
 * MCQ option match marking - uses safe parsing
 */
function markMcqOptionMatch(selectedOptions, rule) {
  const correctOptions = parseMcqOptions(rule.exactAnswer);
  const selected = Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions];
  
  const allCorrect = selected.length === correctOptions.length && 
    selected.every(opt => correctOptions.includes(opt));

  return {
    isCorrect: allCorrect,
    score: allCorrect ? (rule.marks || 1) : 0,
    maxScore: rule.marks || 1,
    confidence: 1.0
  };
}

function markManualReviewRequired(rule, reason = 'manualReviewRequired') {
  return {
    isCorrect: false,
    score: 0,
    maxScore: rule.marks || 1,
    requiresManualReview: true,
    confidence: 0,
    reason,
    markingModeUsed: reason,
  };
}

async function createOrReuseReviewTask(db, { submissionId, interaction, userId, confidence }) {
  const attemptId = typeof submissionId === 'string' && submissionId.includes('__') ? submissionId.split('__')[0] : null;
  const existingTasks = await db.collection('review_tasks')
    .where('submissionId', '==', submissionId)
    .limit(5)
    .get();

  const reusableTask = existingTasks.docs.find((doc) => {
    const data = doc.data();
    return data.interactionId === interaction.interactionId &&
      data.status !== 'completed';
  });

  const taskData = {
    submissionId,
    attemptId,
    interactionId: interaction.interactionId,
    examId: interaction.examId,
    itemId: interaction.itemId,
    userId,
    user_id: userId,
    uid: userId,
    studentId: userId,
    student_id: userId,
    reason: 'manualMarkingRequired',
    priority: confidence < 0.5 ? 'high' : 'normal',
    status: 'pending',
    updatedAt: admin.firestore.Timestamp.now()
  };

  if (reusableTask) {
    await reusableTask.ref.update(taskData);
    return reusableTask.id;
  }

  const created = await db.collection('review_tasks').add({
    ...taskData,
    createdAt: admin.firestore.Timestamp.now(),
  });
  return created.id;
}

function isAdminRole(role) {
  return role === 'admin' || role === 'super_admin' || role === 'content_editor';
}

function isTeacherRole(role) {
  return role === 'teacher' || isAdminRole(role);
}

function getCallableRole(request) {
  return request.auth?.token?.role || request.auth?.token?.primaryRole || null;
}

async function resolveCallableRole(db, request) {
  const tokenRole = getCallableRole(request);
  if (tokenRole) return tokenRole;

  const uid = request.auth?.uid;
  if (!uid) return null;

  const [userSnap, roleSnap] = await Promise.all([
    db.collection('users').doc(uid).get().catch((error) => {
      console.warn('[v2ReviewQueue] Failed to read users role fallback', {
        uid,
        code: error?.code || null,
        message: error?.message || String(error),
      });
      return null;
    }),
    db.collection('user_roles').doc(uid).get().catch((error) => {
      console.warn('[v2ReviewQueue] Failed to read user_roles fallback', {
        uid,
        code: error?.code || null,
        message: error?.message || String(error),
      });
      return null;
    }),
  ]);

  return userSnap?.data()?.primaryRole || roleSnap?.data()?.role || null;
}

function getCallableDisplayName(request) {
  return request.auth?.token?.name ||
    request.auth?.token?.displayName ||
    request.auth?.token?.email ||
    request.auth?.uid ||
    'Teacher';
}

async function getAllowedStudentIdsForTeacher(db, teacherUid) {
  const directLinksSnap = await db.collection('teacher_student_links')
    .where('teacherUid', '==', teacherUid)
    .where('status', '==', 'active')
    .get();

  const studentIds = new Set(
    directLinksSnap.docs
      .map((doc) => doc.data()?.studentUid)
      .filter((uid) => typeof uid === 'string' && uid.trim().length > 0)
  );

  const schoolLinksSnap = await db.collection('teacher_school_links')
    .where('teacherUid', '==', teacherUid)
    .where('status', '==', 'active')
    .get();

  for (const schoolLinkDoc of schoolLinksSnap.docs) {
    const schoolId = schoolLinkDoc.data()?.schoolId;
    if (typeof schoolId !== 'string' || !schoolId) continue;

    const schoolStudentsSnap = await db.collection('school_student_links')
      .where('schoolId', '==', schoolId)
      .where('status', '==', 'active')
      .get();

    schoolStudentsSnap.docs.forEach((doc) => {
      const studentUid = doc.data()?.studentUid;
      if (typeof studentUid === 'string' && studentUid.trim()) {
        studentIds.add(studentUid);
      }
    });
  }

  return studentIds;
}

function getTaskStudentId(task) {
  return [task.userId, task.user_id, task.uid, task.studentId, task.student_id]
    .find((value) => typeof value === 'string' && value.trim().length > 0) || null;
}

function firstNonEmptyString(...values) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0) || '';
}

function getSubmissionAttemptId(submission) {
  return firstNonEmptyString(
    submission.attemptId,
    submission.attempt_id,
    typeof submission.id === 'string' && submission.id.includes('__') ? submission.id.split('__')[0] : ''
  );
}

function getSubmissionScore(submission) {
  const values = [submission.finalScore, submission.final_score, submission.manualScore, submission.manual_score, submission.autoScore, submission.auto_score];
  return values.find((value) => typeof value === 'number' && Number.isFinite(value));
}

function formatSubmissionAnswer(responsePayload) {
  if (!responsePayload || typeof responsePayload !== 'object') return 'No answer submitted';
  if (typeof responsePayload.textAnswer === 'string') return responsePayload.textAnswer || 'No answer submitted';
  if (responsePayload.textAnswer && typeof responsePayload.textAnswer === 'object') {
    return Object.entries(responsePayload.textAnswer)
      .map(([key, value]) => `${key}: ${String(value || '')}`)
      .join('\n');
  }
  if (Array.isArray(responsePayload.selectedOptions)) return responsePayload.selectedOptions.join(', ');
  if (responsePayload.tableAnswers && typeof responsePayload.tableAnswers === 'object') {
    return Object.entries(responsePayload.tableAnswers)
      .map(([key, value]) => `${key}: ${String(value || '')}`)
      .join('\n');
  }
  if (responsePayload.uploadedFileUrl) return String(responsePayload.uploadedFileUrl);
  return 'Answer saved in a structured format.';
}

async function writeTeacherReviewAction(db, action) {
  const actionRef = db.collection('teacher_review_actions').doc();
  const now = admin.firestore.Timestamp.now();
  await actionRef.set({
    actionId: actionRef.id,
    actionType: action.actionType || 'review_save',
    examId: action.examId || null,
    attemptId: action.attemptId || null,
    submissionId: action.submissionId || null,
    itemId: action.itemId || null,
    interactionId: action.interactionId || null,
    studentId: action.studentId || null,
    studentName: action.studentName || '',
    teacherId: action.teacherId || null,
    teacherName: action.teacherName || '',
    previousScore: typeof action.previousScore === 'number' ? action.previousScore : null,
    newScore: typeof action.newScore === 'number' ? action.newScore : null,
    previousReviewStatus: action.previousReviewStatus || null,
    newReviewStatus: action.newReviewStatus || null,
    comment: action.comment || '',
    suggestionId: action.suggestionId || null,
    questionLabel: action.questionLabel || '',
    sourceReference: action.sourceReference || '',
    studentAnswer: action.studentAnswer || '',
    officialAnswer: action.officialAnswer || '',
    suggestedAnswer: action.suggestedAnswer || '',
    suggestedExplanation: action.suggestedExplanation || '',
    suggestedMarkingMode: action.suggestedMarkingMode || '',
    status: action.status || 'recorded',
    createdAt: now,
  });
  return actionRef.id;
}

async function teacherCanAccessStudent(db, teacherUid, studentUid) {
  if (!teacherUid || !studentUid) return false;
  const allowedStudentIds = await getAllowedStudentIdsForTeacher(db, teacherUid);
  return allowedStudentIds.has(studentUid);
}

async function assertTeacherCanAccessSubmission(db, request, submission) {
  const role = await resolveCallableRole(db, request);
  if (isAdminRole(role)) return;
  if (!isTeacherRole(role)) {
    throw new HttpsError('permission-denied', 'Teacher access required');
  }

  const submissionStudentId = getTaskStudentId(submission);
  const allowed = await teacherCanAccessStudent(db, request.auth.uid, submissionStudentId);
  if (!allowed) {
    throw new HttpsError('permission-denied', 'This submission is not assigned to your roster or school.');
  }
}

function toPlainDoc(docSnap) {
  return docSnap.exists ? { id: docSnap.id, ...docSnap.data() } : null;
}

async function getLatestModelAnswer(db, interactionId) {
  if (!interactionId) return null;
  const snapshot = await db.collection('model_answer_versions')
    .where('interactionId', '==', interactionId)
    .orderBy('versionNumber', 'desc')
    .limit(1)
    .get();
  return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

async function hydrateReviewTask(db, taskDoc) {
  const task = { id: taskDoc.id, ...taskDoc.data() };
  const studentId = getTaskStudentId(task);
  const [submissionSnap, examSnap, itemSnap, interactionSnap, studentSnap] = await Promise.all([
    task.submissionId ? db.collection('submissions').doc(task.submissionId).get() : Promise.resolve(null),
    task.examId ? db.collection('exams').doc(task.examId).get() : Promise.resolve(null),
    task.itemId ? db.collection('items').doc(task.itemId).get() : Promise.resolve(null),
    task.interactionId ? db.collection('interactions').doc(task.interactionId).get() : Promise.resolve(null),
    studentId ? db.collection('users').doc(studentId).get() : Promise.resolve(null),
  ]);
  const interaction = interactionSnap ? toPlainDoc(interactionSnap) : null;
  const markingRuleSnap = interaction?.markingRuleId
    ? await db.collection('marking_rules').doc(interaction.markingRuleId).get()
    : null;
  const modelAnswer = await getLatestModelAnswer(db, task.interactionId);

  return {
    ...task,
    submission: submissionSnap ? toPlainDoc(submissionSnap) : null,
    exam: examSnap ? toPlainDoc(examSnap) : null,
    item: itemSnap ? toPlainDoc(itemSnap) : null,
    interaction,
    markingRule: markingRuleSnap ? toPlainDoc(markingRuleSnap) : null,
    modelAnswer,
    student: studentSnap ? toPlainDoc(studentSnap) : null,
  };
}

async function aggregateAttemptScoresForAttempt(db, attemptId) {
  const submissionSnapshots = await Promise.all([
    db.collection('submissions').where('attemptId', '==', attemptId).get(),
    db.collection('submissions').where('attempt_id', '==', attemptId).get(),
  ]);
  const submissionsById = new Map();
  submissionSnapshots.forEach((snapshot) => {
    snapshot.docs.forEach((doc) => submissionsById.set(doc.id, doc));
  });

  let autoScore = 0;
  let manualScore = 0;
  let finalScore = 0;
  let maxScore = 0;
  let allReviewed = true;

  for (const doc of submissionsById.values()) {
    const submission = doc.data();
    const interactionId = submission.interactionId || submission.interaction_id;
    const interactionDoc = interactionId ? await db.collection('interactions').doc(interactionId).get() : null;
    const interaction = interactionDoc?.exists ? interactionDoc.data() : null;

    const itemMaxScore = interaction?.marks || submission.maxScore || submission.max_score || 1;
    maxScore += itemMaxScore;

    if (submission.reviewStatus === 'teacherReview' || submission.review_status === 'teacherReview') {
      allReviewed = false;
    }

    if (submission.finalScore !== undefined && submission.finalScore !== null) {
      finalScore += submission.finalScore;
    } else if (submission.final_score !== undefined && submission.final_score !== null) {
      finalScore += submission.final_score;
    } else if (submission.reviewStatus !== 'unanswered' && submission.review_status !== 'unanswered') {
      allReviewed = false;
    }

    if (submission.autoScore !== undefined && submission.autoScore !== null) {
      autoScore += submission.autoScore;
    } else if (submission.auto_score !== undefined && submission.auto_score !== null) {
      autoScore += submission.auto_score;
    }

    if (submission.manualScore !== undefined && submission.manualScore !== null) {
      manualScore += submission.manualScore;
    } else if (submission.manual_score !== undefined && submission.manual_score !== null) {
      manualScore += submission.manual_score;
    }
  }

  const now = admin.firestore.Timestamp.now();
  await db.collection('exam_attempts').doc(attemptId).update({
    autoScore,
    manualScore: manualScore || null,
    finalScore,
    maxScore,
    status: allReviewed ? 'completed' : 'pending_review',
    completedAt: allReviewed ? now : null,
    updatedAt: now
  });

  return {
    attemptId,
    autoScore,
    manualScore: manualScore || null,
    finalScore,
    maxScore,
    percentage: maxScore > 0 ? Math.round((finalScore / maxScore) * 100) : 0,
    allReviewed
  };
}

function normalizeSuggestionIssueType(issueType) {
  const allowed = new Set([
    'question_wording_issue',
    'wrong_or_too_strict_answer_key',
    'missing_alternative_answer',
    'weak_explanation',
    'marking_mode_should_change',
    'needs_manual_review_instead_of_auto_mark',
    'typo_or_media_issue',
  ]);
  return allowed.has(issueType) ? issueType : 'wrong_or_too_strict_answer_key';
}

/**
 * Create V2 marking functions with database access
 */
function createV2MarkingFunctions(db) {

  /**
   * Auto-mark a submission
   */
  const autoMarkSubmission = onCall(CALLABLE_OPTIONS, async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { submissionId, interactionId, responsePayload } = request.data;

    if (!submissionId || !interactionId || !responsePayload) {
      throw new HttpsError('invalid-argument', 'Missing required parameters');
    }

    try {
      const interactionDoc = await db.collection('interactions').doc(interactionId).get();

      if (!interactionDoc.exists) {
        throw new HttpsError('not-found', 'Interaction not found');
      }

      const interaction = interactionDoc.data();

      let item = null;
      let instructionGroup = null;
      if (interaction.itemId) {
        const itemDoc = await db.collection('items').doc(interaction.itemId).get();
        if (itemDoc.exists) {
          item = itemDoc.data();
          if (item.instructionGroupId) {
            const instructionGroupDoc = await db.collection('instruction_groups').doc(item.instructionGroupId).get();
            if (instructionGroupDoc.exists) {
              instructionGroup = instructionGroupDoc.data();
            }
          }
        }
      }
      
      let markingRule = null;
      if (interaction.markingRuleId) {
        const ruleDoc = await db.collection('marking_rules').doc(interaction.markingRuleId).get();
        if (ruleDoc.exists) {
          markingRule = ruleDoc.data();
        }
      }

      if (!markingRule) {
        return {
          submissionId,
          autoScore: 0,
          requiresManualReview: true,
          confidence: 0,
          reason: 'no_marking_rule'
        };
      }

      const effectiveRule = {
        ...markingRule,
        marks: typeof markingRule.marks === 'number' ? markingRule.marks : (interaction.marks || 1),
        responseMode: interaction.responseMode,
        promptMarkdown: interaction.promptMarkdown,
        promptText: interaction.promptText,
        itemType: item?.itemType,
        itemPromptMarkdown: item?.promptMarkdown,
        itemStemMarkdown: item?.stemMarkdown,
        instructionMarkdown: instructionGroup?.instructionsMarkdown,
      };

      let studentAnswer;
      switch (interaction.responseMode) {
        case 'textShort':
        case 'textLong':
        case 'textarea':
          studentAnswer = responsePayload.textAnswer || '';
          break;
        case 'selectSingle':
        case 'selectMultiple':
          studentAnswer = responsePayload.selectedOptions || [];
          break;
        default:
          studentAnswer = responsePayload;
      }

      let result;
      switch (effectiveRule.markingMode) {
        case 'exactMatch':
          result = withMarkingMode(markExactMatch(studentAnswer, effectiveRule), 'exactMatch');
          break;
        case 'normalizedTextMatch':
          result = withMarkingMode(markNormalizedMatch(studentAnswer, effectiveRule), 'normalizedTextMatch');
          break;
        case 'alternativeAnswers':
          result = withMarkingMode(markAlternativeAnswers(studentAnswer, effectiveRule), 'alternativeAnswers');
          break;
        case 'keywordBased':
          result = withMarkingMode(markKeywordBased(studentAnswer, effectiveRule), 'keywordBased');
          break;
        case 'conceptMatch':
          result = markConceptMatch(studentAnswer, effectiveRule);
          break;
        case 'mcqOptionMatch':
          result = withMarkingMode(markMcqOptionMatch(studentAnswer, effectiveRule), 'mcqOptionMatch');
          break;
        case 'manualReviewRequired':
        case 'rubricBasedManualReview':
          result = markManualReviewRequired(effectiveRule, effectiveRule.markingMode);
          break;
        case 'hybridAutoPlusManual':
          if (effectiveRule.keywordRules) {
            result = withMarkingMode(markKeywordBased(studentAnswer, effectiveRule), 'hybridAutoPlusManual');
          } else {
            result = {
              isCorrect: false,
              score: 0,
              maxScore: effectiveRule.marks || 1,
              requiresManualReview: true,
              confidence: 0,
              reason: 'hybrid_no_auto_rule',
              markingModeUsed: 'hybridAutoPlusManual'
            };
          }
          break;
        default:
          result = {
            isCorrect: false,
            score: 0,
            maxScore: effectiveRule.marks || 1,
            requiresManualReview: true,
            confidence: 0,
            reason: 'unknown_marking_mode',
            markingModeUsed: effectiveRule.markingMode || 'unknown'
          };
      }

      let modelAnswer = null;
      const modelAnswersQuery = await db.collection('model_answer_versions')
        .where('interactionId', '==', interactionId)
        .orderBy('versionNumber', 'desc')
        .limit(1)
        .get();

      if (!modelAnswersQuery.empty) {
        modelAnswer = modelAnswersQuery.docs[0].data();
      }

      const feedback = omitUndefined({
        isCorrect: result.isCorrect,
        correctAnswer: effectiveRule.exactAnswer || (modelAnswer?.approvedAnswer) || null,
        explanation: modelAnswer?.explanation || null,
        acceptableAlternatives: effectiveRule.alternativeAnswers || modelAnswer?.acceptableAlternatives || null,
        matchedConceptGroups: result.matchedConceptGroups,
        totalConceptGroups: result.totalConceptGroups,
        matchedConceptTerms: result.matchedConceptTerms,
        markingModeUsed: result.markingModeUsed
      });

      await db.collection('submissions').doc(submissionId).update({
        autoScore: result.score,
        finalScore: result.requiresManualReview ? null : result.score,
        autoFeedback: feedback,
        reviewStatus: result.requiresManualReview ? 'teacherReview' : 'autoMarked',
        updatedAt: admin.firestore.Timestamp.now()
      });

      if (result.requiresManualReview) {
        await createOrReuseReviewTask(db, {
          submissionId,
          interactionId,
          interaction: {
            ...interaction,
            interactionId,
          },
          userId: request.auth.uid,
          confidence: result.confidence,
        });
      }

      return {
        submissionId,
        autoScore: result.score,
        maxScore: result.maxScore,
        isCorrect: result.isCorrect,
        requiresManualReview: result.requiresManualReview,
        confidence: result.confidence,
        markingModeUsed: result.markingModeUsed,
        feedback
      };

    } catch (error) {
      console.error('Auto-marking error:', error);
      throw new HttpsError('internal', 'Marking failed', error.message);
    }
  });

  /**
   * Get teacher's review queue
   */
  const getReviewQueue = onCall(CALLABLE_OPTIONS, async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const userRole = await resolveCallableRole(db, request);
    if (!isTeacherRole(userRole)) {
      throw new HttpsError('permission-denied', 'Teacher access required');
    }

    const {
      examId,
      studentId,
      status,
      reviewStatus,
      priority,
      subject,
      dateFrom,
      dateTo,
      limit = 50
    } = request.data || {};
    const requestedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

    console.info('[v2ListTeacherReviewQueue] start', {
      uid: request.auth.uid,
      userRole,
      filters: { examId: examId || null, studentId: studentId || null, status: status || null, reviewStatus: reviewStatus || null, priority: priority || null, subject: subject || null },
      requestedLimit,
    });

    let query = db.collection('review_tasks');

    if (examId) {
      query = query.where('examId', '==', examId);
    }

    if (status) {
      query = query.where('status', '==', status);
    }

    if (priority) {
      query = query.where('priority', '==', priority);
    }

    const fetchLimit = isAdminRole(userRole) ? requestedLimit : Math.max(requestedLimit * 5, 50);
    let snapshot;
    try {
      query = query.orderBy('createdAt', 'asc').limit(fetchLimit);
      snapshot = await query.get();
    } catch (error) {
      console.error('[v2ListTeacherReviewQueue] primary query failed', {
        uid: request.auth.uid,
        userRole,
        filters: { examId: examId || null, status: status || null, priority: priority || null },
        code: error?.code || null,
        message: error?.message || String(error),
      });

      if (error?.code !== 9 && error?.code !== 'failed-precondition') {
        return { ok: true, tasks: [], diagnostics: { queueReadFailed: true, code: error?.code || null } };
      }

      let fallbackQuery = db.collection('review_tasks');
      if (examId) {
        fallbackQuery = fallbackQuery.where('examId', '==', examId);
      }
      if (status) {
        fallbackQuery = fallbackQuery.where('status', '==', status);
      }
      if (priority) {
        fallbackQuery = fallbackQuery.where('priority', '==', priority);
      }
      try {
        snapshot = await fallbackQuery.limit(fetchLimit).get();
      } catch (fallbackError) {
        console.error('[v2ListTeacherReviewQueue] fallback query failed', {
          uid: request.auth.uid,
          userRole,
          filters: { examId: examId || null, status: status || null, priority: priority || null },
          code: fallbackError?.code || null,
          message: fallbackError?.message || String(fallbackError),
        });
        return { ok: true, tasks: [], diagnostics: { queueReadFailed: true, code: fallbackError?.code || null } };
      }
    }

    const allowedStudentIds = isAdminRole(userRole)
      ? null
      : await getAllowedStudentIdsForTeacher(db, request.auth.uid);

    console.info('[v2ListTeacherReviewQueue] candidates loaded', {
      uid: request.auth.uid,
      isAdmin: isAdminRole(userRole),
      candidateCount: snapshot.size,
      allowedStudentCount: allowedStudentIds ? allowedStudentIds.size : null,
    });

    const hydratedTasks = [];
    for (const doc of snapshot.docs) {
      const task = doc.data();
      const taskStudentId = getTaskStudentId(task);
      if (allowedStudentIds && !allowedStudentIds.has(taskStudentId)) continue;
      if (studentId && taskStudentId !== studentId) continue;
      if (reviewStatus && task.status !== reviewStatus) continue;
      if (dateFrom && task.createdAt?.toDate && task.createdAt.toDate() < new Date(dateFrom)) continue;
      if (dateTo && task.createdAt?.toDate && task.createdAt.toDate() > new Date(dateTo)) continue;

      let hydrated;
      try {
        hydrated = await hydrateReviewTask(db, doc);
      } catch (error) {
        console.error('[v2ListTeacherReviewQueue] hydrate failed; returning minimal task', {
          uid: request.auth.uid,
          reviewTaskId: doc.id,
          submissionId: task.submissionId || null,
          interactionId: task.interactionId || null,
          code: error?.code || null,
          message: error?.message || String(error),
        });
        hydrated = { id: doc.id, ...task, userId: taskStudentId || task.userId || '' };
      }
      if (subject && hydrated.exam?.subject !== subject) continue;
      hydratedTasks.push(hydrated);
      if (hydratedTasks.length >= requestedLimit) break;
    }

    console.info('[v2ListTeacherReviewQueue] complete', {
      uid: request.auth.uid,
      returnedCount: hydratedTasks.length,
    });

    return { ok: true, tasks: hydratedTasks };
  });

  /**
   * Submit teacher review
   */
  const submitTeacherReview = onCall(CALLABLE_OPTIONS, async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const userRole = await resolveCallableRole(db, request);
    if (!isTeacherRole(userRole)) {
      throw new HttpsError('permission-denied', 'Teacher access required');
    }

    const { reviewTaskId, score, comments, rubricScores, interventionNotes } = request.data || {};

    if (!reviewTaskId) {
      throw new HttpsError('invalid-argument', 'Review task ID required');
    }

    if (typeof score !== 'number') {
      throw new HttpsError('invalid-argument', 'Score required');
    }

    const taskRef = db.collection('review_tasks').doc(reviewTaskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      throw new HttpsError('not-found', 'Review task not found');
    }

    const task = taskDoc.data();
    const submissionRef = db.collection('submissions').doc(task.submissionId);
    const submissionDoc = await submissionRef.get();
    if (!submissionDoc.exists) {
      throw new HttpsError('not-found', 'Submission not found');
    }

    const submission = { id: submissionDoc.id, ...submissionDoc.data() };
    await assertTeacherCanAccessSubmission(db, request, submission);

    const teacherName = getCallableDisplayName(request);
    const previousScore = getSubmissionScore(submission);
    const previousReviewStatus = submission.reviewStatus || submission.review_status || null;
    const [itemDoc, interactionDoc, studentDoc] = await Promise.all([
      submission.itemId ? db.collection('items').doc(submission.itemId).get() : Promise.resolve(null),
      submission.interactionId ? db.collection('interactions').doc(submission.interactionId).get() : Promise.resolve(null),
      getTaskStudentId(submission) ? db.collection('users').doc(getTaskStudentId(submission)).get() : Promise.resolve(null),
    ]);
    const item = itemDoc?.exists ? itemDoc.data() : {};
    const interaction = interactionDoc?.exists ? interactionDoc.data() : {};
    const modelAnswer = await getLatestModelAnswer(db, submission.interactionId);

    const result = await db.runTransaction(async (transaction) => {
      const now = admin.firestore.Timestamp.now();

      transaction.update(submissionRef, {
        manualScore: score,
        finalScore: score,
        teacherFeedback: {
          comments: comments || '',
          reason: comments || '',
          interventionNotes: interventionNotes || '',
          rubricScores: rubricScores || {},
          partialCreditApplied: false,
          teacherId: request.auth.uid,
          teacherName,
          score,
          reviewedAt: now
        },
        reviewStatus: 'teacherReviewed',
        scoredByTeacher: true,
        teacherOverride: false,
        teacherId: request.auth.uid,
        teacherName,
        reviewedBy: request.auth.uid,
        reviewedAt: now,
        updatedAt: now
      });

      transaction.update(taskRef, {
        status: 'completed',
        assignedTeacherId: task.assignedTeacherId || request.auth.uid,
        reviewedBy: request.auth.uid,
        teacherName,
        score,
        teacherComments: comments || '',
        interventionNotes: interventionNotes || '',
        rubricScores: rubricScores || {},
        resolvedAt: now,
        updatedAt: now
      });

      return { ok: true, success: true, reviewTaskId, submissionId: task.submissionId, attemptId: submission.attemptId || submission.attempt_id || null };
    });

    await writeTeacherReviewAction(db, {
      actionType: score === previousScore ? 'teacherComment' : 'manualScore',
      examId: submission.examId,
      attemptId: result.attemptId,
      submissionId: task.submissionId,
      itemId: submission.itemId,
      interactionId: submission.interactionId,
      studentId: getTaskStudentId(submission),
      studentName: firstNonEmptyString(studentDoc?.data()?.displayName, studentDoc?.data()?.name),
      teacherId: request.auth.uid,
      teacherName,
      previousScore,
      newScore: score,
      previousReviewStatus,
      newReviewStatus: 'teacherReviewed',
      comment: comments || '',
      questionLabel: firstNonEmptyString(item?.questionLabel, item?.questionNumber, interaction?.label),
      sourceReference: firstNonEmptyString(item?.sourceReference, interaction?.sourceReference),
      studentAnswer: formatSubmissionAnswer(submission.responsePayload),
      officialAnswer: firstNonEmptyString(modelAnswer?.approvedAnswer, submission.autoFeedback?.correctAnswer),
      status: 'completed',
    });

    let summary = null;
    if (result.attemptId) {
      summary = await aggregateAttemptScoresForAttempt(db, result.attemptId);
    }

    return { ...result, summary };
  });

  /**
   * Teachers can correct/override the score on any linked student submission,
   * including auto-marked answers that were originally marked incorrectly.
   */
  const overrideTeacherSubmissionScore = onCall(CALLABLE_OPTIONS, async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const userRole = await resolveCallableRole(db, request);
    if (!isTeacherRole(userRole)) {
      throw new HttpsError('permission-denied', 'Teacher access required');
    }

    const { submissionId, score, comment } = request.data || {};
    if (!submissionId) {
      throw new HttpsError('invalid-argument', 'Submission ID required');
    }
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      throw new HttpsError('invalid-argument', 'Numeric score required');
    }
    if (typeof comment !== 'string' || !comment.trim()) {
      throw new HttpsError('invalid-argument', 'A comment or reason is required before saving a teacher correction.');
    }

    const submissionRef = db.collection('submissions').doc(submissionId);
    const submissionDoc = await submissionRef.get();
    if (!submissionDoc.exists) {
      throw new HttpsError('not-found', 'Submission not found');
    }

    const submission = { id: submissionDoc.id, ...submissionDoc.data() };
    await assertTeacherCanAccessSubmission(db, request, submission);

    const interactionId = submission.interactionId || submission.interaction_id;
    const [interactionDoc, itemDoc, studentDoc] = await Promise.all([
      interactionId ? db.collection('interactions').doc(interactionId).get() : Promise.resolve(null),
      submission.itemId ? db.collection('items').doc(submission.itemId).get() : Promise.resolve(null),
      getTaskStudentId(submission) ? db.collection('users').doc(getTaskStudentId(submission)).get() : Promise.resolve(null),
    ]);
    const interaction = interactionDoc?.exists ? { id: interactionDoc.id, ...interactionDoc.data() } : null;
    const item = itemDoc?.exists ? { id: itemDoc.id, ...itemDoc.data() } : null;
    const modelAnswer = await getLatestModelAnswer(db, interactionId);
    const maxScore = Number(interaction?.marks ?? submission.maxScore ?? submission.max_score ?? 1);
    if (score < 0 || score > maxScore) {
      throw new HttpsError('invalid-argument', `Score must be between 0 and ${maxScore}`);
    }

    const existingTasks = await db.collection('review_tasks')
      .where('submissionId', '==', submissionId)
      .limit(10)
      .get();
    const relatedTask = existingTasks.docs[0] || null;
    const previousScore = getSubmissionScore(submission);
    const previousReviewStatus = submission.reviewStatus || submission.review_status || null;
    const wasAutoMarked = previousReviewStatus !== 'teacherReview' && !relatedTask;
    const newReviewStatus = wasAutoMarked ? 'teacherOverride' : 'teacherReviewed';
    const attemptId = getSubmissionAttemptId(submission);
    const teacherName = getCallableDisplayName(request);
    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();

    batch.update(submissionRef, {
      manualScore: score,
      finalScore: score,
      teacherFeedback: {
        comments: comment.trim(),
        reason: comment.trim(),
        teacherId: request.auth.uid,
        teacherName,
        score,
        previousScore: typeof previousScore === 'number' ? previousScore : null,
        previousAutoScore: typeof submission.autoScore === 'number' ? submission.autoScore : null,
        overrideApplied: wasAutoMarked,
        reviewedAt: now,
      },
      reviewStatus: newReviewStatus,
      scoredByTeacher: true,
      teacherOverride: wasAutoMarked,
      teacherId: request.auth.uid,
      teacherName,
      reviewedBy: request.auth.uid,
      reviewedAt: now,
      updatedAt: now,
    });

    if (relatedTask) {
      batch.update(relatedTask.ref, {
        status: 'completed',
        assignedTeacherId: relatedTask.data().assignedTeacherId || request.auth.uid,
        reviewedBy: request.auth.uid,
        teacherName,
        score,
        teacherComments: comment.trim(),
        resolvedAt: now,
        updatedAt: now,
      });
    }

    await batch.commit();

    const actionId = await writeTeacherReviewAction(db, {
      actionType: score === previousScore ? 'teacherComment' : (wasAutoMarked ? 'scoreOverride' : 'manualScore'),
      examId: submission.examId || interaction?.examId || null,
      attemptId,
      submissionId,
      itemId: submission.itemId || interaction?.itemId || null,
      interactionId,
      studentId: getTaskStudentId(submission),
      studentName: firstNonEmptyString(studentDoc?.data()?.displayName, studentDoc?.data()?.name),
      teacherId: request.auth.uid,
      teacherName,
      previousScore,
      newScore: score,
      previousReviewStatus,
      newReviewStatus,
      comment: comment.trim(),
      questionLabel: firstNonEmptyString(item?.questionLabel, String(item?.questionNumber || ''), interaction?.label),
      sourceReference: firstNonEmptyString(item?.sourceReference, interaction?.sourceReference),
      studentAnswer: formatSubmissionAnswer(submission.responsePayload),
      officialAnswer: firstNonEmptyString(modelAnswer?.approvedAnswer, submission.autoFeedback?.correctAnswer),
      status: 'completed',
    });

    const summary = attemptId ? await aggregateAttemptScoresForAttempt(db, attemptId) : null;

    return {
      ok: true,
      success: true,
      submissionId,
      reviewTaskId: relatedTask?.id || null,
      actionId,
      summary,
    };
  });

  /**
   * Load the full submitted attempt for a linked teacher review workflow.
   */
  const getTeacherAttemptReview = onCall(CALLABLE_OPTIONS, async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const userRole = await resolveCallableRole(db, request);
    if (!isTeacherRole(userRole)) {
      throw new HttpsError('permission-denied', 'Teacher access required');
    }

    const { attemptId } = request.data || {};
    if (!attemptId) {
      throw new HttpsError('invalid-argument', 'Attempt ID required');
    }

    const attemptDoc = await db.collection('exam_attempts').doc(attemptId).get();
    if (!attemptDoc.exists) {
      throw new HttpsError('not-found', 'Attempt not found');
    }

    const attempt = { id: attemptDoc.id, ...attemptDoc.data() };
    const studentId = getTaskStudentId(attempt);
    if (!isAdminRole(userRole)) {
      const allowed = await teacherCanAccessStudent(db, request.auth.uid, studentId);
      if (!allowed) {
        throw new HttpsError('permission-denied', 'This attempt is not assigned to your roster or school.');
      }
    }

    const [submissionByCamel, submissionBySnake, taskByCamel, taskBySnake, studentDoc] = await Promise.all([
      db.collection('submissions').where('attemptId', '==', attemptId).get(),
      db.collection('submissions').where('attempt_id', '==', attemptId).get(),
      db.collection('review_tasks').where('attemptId', '==', attemptId).get(),
      db.collection('review_tasks').where('submissionId', '>=', `${attemptId}__`).where('submissionId', '<', `${attemptId}__\uf8ff`).get().catch(() => ({ docs: [] })),
      studentId ? db.collection('users').doc(studentId).get() : Promise.resolve(null),
    ]);

    const submissionsById = new Map();
    [...submissionByCamel.docs, ...submissionBySnake.docs].forEach((doc) => {
      submissionsById.set(doc.id, { id: doc.id, ...doc.data() });
    });

    const reviewTasksById = new Map();
    [...taskByCamel.docs, ...taskBySnake.docs].forEach((doc) => {
      const data = doc.data();
      if (data.submissionId && !String(data.submissionId).startsWith(`${attemptId}__`) && data.attemptId !== attemptId) return;
      reviewTasksById.set(doc.id, { id: doc.id, ...data });
    });

    return {
      ok: true,
      attempt,
      submissions: Array.from(submissionsById.values()),
      reviewTasks: Array.from(reviewTasksById.values()),
      student: studentDoc?.exists ? { id: studentDoc.id, ...studentDoc.data() } : null,
    };
  });

  /**
   * Teachers can flag weak keys/explanations without editing official content.
   */
  const createTeacherAnswerSuggestion = onCall(CALLABLE_OPTIONS, async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const userRole = await resolveCallableRole(db, request);
    if (!isTeacherRole(userRole)) {
      throw new HttpsError('permission-denied', 'Teacher access required');
    }

    const {
      reviewTaskId,
      submissionId,
      issueType,
      suggestedAnswer,
      suggestedAlternatives,
      suggestedExplanation,
      suggestedMarkingMode,
      teacherComment,
    } = request.data || {};

    if (!reviewTaskId && !submissionId) {
      throw new HttpsError('invalid-argument', 'reviewTaskId or submissionId is required');
    }

    let task = null;
    if (reviewTaskId) {
      const taskDoc = await db.collection('review_tasks').doc(reviewTaskId).get();
      if (!taskDoc.exists) throw new HttpsError('not-found', 'Review task not found');
      task = { id: taskDoc.id, ...taskDoc.data() };
    }

    const effectiveSubmissionId = submissionId || task?.submissionId;
    const submissionDoc = await db.collection('submissions').doc(effectiveSubmissionId).get();
    if (!submissionDoc.exists) {
      throw new HttpsError('not-found', 'Submission not found');
    }

    const submission = { id: submissionDoc.id, ...submissionDoc.data() };
    await assertTeacherCanAccessSubmission(db, request, submission);

    const [itemDoc, interactionDoc, examDoc, studentDoc] = await Promise.all([
      db.collection('items').doc(submission.itemId).get(),
      db.collection('interactions').doc(submission.interactionId).get(),
      submission.examId ? db.collection('exams').doc(submission.examId).get() : Promise.resolve(null),
      getTaskStudentId(submission) ? db.collection('users').doc(getTaskStudentId(submission)).get() : Promise.resolve(null),
    ]);

    const item = itemDoc.exists ? itemDoc.data() : {};
    const interaction = interactionDoc.exists ? interactionDoc.data() : {};
    const exam = examDoc?.exists ? examDoc.data() : {};
    const student = studentDoc?.exists ? studentDoc.data() : {};
    const markingRuleDoc = interaction?.markingRuleId
      ? await db.collection('marking_rules').doc(interaction.markingRuleId).get()
      : null;
    const markingRule = markingRuleDoc?.exists ? markingRuleDoc.data() : {};
    const modelAnswer = await getLatestModelAnswer(db, submission.interactionId);

    const suggestionRef = db.collection('answer_suggestions').doc();
    const now = admin.firestore.Timestamp.now();
    const alternatives = Array.isArray(suggestedAlternatives)
      ? suggestedAlternatives.filter((value) => typeof value === 'string' && value.trim())
      : [];
    const teacherName = getCallableDisplayName(request);
    const actionType = (
      (typeof suggestedAnswer === 'string' && suggestedAnswer.trim()) ||
      (typeof suggestedExplanation === 'string' && suggestedExplanation.trim()) ||
      alternatives.length > 0 ||
      (typeof suggestedMarkingMode === 'string' && suggestedMarkingMode.trim())
    ) ? 'suggestedCorrection' : 'answerKeyFlag';
    const studentAnswer = formatSubmissionAnswer(submission.responsePayload);
    const currentQuestionText = interaction?.promptMarkdown || interaction?.promptText || item?.stemMarkdown || item?.promptMarkdown || '';
    const currentAnswer = markingRule?.exactAnswer || modelAnswer?.approvedAnswer || '';
    const currentExplanation = modelAnswer?.explanation || modelAnswer?.teacherNotes || '';
    const currentMarkingMode = markingRule?.markingMode || null;

    await suggestionRef.set({
      suggestionId: suggestionRef.id,
      examId: submission.examId,
      examTitle: exam?.title || '',
      attemptId: getSubmissionAttemptId(submission),
      submissionId: submission.id,
      itemId: submission.itemId,
      interactionId: submission.interactionId,
      markingRuleId: interaction?.markingRuleId || null,
      modelAnswerVersionId: modelAnswer?.id || null,
      teacherId: request.auth.uid,
      teacherName,
      studentId: getTaskStudentId(submission),
      studentName: firstNonEmptyString(student?.displayName, student?.name),
      studentAnswer,
      studentSubmissionId: submission.id,
      reviewTaskId: task?.id || null,
      issueType: normalizeSuggestionIssueType(issueType),
      questionLabel: firstNonEmptyString(item?.questionLabel, String(item?.questionNumber || ''), interaction?.label),
      sourceReference: firstNonEmptyString(item?.sourceReference, interaction?.sourceReference),
      currentQuestionText,
      currentAnswer,
      currentAlternatives: markingRule?.alternativeAnswers || modelAnswer?.acceptableAlternatives || [],
      currentExplanation,
      currentMarkingMode,
      suggestedAnswer: typeof suggestedAnswer === 'string' ? suggestedAnswer.trim() : '',
      suggestedAlternatives: alternatives,
      suggestedExplanation: typeof suggestedExplanation === 'string' ? suggestedExplanation.trim() : '',
      suggestedMarkingMode: typeof suggestedMarkingMode === 'string' ? suggestedMarkingMode.trim() : '',
      teacherComment: typeof teacherComment === 'string' ? teacherComment.trim() : '',
      status: 'pending',
      adminComment: '',
      createdAt: now,
      updatedAt: now,
      reviewedAt: null,
      reviewedBy: null,
    });

    await writeTeacherReviewAction(db, {
      actionType,
      examId: submission.examId,
      attemptId: getSubmissionAttemptId(submission),
      submissionId: submission.id,
      itemId: submission.itemId,
      interactionId: submission.interactionId,
      studentId: getTaskStudentId(submission),
      studentName: firstNonEmptyString(student?.displayName, student?.name),
      teacherId: request.auth.uid,
      teacherName,
      previousScore: getSubmissionScore(submission),
      newScore: getSubmissionScore(submission),
      previousReviewStatus: submission.reviewStatus || submission.review_status || null,
      newReviewStatus: submission.reviewStatus || submission.review_status || null,
      comment: typeof teacherComment === 'string' ? teacherComment.trim() : '',
      suggestionId: suggestionRef.id,
      questionLabel: firstNonEmptyString(item?.questionLabel, String(item?.questionNumber || ''), interaction?.label),
      sourceReference: firstNonEmptyString(item?.sourceReference, interaction?.sourceReference),
      studentAnswer,
      officialAnswer: currentAnswer,
      suggestedAnswer: typeof suggestedAnswer === 'string' ? suggestedAnswer.trim() : '',
      suggestedExplanation: typeof suggestedExplanation === 'string' ? suggestedExplanation.trim() : '',
      suggestedMarkingMode: typeof suggestedMarkingMode === 'string' ? suggestedMarkingMode.trim() : '',
      status: 'pending',
    });

    return { ok: true, suggestionId: suggestionRef.id };
  });

  /**
   * Admin queue for teacher content feedback.
   */
  const listAdminAnswerSuggestions = onCall(CALLABLE_OPTIONS, async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const userRole = await resolveCallableRole(db, request);
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { examId, teacherId, status = 'pending', issueType, limit = 50 } = request.data || {};
    const requestedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    let query = db.collection('answer_suggestions');
    if (examId) query = query.where('examId', '==', examId);
    if (status && status !== 'all') query = query.where('status', '==', status);
    if (issueType) query = query.where('issueType', '==', issueType);
    query = query.orderBy('createdAt', 'desc').limit(requestedLimit);

    const snapshot = await query.get();
    const suggestions = [];
    for (const doc of snapshot.docs) {
      const suggestion = { id: doc.id, ...doc.data() };
      if (teacherId && suggestion.teacherId !== teacherId) continue;
      const [examDoc, itemDoc, interactionDoc, submissionDoc] = await Promise.all([
        suggestion.examId ? db.collection('exams').doc(suggestion.examId).get() : Promise.resolve(null),
        suggestion.itemId ? db.collection('items').doc(suggestion.itemId).get() : Promise.resolve(null),
        suggestion.interactionId ? db.collection('interactions').doc(suggestion.interactionId).get() : Promise.resolve(null),
        (suggestion.submissionId || suggestion.studentSubmissionId) ? db.collection('submissions').doc(suggestion.submissionId || suggestion.studentSubmissionId).get() : Promise.resolve(null),
      ]);
      suggestions.push({
        ...suggestion,
        exam: examDoc ? toPlainDoc(examDoc) : null,
        item: itemDoc ? toPlainDoc(itemDoc) : null,
        interaction: interactionDoc ? toPlainDoc(interactionDoc) : null,
        submission: submissionDoc ? toPlainDoc(submissionDoc) : null,
      });
    }

    return { ok: true, suggestions };
  });

  /**
   * Resolve a teacher suggestion. Accepted answer/explanation changes create a
   * new approved model_answer_versions record and optionally update rules/content.
   */
  const adminResolveAnswerSuggestion = onCall(CALLABLE_OPTIONS, async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    if (!isAdminRole(getCallableRole(request))) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const {
      suggestionId,
      resolutionStatus,
      adminComment,
      approvedAnswer,
      acceptableAlternatives,
      explanation,
      markingMode,
      itemPromptMarkdown,
      interactionPromptMarkdown,
      changeReason,
    } = request.data || {};

    if (!suggestionId) {
      throw new HttpsError('invalid-argument', 'suggestionId is required');
    }
    if (!['accepted', 'rejected', 'needs_discussion'].includes(resolutionStatus)) {
      throw new HttpsError('invalid-argument', 'resolutionStatus must be accepted, rejected, or needs_discussion');
    }

    const suggestionRef = db.collection('answer_suggestions').doc(suggestionId);
    const suggestionDoc = await suggestionRef.get();
    if (!suggestionDoc.exists) {
      throw new HttpsError('not-found', 'Suggestion not found');
    }

    const suggestion = suggestionDoc.data();
    const now = admin.firestore.Timestamp.now();

    if (resolutionStatus !== 'accepted') {
      await suggestionRef.update({
        status: resolutionStatus,
        adminComment: adminComment || '',
        reviewedAt: now,
        reviewedBy: request.auth.uid,
        updatedAt: now,
      });
      return { ok: true, suggestionId, status: resolutionStatus };
    }

    const finalAnswer = typeof approvedAnswer === 'string' && approvedAnswer.trim()
      ? approvedAnswer.trim()
      : suggestion.suggestedAnswer || suggestion.currentAnswer || '';
    const finalAlternatives = Array.isArray(acceptableAlternatives)
      ? acceptableAlternatives.filter((value) => typeof value === 'string' && value.trim())
      : (suggestion.suggestedAlternatives || []);
    const finalExplanation = typeof explanation === 'string' && explanation.trim()
      ? explanation.trim()
      : suggestion.suggestedExplanation || suggestion.currentExplanation || '';
    const finalMarkingMode = typeof markingMode === 'string' && markingMode.trim()
      ? markingMode.trim()
      : suggestion.suggestedMarkingMode || '';

    let newVersionId = null;
    await db.runTransaction(async (transaction) => {
      let previousVersion = null;
      if (suggestion.modelAnswerVersionId) {
        const previousVersionDoc = await transaction.get(
          db.collection('model_answer_versions').doc(suggestion.modelAnswerVersionId)
        );
        if (previousVersionDoc.exists) {
          previousVersion = { id: previousVersionDoc.id, ...previousVersionDoc.data() };
        }
      }

      if (!previousVersion) {
        const latestVersions = await db.collection('model_answer_versions')
          .where('interactionId', '==', suggestion.interactionId)
          .orderBy('versionNumber', 'desc')
          .limit(1)
          .get();
        if (!latestVersions.empty) {
          const latest = latestVersions.docs[0];
          previousVersion = { id: latest.id, ...latest.data() };
        }
      }

      const nextVersionNumber = (Number(previousVersion?.versionNumber) || 0) + 1;
      const newVersionRef = db.collection('model_answer_versions').doc();
      newVersionId = newVersionRef.id;
      transaction.set(newVersionRef, {
        itemId: suggestion.itemId,
        interactionId: suggestion.interactionId,
        versionNumber: nextVersionNumber,
        approvedAnswer: finalAnswer,
        acceptableAlternatives: finalAlternatives,
        explanation: finalExplanation,
        teacherNotes: suggestion.teacherComment || '',
        status: 'approved',
        previousVersionId: previousVersion?.id || null,
        sourceSuggestionId: suggestionId,
        changeReason: changeReason || adminComment || 'Accepted teacher answer suggestion',
        updatedBy: request.auth.uid,
        approvedBy: request.auth.uid,
        createdAt: now,
        updatedAt: now,
      });

      if (suggestion.markingRuleId) {
        const ruleUpdate = {
          updatedAt: now,
          sourceSuggestionId: suggestionId,
          updatedBy: request.auth.uid,
        };
        if (finalMarkingMode) ruleUpdate.markingMode = finalMarkingMode;
        if (finalAnswer) ruleUpdate.exactAnswer = finalAnswer;
        if (finalAlternatives.length > 0) ruleUpdate.alternativeAnswers = finalAlternatives;
        transaction.update(db.collection('marking_rules').doc(suggestion.markingRuleId), ruleUpdate);
      }

      if (suggestion.itemId && typeof itemPromptMarkdown === 'string' && itemPromptMarkdown.trim()) {
        transaction.update(db.collection('items').doc(suggestion.itemId), {
          promptMarkdown: itemPromptMarkdown.trim(),
          updatedAt: now,
          updatedBy: request.auth.uid,
          sourceSuggestionId: suggestionId,
        });
      }

      if (suggestion.interactionId && typeof interactionPromptMarkdown === 'string' && interactionPromptMarkdown.trim()) {
        transaction.update(db.collection('interactions').doc(suggestion.interactionId), {
          promptMarkdown: interactionPromptMarkdown.trim(),
          updatedAt: now,
          updatedBy: request.auth.uid,
          sourceSuggestionId: suggestionId,
        });
      }

      transaction.update(suggestionRef, {
        status: 'accepted',
        adminComment: adminComment || '',
        appliedModelAnswerVersionId: newVersionId,
        reviewedAt: now,
        reviewedBy: request.auth.uid,
        updatedAt: now,
      });
    });

    return { ok: true, suggestionId, status: 'accepted', modelAnswerVersionId: newVersionId };
  });

  /**
   * Admin activity feed for teacher review actions.
   */
  const listTeacherReviewActions = onCall(CALLABLE_OPTIONS, async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const role = await resolveCallableRole(db, request);
    if (role !== 'admin' && role !== 'super_admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { teacherId, studentId, examId, actionType, dateFrom, dateTo, limit = 100 } = request.data || {};
    const requestedLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
    const snapshot = await db.collection('teacher_review_actions')
      .orderBy('createdAt', 'desc')
      .limit(300)
      .get();

    const fromTime = dateFrom ? Date.parse(dateFrom) : null;
    const toTime = dateTo ? Date.parse(dateTo) : null;
    const actions = [];
    for (const doc of snapshot.docs) {
      const action = { id: doc.id, ...doc.data() };
      const createdTime = action.createdAt?.toDate ? action.createdAt.toDate().getTime() : null;
      if (teacherId && action.teacherId !== teacherId) continue;
      if (studentId && action.studentId !== studentId) continue;
      if (examId && action.examId !== examId) continue;
      if (actionType && action.actionType !== actionType) continue;
      if (fromTime && createdTime && createdTime < fromTime) continue;
      if (toTime && createdTime && createdTime > toTime) continue;

      const [examDoc, itemDoc, interactionDoc, submissionDoc, suggestionDoc] = await Promise.all([
        action.examId ? db.collection('exams').doc(action.examId).get() : Promise.resolve(null),
        action.itemId ? db.collection('items').doc(action.itemId).get() : Promise.resolve(null),
        action.interactionId ? db.collection('interactions').doc(action.interactionId).get() : Promise.resolve(null),
        action.submissionId ? db.collection('submissions').doc(action.submissionId).get() : Promise.resolve(null),
        action.suggestionId ? db.collection('answer_suggestions').doc(action.suggestionId).get() : Promise.resolve(null),
      ]);

      actions.push({
        ...action,
        exam: examDoc ? toPlainDoc(examDoc) : null,
        item: itemDoc ? toPlainDoc(itemDoc) : null,
        interaction: interactionDoc ? toPlainDoc(interactionDoc) : null,
        submission: submissionDoc ? toPlainDoc(submissionDoc) : null,
        suggestion: suggestionDoc ? toPlainDoc(suggestionDoc) : null,
      });
      if (actions.length >= requestedLimit) break;
    }

    return { ok: true, actions };
  });

  /**
   * Admin V2 content editor for item/interaction/rule/answer changes.
   */
  const adminUpdateV2ExamContent = onCall(CALLABLE_OPTIONS, async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const role = await resolveCallableRole(db, request);
    if (role !== 'admin' && role !== 'super_admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const {
      examId,
      itemId,
      interactionId,
      markingRuleId,
      itemUpdates = {},
      interactionUpdates = {},
      markingRuleUpdates = {},
      modelAnswerUpdates = {},
      changeReason,
    } = request.data || {};

    if (!examId || !itemId || !interactionId) {
      throw new HttpsError('invalid-argument', 'examId, itemId, and interactionId are required');
    }
    if (typeof changeReason !== 'string' || !changeReason.trim()) {
      throw new HttpsError('invalid-argument', 'A change reason is required');
    }

    const [itemDoc, interactionDoc, latestAnswerSnapshot] = await Promise.all([
      db.collection('items').doc(itemId).get(),
      db.collection('interactions').doc(interactionId).get(),
      db.collection('model_answer_versions')
        .where('interactionId', '==', interactionId)
        .orderBy('versionNumber', 'desc')
        .limit(1)
        .get(),
    ]);
    if (!itemDoc.exists) throw new HttpsError('not-found', 'Item not found');
    if (!interactionDoc.exists) throw new HttpsError('not-found', 'Interaction not found');

    const item = itemDoc.data();
    const interaction = interactionDoc.data();
    const effectiveRuleId = markingRuleId || interaction.markingRuleId || null;
    const previousAnswer = latestAnswerSnapshot.empty
      ? null
      : { id: latestAnswerSnapshot.docs[0].id, ...latestAnswerSnapshot.docs[0].data() };
    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();
    const auditChanges = [];

    const itemPatch = {};
    if (typeof itemUpdates.promptMarkdown === 'string') itemPatch.promptMarkdown = itemUpdates.promptMarkdown;
    if (typeof itemUpdates.stemMarkdown === 'string') itemPatch.stemMarkdown = itemUpdates.stemMarkdown;
    if (typeof itemUpdates.marks === 'number' && Number.isFinite(itemUpdates.marks)) itemPatch.marks = itemUpdates.marks;
    if (Object.keys(itemPatch).length > 0) {
      Object.entries(itemPatch).forEach(([key, value]) => auditChanges.push({ path: `items.${key}`, previousValue: item?.[key] ?? null, newValue: value }));
      batch.update(db.collection('items').doc(itemId), {
        ...itemPatch,
        updatedAt: now,
        updatedBy: request.auth.uid,
      });
    }

    const interactionPatch = {};
    if (typeof interactionUpdates.promptMarkdown === 'string') interactionPatch.promptMarkdown = interactionUpdates.promptMarkdown;
    if (typeof interactionUpdates.marks === 'number' && Number.isFinite(interactionUpdates.marks)) interactionPatch.marks = interactionUpdates.marks;
    if (Object.keys(interactionPatch).length > 0) {
      Object.entries(interactionPatch).forEach(([key, value]) => auditChanges.push({ path: `interactions.${key}`, previousValue: interaction?.[key] ?? null, newValue: value }));
      batch.update(db.collection('interactions').doc(interactionId), {
        ...interactionPatch,
        updatedAt: now,
        updatedBy: request.auth.uid,
      });
    }

    if (effectiveRuleId && Object.keys(markingRuleUpdates).length > 0) {
      const ruleDoc = await db.collection('marking_rules').doc(effectiveRuleId).get();
      const rule = ruleDoc.exists ? ruleDoc.data() : {};
      const rulePatch = {};
      const allowedModes = new Set(['exactMatch', 'alternativeAnswers', 'manualReviewRequired', 'conceptMatch', 'normalizedTextMatch', 'keywordBased', 'mcqOptionMatch', 'rubricBasedManualReview', 'hybridAutoPlusManual']);
      if (typeof markingRuleUpdates.markingMode === 'string' && allowedModes.has(markingRuleUpdates.markingMode)) {
        rulePatch.markingMode = markingRuleUpdates.markingMode;
        rulePatch.manualReviewRequired = markingRuleUpdates.markingMode === 'manualReviewRequired';
      }
      if (typeof markingRuleUpdates.exactAnswer === 'string') rulePatch.exactAnswer = markingRuleUpdates.exactAnswer;
      if (Array.isArray(markingRuleUpdates.alternativeAnswers)) {
        rulePatch.alternativeAnswers = markingRuleUpdates.alternativeAnswers.filter((value) => typeof value === 'string' && value.trim());
      }
      if (typeof markingRuleUpdates.allowFullSentenceContainingAnswer === 'boolean') {
        rulePatch.allowFullSentenceContainingAnswer = markingRuleUpdates.allowFullSentenceContainingAnswer;
      }

      if (Object.keys(rulePatch).length > 0) {
        Object.entries(rulePatch).forEach(([key, value]) => auditChanges.push({ path: `marking_rules.${key}`, previousValue: rule?.[key] ?? null, newValue: value }));
        batch.update(db.collection('marking_rules').doc(effectiveRuleId), {
          ...rulePatch,
          updatedAt: now,
          updatedBy: request.auth.uid,
        });
      }
    }

    const answerPatch = {};
    if (typeof modelAnswerUpdates.approvedAnswer === 'string') answerPatch.approvedAnswer = modelAnswerUpdates.approvedAnswer;
    if (Array.isArray(modelAnswerUpdates.acceptableAlternatives)) {
      answerPatch.acceptableAlternatives = modelAnswerUpdates.acceptableAlternatives.filter((value) => typeof value === 'string' && value.trim());
    }
    if (typeof modelAnswerUpdates.explanation === 'string') answerPatch.explanation = modelAnswerUpdates.explanation;
    if (typeof modelAnswerUpdates.teacherNotes === 'string') answerPatch.teacherNotes = modelAnswerUpdates.teacherNotes;

    let modelAnswerVersionId = null;
    if (Object.keys(answerPatch).length > 0) {
      const nextVersionRef = db.collection('model_answer_versions').doc();
      const nextVersionNumber = (Number(previousAnswer?.versionNumber) || 0) + 1;
      modelAnswerVersionId = nextVersionRef.id;
      Object.entries(answerPatch).forEach(([key, value]) => auditChanges.push({ path: `model_answer_versions.${key}`, previousValue: previousAnswer?.[key] ?? null, newValue: value }));
      batch.set(nextVersionRef, {
        itemId,
        interactionId,
        versionNumber: nextVersionNumber,
        approvedAnswer: answerPatch.approvedAnswer ?? previousAnswer?.approvedAnswer ?? '',
        acceptableAlternatives: answerPatch.acceptableAlternatives ?? previousAnswer?.acceptableAlternatives ?? [],
        explanation: answerPatch.explanation ?? previousAnswer?.explanation ?? '',
        teacherNotes: answerPatch.teacherNotes ?? previousAnswer?.teacherNotes ?? '',
        status: 'approved',
        previousVersionId: previousAnswer?.id || null,
        changeReason: changeReason.trim(),
        updatedBy: request.auth.uid,
        approvedBy: request.auth.uid,
        createdAt: now,
        updatedAt: now,
      });
    }

    const auditRef = db.collection('audit_events').doc();
    batch.set(auditRef, {
      auditEventId: auditRef.id,
      actionType: 'admin_v2_exam_edit',
      examId,
      itemId,
      interactionId,
      markingRuleId: effectiveRuleId,
      modelAnswerVersionId,
      updatedBy: request.auth.uid,
      updatedAt: now,
      changeReason: changeReason.trim(),
      changes: auditChanges,
      createdAt: now,
    });

    await batch.commit();
    return { ok: true, auditEventId: auditRef.id, modelAnswerVersionId };
  });

  /**
   * Aggregate scores for an exam attempt
   */
  const aggregateAttemptScores = onCall(CALLABLE_OPTIONS, async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { attemptId } = request.data;

    if (!attemptId) {
      throw new HttpsError('invalid-argument', 'Attempt ID required');
    }

    return aggregateAttemptScoresForAttempt(db, attemptId);
  });

  /**
   * Create new model answer version
   */
  const createModelAnswerVersion = onCall(CALLABLE_OPTIONS, async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const userRole = request.auth.token?.role;
    if (userRole !== 'admin' && userRole !== 'content_editor' && userRole !== 'super_admin') {
      throw new HttpsError('permission-denied', 'Content editor access required');
    }

    const {
      itemId,
      interactionId,
      approvedAnswer,
      acceptableAlternatives,
      explanation,
      teacherNotes,
      changeReason
    } = request.data || {};

    if (!itemId || !interactionId || !approvedAnswer) {
      throw new HttpsError('invalid-argument', 'Required fields missing');
    }

    const versionsQuery = await db.collection('model_answer_versions')
      .where('interactionId', '==', interactionId)
      .orderBy('versionNumber', 'desc')
      .limit(1)
      .get();

    let versionNumber = 1;
    if (!versionsQuery.empty) {
      versionNumber = versionsQuery.docs[0].data().versionNumber + 1;
    }

    const newVersionRef = await db.collection('model_answer_versions').add({
      itemId,
      interactionId,
      versionNumber,
      approvedAnswer,
      acceptableAlternatives: acceptableAlternatives || [],
      explanation: explanation || '',
      teacherNotes: teacherNotes || '',
      status: 'pending_approval',
      changeReason: changeReason || 'New version',
      updatedBy: request.auth.uid,
      approvedBy: null,
      createdAt: admin.firestore.Timestamp.now()
    });

    return {
      modelAnswerVersionId: newVersionRef.id,
      versionNumber,
      status: 'pending_approval'
    };
  });

  /**
   * Approve model answer version
   */
  const approveModelAnswerVersion = onCall(CALLABLE_OPTIONS, async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const userRole = request.auth.token?.role;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { modelAnswerVersionId } = request.data;

    if (!modelAnswerVersionId) {
      throw new HttpsError('invalid-argument', 'Version ID required');
    }

    await db.collection('model_answer_versions').doc(modelAnswerVersionId).update({
      status: 'approved',
      approvedBy: request.auth.uid,
      updatedAt: admin.firestore.Timestamp.now()
    });

    return { success: true };
  });

  return {
    autoMarkSubmission,
    getReviewQueue,
    listTeacherReviewQueue: getReviewQueue,
    getTeacherAttemptReview,
    submitTeacherReview,
    overrideTeacherSubmissionScore,
    createTeacherAnswerSuggestion,
    listAdminAnswerSuggestions,
    adminResolveAnswerSuggestion,
    listTeacherReviewActions,
    adminUpdateV2ExamContent,
    aggregateAttemptScores,
    createModelAnswerVersion,
    approveModelAnswerVersion
  };
}

module.exports = {
  createV2MarkingFunctions,
  normalizeAnswer,
  __test: {
    buildNormalizedText,
    markConceptMatch,
    normalizeConceptGroups,
    markManualReviewRequired,
    createOrReuseReviewTask,
    markAlternativeAnswers,
    markExactMatch,
    markNormalizedMatch,
    keywordFallbackMatch,
  },
};

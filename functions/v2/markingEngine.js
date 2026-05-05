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
    interactionId: interaction.interactionId,
    examId: interaction.examId,
    itemId: interaction.itemId,
    userId,
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

async function teacherCanAccessStudent(db, teacherUid, studentUid) {
  if (!teacherUid || !studentUid) return false;
  const allowedStudentIds = await getAllowedStudentIdsForTeacher(db, teacherUid);
  return allowedStudentIds.has(studentUid);
}

async function assertTeacherCanAccessSubmission(db, request, submission) {
  const role = getCallableRole(request);
  if (isAdminRole(role)) return;
  if (!isTeacherRole(role)) {
    throw new HttpsError('permission-denied', 'Teacher access required');
  }

  const allowed = await teacherCanAccessStudent(db, request.auth.uid, submission.userId);
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
  const [submissionSnap, examSnap, itemSnap, interactionSnap, studentSnap] = await Promise.all([
    task.submissionId ? db.collection('submissions').doc(task.submissionId).get() : Promise.resolve(null),
    task.examId ? db.collection('exams').doc(task.examId).get() : Promise.resolve(null),
    task.itemId ? db.collection('items').doc(task.itemId).get() : Promise.resolve(null),
    task.interactionId ? db.collection('interactions').doc(task.interactionId).get() : Promise.resolve(null),
    task.userId ? db.collection('users').doc(task.userId).get() : Promise.resolve(null),
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

    const userRole = getCallableRole(request);
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

    query = query.orderBy('createdAt', 'asc').limit(isAdminRole(userRole) ? requestedLimit : Math.max(requestedLimit * 5, 50));
    const snapshot = await query.get();
    const allowedStudentIds = isAdminRole(userRole)
      ? null
      : await getAllowedStudentIdsForTeacher(db, request.auth.uid);

    const hydratedTasks = [];
    for (const doc of snapshot.docs) {
      const task = doc.data();
      if (allowedStudentIds && !allowedStudentIds.has(task.userId)) continue;
      if (studentId && task.userId !== studentId) continue;
      if (reviewStatus && task.status !== reviewStatus) continue;
      if (dateFrom && task.createdAt?.toDate && task.createdAt.toDate() < new Date(dateFrom)) continue;
      if (dateTo && task.createdAt?.toDate && task.createdAt.toDate() > new Date(dateTo)) continue;

      const hydrated = await hydrateReviewTask(db, doc);
      if (subject && hydrated.exam?.subject !== subject) continue;
      hydratedTasks.push(hydrated);
      if (hydratedTasks.length >= requestedLimit) break;
    }

    return { ok: true, tasks: hydratedTasks };
  });

  /**
   * Submit teacher review
   */
  const submitTeacherReview = onCall(CALLABLE_OPTIONS, async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const userRole = getCallableRole(request);
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

    const submission = submissionDoc.data();
    await assertTeacherCanAccessSubmission(db, request, submission);

    const teacherName = getCallableDisplayName(request);

    return db.runTransaction(async (transaction) => {
      const now = admin.firestore.Timestamp.now();

      transaction.update(submissionRef, {
        manualScore: score,
        finalScore: score,
        teacherFeedback: {
          comments: comments || '',
          interventionNotes: interventionNotes || '',
          rubricScores: rubricScores || {},
          partialCreditApplied: false,
          teacherId: request.auth.uid,
          teacherName,
          score,
          reviewedAt: now
        },
        reviewStatus: 'reviewed',
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

      return { ok: true, success: true, reviewTaskId, submissionId: task.submissionId };
    });
  });

  /**
   * Teachers can flag weak keys/explanations without editing official content.
   */
  const createTeacherAnswerSuggestion = onCall(CALLABLE_OPTIONS, async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const userRole = getCallableRole(request);
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

    const [itemDoc, interactionDoc] = await Promise.all([
      db.collection('items').doc(submission.itemId).get(),
      db.collection('interactions').doc(submission.interactionId).get(),
    ]);

    const item = itemDoc.exists ? itemDoc.data() : {};
    const interaction = interactionDoc.exists ? interactionDoc.data() : {};
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

    await suggestionRef.set({
      suggestionId: suggestionRef.id,
      examId: submission.examId,
      itemId: submission.itemId,
      interactionId: submission.interactionId,
      markingRuleId: interaction?.markingRuleId || null,
      modelAnswerVersionId: modelAnswer?.id || null,
      teacherId: request.auth.uid,
      teacherName: getCallableDisplayName(request),
      studentSubmissionId: submission.id,
      reviewTaskId: task?.id || null,
      issueType: normalizeSuggestionIssueType(issueType),
      currentQuestionText: interaction?.promptMarkdown || interaction?.promptText || item?.stemMarkdown || item?.promptMarkdown || '',
      currentAnswer: markingRule?.exactAnswer || modelAnswer?.approvedAnswer || '',
      currentAlternatives: markingRule?.alternativeAnswers || modelAnswer?.acceptableAlternatives || [],
      currentExplanation: modelAnswer?.explanation || '',
      currentMarkingMode: markingRule?.markingMode || null,
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

    return { ok: true, suggestionId: suggestionRef.id };
  });

  /**
   * Admin queue for teacher content feedback.
   */
  const listAdminAnswerSuggestions = onCall(CALLABLE_OPTIONS, async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    if (!isAdminRole(getCallableRole(request))) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { examId, status = 'pending', issueType, limit = 50 } = request.data || {};
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
      const [examDoc, itemDoc, interactionDoc] = await Promise.all([
        suggestion.examId ? db.collection('exams').doc(suggestion.examId).get() : Promise.resolve(null),
        suggestion.itemId ? db.collection('items').doc(suggestion.itemId).get() : Promise.resolve(null),
        suggestion.interactionId ? db.collection('interactions').doc(suggestion.interactionId).get() : Promise.resolve(null),
      ]);
      suggestions.push({
        ...suggestion,
        exam: examDoc ? toPlainDoc(examDoc) : null,
        item: itemDoc ? toPlainDoc(itemDoc) : null,
        interaction: interactionDoc ? toPlainDoc(interactionDoc) : null,
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

    const submissionsQuery = await db.collection('submissions')
      .where('attemptId', '==', attemptId)
      .get();

    let autoScore = 0;
    let manualScore = 0;
    let finalScore = 0;
    let maxScore = 0;
    let allReviewed = true;

    for (const doc of submissionsQuery.docs) {
      const submission = doc.data();
      const interactionDoc = await db.collection('interactions').doc(submission.interactionId).get();
      const interaction = interactionDoc.data();

      const itemMaxScore = interaction?.marks || 1;
      maxScore += itemMaxScore;

      if (submission.reviewStatus === 'teacherReview') {
        allReviewed = false;
      }

      if (submission.finalScore !== undefined && submission.finalScore !== null) {
        finalScore += submission.finalScore;
      } else if (submission.reviewStatus !== 'unanswered') {
        allReviewed = false;
      }

      if (submission.autoScore !== undefined) {
        autoScore += submission.autoScore;
      }

      if (submission.manualScore !== undefined) {
        manualScore += submission.manualScore;
      }
    }

    await db.collection('exam_attempts').doc(attemptId).update({
      autoScore,
      manualScore: manualScore || null,
      finalScore,
      maxScore,
      status: allReviewed ? 'completed' : 'pending_review',
      completedAt: allReviewed ? admin.firestore.Timestamp.now() : null,
      updatedAt: admin.firestore.Timestamp.now()
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
    submitTeacherReview,
    createTeacherAnswerSuggestion,
    listAdminAnswerSuggestions,
    adminResolveAnswerSuggestion,
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

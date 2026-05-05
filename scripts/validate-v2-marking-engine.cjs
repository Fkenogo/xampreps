#!/usr/bin/env node

const assert = require('assert');
const {
  __test: {
    markAlternativeAnswers,
    markConceptMatch,
    markExactMatch,
    markManualReviewRequired,
  },
} = require('../functions/v2/markingEngine');

const q51ConceptRules = {
  c: {
    markingMode: 'conceptMatch',
    marks: 1,
    conceptGroups: [
      ['buy', 'bought', 'purchase', 'get'],
      ['pancakes', 'pancake'],
      ['buns', 'bun'],
      ['juice'],
      ['lunch', 'meal', 'eat', 'have as lunch'],
    ],
    minimumConceptGroupsRequired: 3,
  },
  d: {
    markingMode: 'conceptMatch',
    marks: 1,
    conceptGroups: [
      ['excited', 'very excited', 'happy'],
      ['get back', 'return', 'go back'],
      ['school'],
      ['afternoon lessons', 'afternoon lesson', 'lessons', 'classes'],
    ],
    minimumConceptGroupsRequired: 3,
  },
  e: {
    markingMode: 'conceptMatch',
    marks: 1,
    conceptGroups: [
      ['busy road', 'road was busy', 'busy'],
      ['ringing', 'rang', 'ring'],
      ['bicycle bell', 'bell'],
      ['alert', 'warn', 'warning'],
      ['people', 'pedestrians'],
    ],
    minimumConceptGroupsRequired: 3,
  },
  f: {
    markingMode: 'conceptMatch',
    marks: 1,
    conceptGroups: [
      ['riding', 'rode', 'speeding'],
      ['high speed', 'very high speed', 'fast'],
      ['lost his balance', 'lost balance', 'balance'],
    ],
    minimumConceptGroupsRequired: 2,
  },
};

function assertConceptAccept(rule, answer) {
  const result = markConceptMatch(answer, rule);
  assert.strictEqual(result.isCorrect, true, `${answer} should be accepted`);
  assert.strictEqual(result.markingModeUsed, 'conceptMatch');
  assert.ok(result.matchedConceptGroups >= rule.minimumConceptGroupsRequired);
  assert.ok(Array.isArray(result.matchedConceptTerms));
}

assertConceptAccept(
  q51ConceptRules.c,
  'He could buy pancakes, buns and some juice to have as lunch.',
);
assertConceptAccept(
  q51ConceptRules.d,
  'He was very excited and he also wanted to get back to school in time for the afternoon lessons.',
);
assertConceptAccept(
  q51ConceptRules.e,
  'It was a busy road and he kept ringing the bicycle bell to alert people.',
);
assertConceptAccept(
  q51ConceptRules.f,
  'Riding at high speed and he lost his balance.',
);

const unsupported = markConceptMatch('He met an old man.', q51ConceptRules.f);
assert.strictEqual(unsupported.isCorrect, false, 'Unsupported answer should be rejected');
assert.strictEqual(unsupported.markingModeUsed, 'conceptMatch');

const exact = markExactMatch('Answer.', {
  markingMode: 'exactMatch',
  exactAnswer: 'answer',
  marks: 1,
});
assert.strictEqual(exact.isCorrect, true, 'exactMatch should remain normalized exact matching');

const alternative = markAlternativeAnswers('mum', {
  markingMode: 'alternativeAnswers',
  exactAnswer: 'mother',
  alternativeAnswers: ['mum', 'mom'],
  marks: 1,
});
assert.strictEqual(alternative.isCorrect, true, 'alternativeAnswers should still accept configured aliases');

const q6FullSentence = markExactMatch('Anne is the faster of the two girls', {
  markingMode: 'exactMatch',
  exactAnswer: 'faster',
  marks: 1,
  responseMode: 'textShort',
  itemType: 'singleBlank',
  itemPromptMarkdown: 'Anne is the ______ of the two girls. (fast)',
  instructionMarkdown: 'Use the correct form of the word given in brackets.',
  allowFullSentenceContainingAnswer: true,
});
assert.strictEqual(q6FullSentence.isCorrect, true, 'Q6 full sentence should be accepted');

const q7FullSentence = markExactMatch('The big mangoes Aisha bought were sweet and juicy', {
  markingMode: 'exactMatch',
  exactAnswer: 'juicy',
  marks: 1,
  responseMode: 'textShort',
  itemType: 'singleBlank',
  itemPromptMarkdown: 'The big mangoes Aisha bought were sweet and ______. (juice)',
  instructionMarkdown: 'Use the correct form of the word given in brackets.',
  allowFullSentenceContainingAnswer: true,
});
assert.strictEqual(q7FullSentence.isCorrect, true, 'Q7 full sentence should be accepted');

const q26FullSentence = markAlternativeAnswers('Eating too much sugar can cause health problems.', {
  markingMode: 'alternativeAnswers',
  exactAnswer: 'cause',
  acceptedAnswers: ['cause', 'Eating too much sugar can cause health problems.'],
  alternativeAnswers: ['Eating too much sugar can cause health problems.'],
  marks: 1,
  responseMode: 'textShort',
  itemType: 'singleBlank',
  itemPromptMarkdown: 'Rewrite the sentence giving one word for the underlined group of words.',
  allowFullSentenceContainingAnswer: true,
});
assert.strictEqual(q26FullSentence.isCorrect, true, 'Q26 full sentence should be accepted');

const q46Variant = markAlternativeAnswers('In order to save the cyclist’s life, she hooted at him.', {
  markingMode: 'alternativeAnswers',
  exactAnswer: 'In order to save the cyclist’s life, she hooted at him.',
  acceptedAnswers: [
    'In order to save the cyclist’s life, she hooted at him.',
    "In order to save the cyclist's life, she hooted at him.",
    'In order to save his life, she hooted at the cyclist.',
  ],
  marks: 1,
});
assert.strictEqual(q46Variant.isCorrect, true, 'Q46 answer-file variants should be accepted');

const wrongFastest = markExactMatch('Anne is the fastest of the two girls', {
  markingMode: 'exactMatch',
  exactAnswer: 'faster',
  marks: 1,
  responseMode: 'textShort',
  itemType: 'singleBlank',
  allowFullSentenceContainingAnswer: true,
});
assert.strictEqual(wrongFastest.isCorrect, false, 'fastest should not match faster');

const wrongJuice = markExactMatch('The big mangoes were sweet and juice', {
  markingMode: 'exactMatch',
  exactAnswer: 'juicy',
  marks: 1,
  responseMode: 'textShort',
  itemType: 'singleBlank',
  allowFullSentenceContainingAnswer: true,
});
assert.strictEqual(wrongJuice.isCorrect, false, 'juice should not match juicy');

const wrongFast = markExactMatch('fast', {
  markingMode: 'exactMatch',
  exactAnswer: 'faster',
  marks: 1,
  responseMode: 'textShort',
  itemType: 'singleBlank',
  allowFullSentenceContainingAnswer: true,
});
assert.strictEqual(wrongFast.isCorrect, false, 'fast should not match faster');

const unchangedExact = markExactMatch('Anne is the faster of the two girls', {
  markingMode: 'exactMatch',
  exactAnswer: 'faster',
  marks: 1,
  responseMode: 'textShort',
  itemType: 'singleBlank',
  allowFullSentenceContainingAnswer: false,
});
assert.strictEqual(unchangedExact.isCorrect, false, 'full sentence fallback must be disabled when config is false');

const manual = markManualReviewRequired({ marks: 2 }, 'manualReviewRequired');
assert.strictEqual(manual.requiresManualReview, true, 'manualReviewRequired should still require review');
assert.strictEqual(manual.score, 0);
assert.strictEqual(manual.maxScore, 2);

const q51cManual = markManualReviewRequired({ marks: 1 }, 'manualReviewRequired');
assert.strictEqual(q51cManual.requiresManualReview, true, 'Q51(c) should remain manual review');

const q52aManual = markManualReviewRequired({ marks: 1 }, 'manualReviewRequired');
assert.strictEqual(q52aManual.requiresManualReview, true, 'Q52(a) should remain manual review');

const q55Manual = markManualReviewRequired({ marks: 10 }, 'rubricBasedManualReview');
assert.strictEqual(q55Manual.requiresManualReview, true, 'Q55 should remain manual review');
assert.strictEqual(q55Manual.maxScore, 10);

console.log('V2 marking engine validation passed');

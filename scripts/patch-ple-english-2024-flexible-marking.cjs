/**
 * PLE English 2024 Flexible Marking Pass
 * 
 * Fixes remaining auto-marking issues for:
 * - Q26-Q28: Accept both one-word answer AND full rewritten sentence
 * - Q46-Q47: Add contraction and sentence-order variants
 * 
 * This script patches live Firestore data for exam: weBoSWQcIi7ZjyDPVx3I
 * 
 * Usage: GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node scripts/patch-ple-english-2024-flexible-marking.cjs
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  console.error('Error: GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
  console.error('Set it to the path of your Firebase service account JSON file.');
  process.exit(1);
}

admin.initializeApp();
const db = admin.firestore();

const EXAM_ID = 'weBoSWQcIi7ZjyDPVx3I';

// Marking rule updates for each question
const markingRuleUpdates = {
  // Q26 - Accept both "cause" and full sentence
  'mr_int_q26': {
    markingMode: 'alternativeAnswers',
    manualReviewRequired: false,
    type: 'strict',
    exactAnswer: 'cause',
    acceptedAnswers: ['cause'],
    alternativeAnswers: [
      'Eating too much sugar can cause health problems.',
      'Eating too much sugar can cause health problems',
      'cause'
    ],
    normalizedMatchConfig: {
      caseSensitive: false,
      trimWhitespace: true,
      ignorePunctuation: true,
      normalizeSpaces: true
    },
    normalizationProfile: {
      caseSensitive: false,
      trimWhitespace: true,
      ignorePunctuation: true,
      normalizeSpaces: true,
      normalizeNumeric: true,
      allowUnitOmission: false
    },
    notes: 'Accepts both one-word answer "cause" and full rewritten sentence.'
  },

  // Q27 - Accept both "twice" and full sentence
  'mr_int_q27': {
    markingMode: 'alternativeAnswers',
    manualReviewRequired: false,
    type: 'strict',
    exactAnswer: 'twice',
    acceptedAnswers: ['twice'],
    alternativeAnswers: [
      'My mother visits the dentist twice a year.',
      'My mother visits the dentist twice a year',
      'twice'
    ],
    normalizedMatchConfig: {
      caseSensitive: false,
      trimWhitespace: true,
      ignorePunctuation: true,
      normalizeSpaces: true
    },
    normalizationProfile: {
      caseSensitive: false,
      trimWhitespace: true,
      ignorePunctuation: true,
      normalizeSpaces: true,
      normalizeNumeric: true,
      allowUnitOmission: false
    },
    notes: 'Accepts both one-word answer "twice" and full rewritten sentence.'
  },

  // Q28 - Accept both "menu" and full sentence
  'mr_int_q28': {
    markingMode: 'alternativeAnswers',
    manualReviewRequired: false,
    type: 'strict',
    exactAnswer: 'menu',
    acceptedAnswers: ['menu'],
    alternativeAnswers: [
      'When Mr. Byaruhanga entered the restaurant, the waitress gave him a menu.',
      'When Mr. Byaruhanga entered the restaurant, the waitress gave him a menu',
      'menu'
    ],
    normalizedMatchConfig: {
      caseSensitive: false,
      trimWhitespace: true,
      ignorePunctuation: true,
      normalizeSpaces: true
    },
    normalizationProfile: {
      caseSensitive: false,
      trimWhitespace: true,
      ignorePunctuation: true,
      normalizeSpaces: true,
      normalizeNumeric: true,
      allowUnitOmission: false
    },
    notes: 'Accepts both one-word answer "menu" and full rewritten sentence.'
  },

  // Q46 - Accept both sentence orders with "In order to"
  'mr_int_q46': {
    markingMode: 'alternativeAnswers',
    manualReviewRequired: false,
    type: 'strict',
    exactAnswer: 'In order to save his life, she hooted at the cyclist.',
    acceptedAnswers: ['In order to save his life, she hooted at the cyclist.'],
    alternativeAnswers: [
      'In order to save his life, she hooted at the cyclist.',
      'In order to save his life she hooted at the cyclist',
      'She hooted at the cyclist in order to save his life.',
      'She hooted at the cyclist in order to save his life',
      'In order to save the cyclists life, she hooted at him.',
      'In order to save the cyclist\'s life, she hooted at him.'
    ],
    normalizedMatchConfig: {
      caseSensitive: false,
      trimWhitespace: true,
      ignorePunctuation: true,
      normalizeSpaces: true
    },
    normalizationProfile: {
      caseSensitive: false,
      trimWhitespace: true,
      ignorePunctuation: true,
      normalizeSpaces: true,
      normalizeNumeric: true,
      allowUnitOmission: false
    },
    notes: 'Accepts both sentence orders: "In order to..." at start or end. Punctuation and apostrophe variants accepted.'
  },

  // Q47 - Accept contraction variants for "If" conditional
  'mr_int_q47': {
    markingMode: 'alternativeAnswers',
    manualReviewRequired: false,
    type: 'strict',
    exactAnswer: 'If you do not tuck in your shirt, you will not look smart.',
    acceptedAnswers: ['If you do not tuck in your shirt, you will not look smart.'],
    alternativeAnswers: [
      'If you do not tuck in your shirt, you will not look smart.',
      'If you do not tuck in your shirt, you will not look smart',
      'If you don\'t tuck in your shirt, you won\'t look smart.',
      'If you don\'t tuck in your shirt, you won\'t look smart',
      'If you don\'t tuck in your shirt, you will not look smart.',
      'If you don\'t tuck in your shirt, you will not look smart',
      'If you do not tuck in your shirt, you won\'t look smart.',
      'If you do not tuck in your shirt, you won\'t look smart',
      'If you fail to tuck in your shirt, you will not look smart.',
      'If you fail to tuck in your shirt, you won\'t look smart.'
    ],
    normalizedMatchConfig: {
      caseSensitive: false,
      trimWhitespace: true,
      ignorePunctuation: true,
      normalizeSpaces: true
    },
    normalizationProfile: {
      caseSensitive: false,
      trimWhitespace: true,
      ignorePunctuation: true,
      normalizeSpaces: true,
      normalizeNumeric: true,
      allowUnitOmission: false
    },
    notes: 'Accepts all contraction variants: do not/don\'t, will not/won\'t. Also accepts "fail to" as alternative to "do not tuck in".'
  }
};

// Interaction updates (set manualReviewDefault to false)
const interactionUpdates = {
  'int_q26': { manualReviewDefault: false },
  'int_q27': { manualReviewDefault: false },
  'int_q28': { manualReviewDefault: false },
  'int_q46': { manualReviewDefault: false },
  'int_q47': { manualReviewDefault: false }
};

async function applyPatches() {
  console.log(`Applying flexible marking patches to exam: ${EXAM_ID}`);
  console.log('');

  // Update marking rules
  for (const [ruleId, updates] of Object.entries(markingRuleUpdates)) {
    try {
      const ruleRef = db.collection('marking_rules').doc(ruleId);
      await ruleRef.update({
        ...updates,
        updatedAt: new Date().toISOString()
      });
      console.log(`✓ Updated marking rule: ${ruleId}`);
    } catch (error) {
      console.error(`✗ Failed to update marking rule ${ruleId}:`, error.message);
    }
  }

  console.log('');

  // Update interactions
  for (const [interactionId, updates] of Object.entries(interactionUpdates)) {
    try {
      const interactionRef = db.collection('interactions').doc(interactionId);
      await interactionRef.update({
        ...updates,
        updatedAt: new Date().toISOString()
      });
      console.log(`✓ Updated interaction: ${interactionId}`);
    } catch (error) {
      console.error(`✗ Failed to update interaction ${interactionId}:`, error.message);
    }
  }

  console.log('');
  console.log('Patch complete. Validate in live authenticated practice mode.');
}

// Run the patch
applyPatches().catch(console.error);
#!/usr/bin/env node

/**
 * Enable full-sentence containing-answer fallback for bounded V2 grammar answers.
 *
 * Dry run:
 *   node scripts/migrate-v2-bounded-answers-full-sentence.cjs <examId>
 *
 * Apply:
 *   node scripts/migrate-v2-bounded-answers-full-sentence.cjs <examId> --apply
 */

const admin = require('firebase-admin');

const PATCHABLE_MARKING_MODES = new Set(['exactMatch', 'alternativeAnswers']);
const EXCLUDED_ITEM_TYPES = new Set([
  'passageComprehension',
  'poemComprehension',
  'essay',
  'composition',
  'pictureStory',
]);
const BOUNDED_PATTERN = /\b(correct form of the word|word given in brackets|one word|one-word|rewrite the sentence giving one word|grammar completion|complete the sentence|fill in|blank)\b|_{3,}/i;

function parseArgs(argv) {
  const args = {
    examId: null,
    apply: false,
    projectId: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') {
      args.apply = true;
    } else if (arg === '--project-id') {
      args.projectId = argv[index + 1] || null;
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (!args.examId) {
      args.examId = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.examId) {
    printUsage();
    throw new Error('examId is required');
  }

  return args;
}

function printUsage() {
  console.log(`Usage:
  node scripts/migrate-v2-bounded-answers-full-sentence.cjs <examId>
  node scripts/migrate-v2-bounded-answers-full-sentence.cjs <examId> --apply

Options:
  --apply                 Patch Firestore. Omit for dry-run.
  --project-id <project>  Optional project id when using ADC.`);
}

function initializeFirebase(projectId) {
  if (admin.apps.length > 0) return;
  admin.initializeApp(projectId ? { projectId } : undefined);
}

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeAnswerText(value) {
  return String(value || '')
    .replace(/[’‘`´]/g, "'")
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"()[\]{}\\/|_~@#$%^&*+=<>-]/g, ' ')
    .replace(/\s+/g, ' ');
}

function wordCount(value) {
  const normalized = normalizeAnswerText(value);
  return normalized ? normalized.split(' ').filter(Boolean).length : 0;
}

function getAcceptedAnswers(rule) {
  return [
    rule.exactAnswer,
    ...(Array.isArray(rule.acceptedAnswers) ? rule.acceptedAnswers : []),
    ...(Array.isArray(rule.alternativeAnswers) ? rule.alternativeAnswers : []),
  ].filter((answer) => typeof answer === 'string' && answer.trim());
}

function hasShortExpectedAnswer(rule) {
  const acceptedAnswers = getAcceptedAnswers(rule);
  return acceptedAnswers.length > 0 && acceptedAnswers.some((answer) => {
    const count = wordCount(answer);
    return count > 0 && count <= 3;
  });
}

function getContextText(item, interaction, instructionGroup) {
  return [
    item.promptMarkdown,
    item.stemMarkdown,
    interaction.promptMarkdown,
    interaction.promptText,
    instructionGroup?.title,
    instructionGroup?.instructionsMarkdown,
  ].map(compact).filter(Boolean).join(' ');
}

function isCandidate(item, interaction, rule, instructionGroup) {
  if (interaction.responseMode !== 'textShort') return { ok: false, reason: `responseMode:${interaction.responseMode}` };
  if (!PATCHABLE_MARKING_MODES.has(rule.markingMode)) return { ok: false, reason: `markingMode:${rule.markingMode}` };
  if (rule.manualReviewRequired === true || interaction.manualReviewDefault === true) return { ok: false, reason: 'manual_review' };
  if (EXCLUDED_ITEM_TYPES.has(item.itemType)) return { ok: false, reason: `excluded_itemType:${item.itemType}` };
  if (!hasShortExpectedAnswer(rule)) return { ok: false, reason: 'expected_answer_not_short' };

  const contextText = getContextText(item, interaction, instructionGroup);
  if (!BOUNDED_PATTERN.test(contextText)) return { ok: false, reason: 'no_bounded_prompt_signal' };

  return { ok: true, contextText };
}

async function getById(db, collectionName, id) {
  if (!id) return null;
  const snap = await db.collection(collectionName).doc(id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  initializeFirebase(args.projectId);
  const db = admin.firestore();

  console.log('V2 bounded-answer full-sentence migration');
  console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY RUN - no writes'}`);
  console.log(`Exam: ${args.examId}`);

  const [itemSnap, interactionSnap] = await Promise.all([
    db.collection('items').where('examId', '==', args.examId).get(),
    db.collection('interactions').where('examId', '==', args.examId).get(),
  ]);

  const itemsById = new Map(itemSnap.docs.map((doc) => [doc.id, { itemId: doc.id, ...doc.data() }]));
  const interactions = interactionSnap.docs
    .map((doc) => ({ interactionId: doc.id, ...doc.data() }))
    .sort((left, right) => {
      const leftItem = itemsById.get(left.itemId);
      const rightItem = itemsById.get(right.itemId);
      return Number(leftItem?.orderIndex || 0) - Number(rightItem?.orderIndex || 0) ||
        Number(left.orderIndex || 0) - Number(right.orderIndex || 0);
    });

  const instructionGroups = new Map();
  const rules = new Map();
  let wouldPatch = 0;
  let patched = 0;
  let alreadyEnabled = 0;
  let skipped = 0;

  for (const interaction of interactions) {
    const item = itemsById.get(interaction.itemId);
    if (!item || !interaction.markingRuleId) {
      skipped += 1;
      continue;
    }

    if (!rules.has(interaction.markingRuleId)) {
      rules.set(interaction.markingRuleId, await getById(db, 'marking_rules', interaction.markingRuleId));
    }
    const rule = rules.get(interaction.markingRuleId);
    if (!rule) {
      skipped += 1;
      continue;
    }

    if (item.instructionGroupId && !instructionGroups.has(item.instructionGroupId)) {
      instructionGroups.set(item.instructionGroupId, await getById(db, 'instruction_groups', item.instructionGroupId));
    }
    const instructionGroup = item.instructionGroupId ? instructionGroups.get(item.instructionGroupId) : null;

    const decision = isCandidate(item, interaction, rule, instructionGroup);
    if (!decision.ok) {
      skipped += 1;
      continue;
    }

    const line = `${item.sourceReference || item.itemId} ${interaction.label || '(unlabelled)'} ${interaction.interactionId} -> ${interaction.markingRuleId}`;
    if (rule.allowFullSentenceContainingAnswer === true) {
      alreadyEnabled += 1;
      console.log(`ALREADY ENABLED ${line}`);
      continue;
    }

    wouldPatch += 1;
    console.log(`${args.apply ? 'PATCH' : 'WOULD PATCH'} ${line}`);
    console.log(`  itemType=${item.itemType} responseMode=${interaction.responseMode} ruleMode=${rule.markingMode} expected=${JSON.stringify(getAcceptedAnswers(rule))}`);
    console.log(`  context=${compact(decision.contextText)}`);

    if (args.apply) {
      await db.collection('marking_rules').doc(interaction.markingRuleId).update({
        allowFullSentenceContainingAnswer: true,
        updatedAt: admin.firestore.Timestamp.now(),
      });
      patched += 1;
    }
  }

  console.log(`Summary: ${args.apply ? 'patched' : 'would patch'} ${args.apply ? patched : wouldPatch} rule(s), already enabled ${alreadyEnabled}, skipped ${skipped}.`);
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

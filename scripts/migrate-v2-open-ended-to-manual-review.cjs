#!/usr/bin/env node

/**
 * Route likely open-ended V2 comprehension/literature answers to teacher review.
 *
 * Dry run:
 *   node scripts/migrate-v2-open-ended-to-manual-review.cjs <examId>
 *
 * Apply:
 *   node scripts/migrate-v2-open-ended-to-manual-review.cjs <examId> --apply
 */

const admin = require('firebase-admin');

const TEXT_RESPONSE_MODES = new Set(['textLong', 'textarea']);
const OPEN_ITEM_TYPES = new Set([
  'passageComprehension',
  'poemComprehension',
  'essay',
  'composition',
  'pictureStory',
]);
const SAFE_AUTO_MODES = new Set([
  'exactMatch',
  'normalizedTextMatch',
  'mcqOptionMatch',
]);
const ALREADY_MANUAL_MODES = new Set([
  'manualReviewRequired',
  'rubricBasedManualReview',
]);
const OPEN_PROMPT_PATTERN = /\b(why|explain|suggest|title|opinion|lesson|infer|inference|interpret|describe|how do you know|what do you think|give reasons?)\b/i;
const BOUNDED_PROMPT_PATTERN = /\b(give another word|same meaning as|one word|one-word|choose|select|rewrite|complete the sentence|fill in)\b/i;

const EXPLICIT_MANUAL_REVIEW_CONFIG = [
  {
    name: 'PLE English 2024 Q51(c)-(j)',
    itemSourceReferenceIncludes: 'Question 51',
    labels: new Set(['(c)', '(d)', '(e)', '(f)', '(g)', '(h)', '(i)', '(j)']),
  },
];

const EXPLICIT_DO_NOT_TOUCH_CONFIG = [
  {
    name: 'PLE English 2024 Q51(a)-(b) direct factual answers',
    itemSourceReferenceIncludes: 'Question 51',
    labels: new Set(['(a)', '(b)']),
  },
];

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
  node scripts/migrate-v2-open-ended-to-manual-review.cjs <examId>
  node scripts/migrate-v2-open-ended-to-manual-review.cjs <examId> --apply

Options:
  --apply                 Patch Firestore. Omit for dry-run.
  --project-id <project>  Optional project id when using ADC.`);
}

function initializeFirebase(projectId) {
  if (admin.apps.length > 0) return;
  admin.initializeApp(projectId ? { projectId } : undefined);
}

function normalizeText(value) {
  return String(value || '').trim();
}

function isExplicitlyConfigured(item, interaction) {
  return EXPLICIT_MANUAL_REVIEW_CONFIG.find((config) => (
    typeof item.sourceReference === 'string' &&
    item.sourceReference.includes(config.itemSourceReferenceIncludes) &&
    config.labels.has(interaction.label)
  ));
}

function isExplicitlySkipped(item, interaction) {
  return EXPLICIT_DO_NOT_TOUCH_CONFIG.find((config) => (
    typeof item.sourceReference === 'string' &&
    item.sourceReference.includes(config.itemSourceReferenceIncludes) &&
    config.labels.has(interaction.label)
  ));
}

function isLikelyOpenEnded(item, interaction) {
  if (!TEXT_RESPONSE_MODES.has(interaction.responseMode)) return false;
  if (item.itemType === 'rewrite') return false;

  const prompt = [
    item.promptMarkdown,
    item.stemMarkdown,
    interaction.promptMarkdown,
    interaction.promptText,
  ].map(normalizeText).filter(Boolean).join(' ');

  if (BOUNDED_PROMPT_PATTERN.test(prompt)) return false;
  if (OPEN_ITEM_TYPES.has(item.itemType)) return true;

  return OPEN_PROMPT_PATTERN.test(prompt);
}

function shouldSkipSafeAuto(rule, explicitConfig) {
  if (explicitConfig) return false;
  return SAFE_AUTO_MODES.has(rule.markingMode);
}

function shouldPatch(item, interaction, rule) {
  const explicitSkip = isExplicitlySkipped(item, interaction);
  if (explicitSkip) {
    return { patch: false, reason: `explicit_skip:${explicitSkip.name}` };
  }

  const explicitConfig = isExplicitlyConfigured(item, interaction);
  if (!explicitConfig && !isLikelyOpenEnded(item, interaction)) {
    return { patch: false, reason: 'not_open_ended' };
  }
  if (shouldSkipSafeAuto(rule, explicitConfig)) {
    return { patch: false, reason: `safe_auto_mode:${rule.markingMode}` };
  }
  if (!TEXT_RESPONSE_MODES.has(interaction.responseMode)) {
    return { patch: false, reason: `non_text_response:${interaction.responseMode}` };
  }

  return {
    patch: true,
    explicitConfig,
    reason: explicitConfig ? explicitConfig.name : 'open_ended_policy',
  };
}

function buildRulePatch(rule, reason) {
  const existingNotes = typeof rule.notes === 'string' ? rule.notes.trim() : '';
  const policyNote = `Manual review required by open-ended V2 marking policy (${reason}).`;

  return {
    markingMode: 'manualReviewRequired',
    manualReviewRequired: true,
    notes: existingNotes && !existingNotes.includes(policyNote)
      ? `${existingNotes}\n\n${policyNote}`
      : existingNotes || policyNote,
    updatedAt: admin.firestore.Timestamp.now(),
  };
}

async function getByIds(db, collectionName, ids) {
  const entries = await Promise.all(
    [...ids].map(async (id) => {
      const snap = await db.collection(collectionName).doc(id).get();
      return snap.exists ? [id, { id: snap.id, ...snap.data() }] : null;
    }),
  );
  return new Map(entries.filter(Boolean));
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  initializeFirebase(args.projectId);
  const db = admin.firestore();

  console.log('V2 open-ended manual-review migration');
  console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY RUN - no writes'}`);
  console.log(`Exam: ${args.examId}`);

  const [itemSnap, interactionSnap] = await Promise.all([
    db.collection('items').where('examId', '==', args.examId).get(),
    db.collection('interactions').where('examId', '==', args.examId).get(),
  ]);

  const items = itemSnap.docs
    .map((doc) => ({ itemId: doc.id, ...doc.data() }))
    .sort((left, right) => Number(left.orderIndex || 0) - Number(right.orderIndex || 0));
  const itemById = new Map(items.map((item) => [item.itemId, item]));
  const interactions = interactionSnap.docs
    .map((doc) => ({ interactionId: doc.id, ...doc.data() }))
    .sort((left, right) => {
      const leftItem = itemById.get(left.itemId);
      const rightItem = itemById.get(right.itemId);
      return Number(leftItem?.orderIndex || 0) - Number(rightItem?.orderIndex || 0) ||
        Number(left.orderIndex || 0) - Number(right.orderIndex || 0);
    });
  const ruleIds = new Set(interactions.map((interaction) => interaction.markingRuleId).filter(Boolean));
  const rulesById = await getByIds(db, 'marking_rules', ruleIds);

  console.log(`Scanned ${items.length} item(s), ${interactions.length} interaction(s), ${rulesById.size} marking rule(s).`);

  let wouldPatch = 0;
  let patched = 0;
  let alreadyManual = 0;
  let skipped = 0;

  for (const interaction of interactions) {
    const item = itemById.get(interaction.itemId);
    const rule = interaction.markingRuleId ? rulesById.get(interaction.markingRuleId) : null;

    if (!item || !rule) {
      skipped += 1;
      continue;
    }

    const decision = shouldPatch(item, interaction, rule);
    if (!decision.patch) {
      skipped += 1;
      continue;
    }

    const needsRulePatch = !ALREADY_MANUAL_MODES.has(rule.markingMode) || rule.manualReviewRequired !== true;
    const needsInteractionPatch = interaction.manualReviewDefault !== true;

    const label = interaction.label || '(unlabelled)';
    const prompt = normalizeText(interaction.promptMarkdown || interaction.promptText).replace(/\s+/g, ' ');
    const line = `${item.sourceReference || item.itemId} ${label} ${interaction.interactionId} -> ${interaction.markingRuleId}`;

    if (!needsRulePatch && !needsInteractionPatch) {
      alreadyManual += 1;
      console.log(`ALREADY MANUAL ${line}`);
      continue;
    }

    wouldPatch += 1;
    console.log(`${args.apply ? 'PATCH' : 'WOULD PATCH'} ${line}`);
    console.log(`  itemType=${item.itemType} responseMode=${interaction.responseMode} ruleMode=${rule.markingMode} reason=${decision.reason}`);
    if (prompt) console.log(`  prompt=${prompt}`);

    if (args.apply) {
      const writes = [];
      if (needsRulePatch) {
        writes.push(db.collection('marking_rules').doc(interaction.markingRuleId).update(buildRulePatch(rule, decision.reason)));
      }
      if (needsInteractionPatch) {
        writes.push(db.collection('interactions').doc(interaction.interactionId).update({
          manualReviewDefault: true,
          updatedAt: admin.firestore.Timestamp.now(),
        }));
      }
      await Promise.all(writes);
      patched += 1;
    }
  }

  console.log(`Summary: ${args.apply ? 'patched' : 'would patch'} ${args.apply ? patched : wouldPatch} interaction(s), already manual ${alreadyManual}, skipped ${skipped}.`);
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

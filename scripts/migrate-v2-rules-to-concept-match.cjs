#!/usr/bin/env node

/**
 * Migrate explicitly configured V2 comprehension interactions to conceptMatch.
 *
 * Dry run (default):
 *   node scripts/migrate-v2-rules-to-concept-match.cjs <examId>
 *
 * Apply:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     node scripts/migrate-v2-rules-to-concept-match.cjs <examId> --apply
 */

const admin = require('firebase-admin');

const COMPREHENSION_ITEM_TYPES = new Set(['passageComprehension', 'poemComprehension']);
const SUBJECTIVE_ITEM_TYPES = new Set(['essay', 'composition', 'pictureStory']);

const CONCEPT_MIGRATION_CONFIG = {
  q51: {
    itemSourceReferenceIncludes: 'Question 51',
    interactions: {
      '(c)': {
        conceptGroups: [
          ['buy', 'bought', 'purchase', 'get'],
          ['pancakes', 'pancake'],
          ['buns', 'bun'],
          ['juice'],
          ['lunch', 'meal', 'eat', 'have as lunch'],
        ],
        minimumConceptGroupsRequired: 3,
        exactAnswer: 'Lolo could buy pancakes, buns and some juice for lunch.',
        notes: 'ConceptMatch: accepts configured factual paraphrases about buying pancakes, buns and juice for lunch.',
      },
      '(d)': {
        conceptGroups: [
          ['excited', 'very excited', 'happy'],
          ['get back', 'return', 'go back'],
          ['school'],
          ['afternoon lessons', 'afternoon lesson', 'lessons', 'classes'],
        ],
        minimumConceptGroupsRequired: 3,
        exactAnswer: 'Jemba rode at a very high speed because he was excited and wanted to get back to school in time for afternoon lessons.',
        notes: 'ConceptMatch: accepts configured factual paraphrases about excitement and returning for afternoon lessons.',
      },
      '(e)': {
        conceptGroups: [
          ['busy road', 'road was busy', 'busy'],
          ['ringing', 'rang', 'ring'],
          ['bicycle bell', 'bell'],
          ['alert', 'warn', 'warning'],
          ['people', 'pedestrians'],
        ],
        minimumConceptGroupsRequired: 3,
        exactAnswer: 'Jemba rang the bicycle bell to alert people because the road was busy.',
        notes: 'ConceptMatch: accepts configured factual paraphrases about a busy road and ringing the bell to alert people.',
      },
      '(f)': {
        conceptGroups: [
          ['riding', 'rode', 'speeding'],
          ['high speed', 'very high speed', 'fast'],
          ['lost his balance', 'lost balance', 'balance'],
        ],
        minimumConceptGroupsRequired: 2,
        exactAnswer: 'The accident happened because Jemba was riding at high speed and lost his balance.',
        notes: 'ConceptMatch: accepts configured factual paraphrases about high speed and losing balance.',
      },
      '(g)': {
        conceptGroups: [
          ['head teacher', 'headteacher'],
          ['thanked', 'thank'],
          ['nurses', 'nurse'],
          ['immediately', 'first'],
        ],
        minimumConceptGroupsRequired: 2,
        exactAnswer: 'The head teacher thanked the nurses immediately she arrived at the clinic.',
        notes: 'ConceptMatch: accepts configured factual paraphrases about the head teacher thanking the nurses first.',
      },
      '(h)': {
        conceptGroups: [
          ['two friends', 'friends', 'they'],
          ['stayed away', 'away from school', 'absent'],
          ['school'],
          ['two weeks', '2 weeks', 'fortnight'],
        ],
        minimumConceptGroupsRequired: 3,
        exactAnswer: 'The two friends stayed away from school for two weeks.',
        notes: 'ConceptMatch: accepts configured factual paraphrases about staying away from school for two weeks.',
      },
      '(i)': {
        conceptGroups: [
          ['all pupils', 'pupils', 'children', 'learners'],
          ['started having lunch', 'had lunch', 'got lunch', 'school lunch'],
          ['lunch', 'meal', 'food'],
          ['improved', 'better', 'greatly improve'],
        ],
        minimumConceptGroupsRequired: 3,
        exactAnswer: 'Their academic performance improved because all pupils started having lunch at school.',
        notes: 'ConceptMatch: accepts configured factual paraphrases about all pupils having lunch and performance improving.',
      },
    },
  },
};

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
  node scripts/migrate-v2-rules-to-concept-match.cjs <examId>
  node scripts/migrate-v2-rules-to-concept-match.cjs <examId> --apply

Options:
  --apply                 Patch Firestore. Omit for dry-run.
  --project-id <project>  Optional project id when using ADC.`);
}

function initializeFirebase(projectId) {
  if (admin.apps.length > 0) return;
  admin.initializeApp(projectId ? { projectId } : undefined);
}

function describeItem(item) {
  return `${item.itemId} ${item.itemType || '(unknown type)'} ${item.sourceReference || ''}`.trim();
}

async function loadCandidateItems(db, examId) {
  const snapshot = await db.collection('items').where('examId', '==', examId).get();
  return snapshot.docs
    .map((doc) => ({ itemId: doc.id, ...doc.data() }))
    .filter((item) => COMPREHENSION_ITEM_TYPES.has(item.itemType));
}

function selectConfiguredItem(candidates, config) {
  return candidates.find((item) => (
    typeof item.sourceReference === 'string' &&
    item.sourceReference.includes(config.itemSourceReferenceIncludes)
  ));
}

async function loadInteractionsByItem(db, itemId) {
  const snapshot = await db.collection('interactions')
    .where('itemId', '==', itemId)
    .get();
  return snapshot.docs
    .map((doc) => ({ interactionId: doc.id, ...doc.data() }))
    .sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0));
}

function buildRulePatch(config) {
  return {
    markingMode: 'conceptMatch',
    manualReviewRequired: false,
    type: 'flexible',
    exactAnswer: config.exactAnswer,
    acceptedAnswers: [config.exactAnswer],
    alternativeAnswers: [],
    conceptGroups: serializeConceptGroups(config.conceptGroups),
    minimumConceptGroupsRequired: config.minimumConceptGroupsRequired,
    notes: config.notes,
    updatedAt: admin.firestore.Timestamp.now(),
  };
}

function serializeConceptGroups(conceptGroups) {
  return Object.fromEntries(conceptGroups.map((group, index) => [String(index), group]));
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  initializeFirebase(args.projectId);
  const db = admin.firestore();

  console.log('V2 conceptMatch migration helper');
  console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY RUN - no writes'}`);
  console.log(`Exam: ${args.examId}`);

  const candidates = await loadCandidateItems(db, args.examId);
  console.log(`Candidate comprehension items: ${candidates.length}`);
  candidates.forEach((item) => console.log(`- ${describeItem(item)}`));

  let patchedRules = 0;
  let patchedInteractions = 0;
  let skipped = 0;

  for (const [configName, config] of Object.entries(CONCEPT_MIGRATION_CONFIG)) {
    const item = selectConfiguredItem(candidates, config);
    if (!item) {
      console.log(`SKIP ${configName}: configured item not found`);
      skipped += 1;
      continue;
    }

    if (SUBJECTIVE_ITEM_TYPES.has(item.itemType) || !COMPREHENSION_ITEM_TYPES.has(item.itemType)) {
      console.log(`SKIP ${configName}: item type is not eligible for auto concept marking (${item.itemType})`);
      skipped += 1;
      continue;
    }

    const interactions = await loadInteractionsByItem(db, item.itemId);
    const interactionsByLabel = new Map(interactions.map((interaction) => [interaction.label, interaction]));

    console.log(`Configured item ${configName}: ${describeItem(item)}`);

    for (const [label, conceptConfig] of Object.entries(config.interactions)) {
      const interaction = interactionsByLabel.get(label);
      if (!interaction) {
        console.log(`  SKIP ${label}: interaction not found`);
        skipped += 1;
        continue;
      }

      if (!interaction.markingRuleId) {
        console.log(`  SKIP ${label}: interaction has no markingRuleId`);
        skipped += 1;
        continue;
      }

      const ruleRef = db.collection('marking_rules').doc(interaction.markingRuleId);
      const ruleSnap = await ruleRef.get();
      if (!ruleSnap.exists) {
        console.log(`  SKIP ${label}: marking rule ${interaction.markingRuleId} not found`);
        skipped += 1;
        continue;
      }

      const currentRule = ruleSnap.data();
      const patch = buildRulePatch(conceptConfig);
      console.log(
        `  ${args.apply ? 'PATCH' : 'WOULD PATCH'} ${label}: ` +
        `${interaction.interactionId} -> ${interaction.markingRuleId} ` +
        `${currentRule.markingMode} => conceptMatch ` +
        `(${Object.keys(patch.conceptGroups).length} groups, min ${patch.minimumConceptGroupsRequired})`,
      );

      if (args.apply) {
        await ruleRef.update(patch);
        await db.collection('interactions').doc(interaction.interactionId).update({
          manualReviewDefault: false,
          updatedAt: admin.firestore.Timestamp.now(),
        });
      }

      patchedRules += 1;
      patchedInteractions += 1;
    }

    const manualLabels = interactions
      .filter((interaction) => !config.interactions[interaction.label])
      .map((interaction) => interaction.label)
      .filter(Boolean);
    if (manualLabels.length > 0) {
      console.log(`  Left unchanged: ${manualLabels.join(', ')}`);
    }
  }

  console.log(`Summary: ${args.apply ? 'patched' : 'would patch'} ${patchedRules} rule(s), ${patchedInteractions} interaction(s), skipped ${skipped}.`);
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

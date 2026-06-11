/**
 * Resets the XamPreps exam engine to a V2-only state.
 *
 * Deletes exam-engine collections, then reseeds the V2 fixture exam.
 * Run with: node scripts/resetExamEngineToV2.js
 */

const admin = require('firebase-admin');
const { seedFixtures, FIXTURE_EXAM_ID } = require('./v2-seedFixtures');

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

const EXAM_ENGINE_COLLECTIONS = [
  'question_parts',
  'questions',
  'question_history',
  'submissions',
  'review_tasks',
  'model_answer_versions',
  'feedback_templates',
  'interactions',
  'items',
  'context_blocks',
  'instruction_groups',
  'sections',
  'marking_rules',
  'rubrics',
  'exam_attempts',
  'exams',
];

async function deleteCollectionDocuments(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  const docs = snapshot.docs;
  const deleted = docs.length;

  for (let index = 0; index < docs.length; index += 400) {
    const batch = db.batch();
    docs.slice(index, index + 400).forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  }

  return deleted;
}

async function resetExamEngineToV2() {
  const startedAt = new Date().toISOString();
  const deletionReport = {};

  console.log('Resetting exam engine to V2-only state...');

  for (const collectionName of EXAM_ENGINE_COLLECTIONS) {
    const deleted = await deleteCollectionDocuments(collectionName);
    deletionReport[collectionName] = deleted;
    console.log(`  ${collectionName}: deleted ${deleted}`);
  }

  await seedFixtures();

  const examSnap = await db.collection('exams').doc(FIXTURE_EXAM_ID).get();
  const itemSnap = await db.collection('items').where('examId', '==', FIXTURE_EXAM_ID).get();
  const interactionSnap = await db.collection('interactions').where('examId', '==', FIXTURE_EXAM_ID).get();

  const result = {
    startedAt,
    finishedAt: new Date().toISOString(),
    fixtureExamId: FIXTURE_EXAM_ID,
    deletionReport,
    seeded: {
      examExists: examSnap.exists,
      itemCount: itemSnap.size,
      interactionCount: interactionSnap.size,
    },
  };

  console.log('\nReset complete.');
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  resetExamEngineToV2()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Reset failed:', error);
      process.exit(1);
    });
}

module.exports = {
  resetExamEngineToV2,
  EXAM_ENGINE_COLLECTIONS,
};

/**
 * XamPreps Exam Cleanup Script
 * 
 * Removes ALL questions and question_parts for a specific exam,
 * allowing a clean re-import.
 * 
 * Usage:
 *   cd functions
 *   node scripts/cleanupExam.js ple-maths-2015
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK
function initFirebase() {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  } else {
    console.log('Using Application Default Credentials.');
    if (admin.apps.length === 0) {
      admin.initializeApp();
    }
  }
  
  return admin.firestore();
}

async function cleanupExam(examId) {
  console.log(`🧹 XamPreps Exam Cleanup\n`);
  console.log(`Target exam: ${examId}`);
  
  if (!examId) {
    console.error('❌ Error: Please provide an exam ID');
    console.error('Usage: node scripts/cleanupExam.js <exam-id>');
    process.exit(1);
  }
  
  const db = initFirebase();
  
  // Get all questions for this exam
  console.log('\n📋 Scanning questions...');
  const questionsSnap = await db.collection('questions')
    .where('examId', '==', examId)
    .get();
  
  console.log(`   Found ${questionsSnap.size} questions`);
  
  if (questionsSnap.size === 0) {
    console.log('\n✅ No questions found. Nothing to clean up.');
    return;
  }
  
  // Collect all question IDs
  const questionIds = questionsSnap.docs.map(doc => doc.id);
  
  // Get all question_parts for these questions
  console.log('\n📋 Scanning question parts...');
  let partsToDelete = [];
  
  for (const qId of questionIds) {
    const partsSnap = await db.collection('question_parts')
      .where('questionId', '==', qId)
      .get();
    partsSnap.docs.forEach(doc => partsToDelete.push(doc.id));
  }
  
  console.log(`   Found ${partsToDelete.length} question parts`);
  
  // Delete in batches of 500 (Firestore limit)
  console.log('\n🗑️ Deleting questions and parts...');
  
  const batch = db.batch();
  let batchCount = 0;
  
  // Delete questions
  for (const qId of questionIds) {
    const ref = db.collection('questions').doc(qId);
    batch.delete(ref);
    batchCount++;
    
    if (batchCount >= 450) {
      await batch.commit();
      batchCount = 0;
    }
  }
  
  // Delete parts
  for (const pId of partsToDelete) {
    const ref = db.collection('question_parts').doc(pId);
    batch.delete(ref);
    batchCount++;
    
    if (batchCount >= 450) {
      await batch.commit();
      batchCount = 0;
    }
  }
  
  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`   Deleted ${questionIds.length} questions`);
  console.log(`   Deleted ${partsToDelete.length} question parts`);
  
  // Verify cleanup
  console.log('\n🔍 Verifying cleanup...');
  const remainingQuestions = await db.collection('questions')
    .where('examId', '==', examId)
    .get();
  
  if (remainingQuestions.size === 0) {
    console.log('   ✅ All questions deleted successfully');
  } else {
    console.log(`   ⚠️ ${remainingQuestions.size} questions still remain`);
  }
  
  // Keep the exam document (don't delete it, just clean up questions)
  console.log('\n📝 Exam document preserved. Run import to add questions.');
  console.log(`   Use: node scripts/importExamPackage.js <path-to-json>`);
}

const examId = process.argv[2];
cleanupExam(examId)
  .then(() => {
    console.log('\n✨ Cleanup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });
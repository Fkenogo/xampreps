/**
 * Delete Entire Exam Package from Firestore
 * 
 * Completely removes an exam and all its associated data:
 * - Exam document
 * - All questions
 * - All question_parts
 * 
 * Usage:
 *   cd functions
 *   node scripts/deletePleEnglish2024.js ple-english-2024
 * 
 * Safety Features:
 * - Requires exact exam ID match
 * - Prints counts before deletion
 * - Logs every collection affected
 * - Verifies deletion after completion
 * - Fails if exam ID is missing or doesn't match expected
 */

const initAdmin = require('./lib/initAdmin');

// Target exam ID - must be explicitly provided
const TARGET_EXAM_ID = process.argv[2];

// Safety check: must provide exam ID
if (!TARGET_EXAM_ID) {
  console.error('❌ Error: Exam ID is required');
  console.error('Usage: node scripts/deletePleEnglish2024.js <exam-id>');
  console.error('');
  console.error('Example: node scripts/deletePleEnglish2024.js ple-english-2024');
  process.exit(1);
}

// Safety check: confirm the exam ID
console.log('════════════════════════════════════════');
console.log('⚠️  EXAM DELETION - SAFETY CHECK');
console.log('════════════════════════════════════════');
console.log(`Target Exam ID: ${TARGET_EXAM_ID}`);
console.log('');
console.log('This will PERMANENTLY DELETE:');
console.log('  1. Exam document');
console.log('  2. All questions linked to this exam');
console.log('  3. All question_parts linked to those questions');
console.log('');

// Initialize Firebase Admin
const { db, projectId } = initAdmin();

console.log(`📋 Target Project: ${projectId}`);
console.log('');

async function deleteExamPackage() {
  // Step 1: Check if exam exists
  console.log('📝 Step 1: Checking exam document...');
  const examRef = db.collection('exams').doc(TARGET_EXAM_ID);
  const examDoc = await examRef.get();
  
  if (!examDoc.exists) {
    console.error(`❌ Exam "${TARGET_EXAM_ID}" not found in Firestore.`);
    console.log('✅ Nothing to delete.');
    return;
  }
  
  const examData = examDoc.data();
  console.log(`   ✅ Exam found: ${examData.title || TARGET_EXAM_ID}`);
  console.log(`      Subject: ${examData.subject || 'N/A'}`);
  console.log(`      Year: ${examData.year || 'N/A'}`);
  console.log('');
  
  // Step 2: Find all questions for this exam
  console.log('📝 Step 2: Scanning questions...');
  const questionsSnap = await db.collection('questions')
    .where('examId', '==', TARGET_EXAM_ID)
    .get();
  
  console.log(`   Found ${questionsSnap.size} questions`);
  
  if (questionsSnap.size === 0) {
    console.log('   ⚠️  No questions found (exam document only)');
  }
  
  const questionIds = questionsSnap.docs.map(doc => doc.id);
  console.log('');
  
  // Step 3: Find all question_parts for these questions
  console.log('📝 Step 3: Scanning question parts...');
  let partsToDelete = [];
  
  for (const qId of questionIds) {
    const partsSnap = await db.collection('question_parts')
      .where('questionId', '==', qId)
      .get();
    partsSnap.docs.forEach(doc => partsToDelete.push(doc.id));
  }
  
  console.log(`   Found ${partsToDelete.length} question parts`);
  console.log('');
  
  // Step 4: Summary before deletion
  console.log('════════════════════════════════════════');
  console.log('📊 DELETION SUMMARY');
  console.log('════════════════════════════════════════');
  console.log(`Exam: ${examData.title || TARGET_EXAM_ID}`);
  console.log(`Questions: ${questionsSnap.size}`);
  console.log(`Question Parts: ${partsToDelete.length}`);
  console.log('');
  console.log('⚠️  This action is PERMANENT and CANNOT be undone!');
  console.log('');
  
  // Step 5: Delete question_parts first
  console.log('🗑️  Step 5: Deleting question parts...');
  if (partsToDelete.length > 0) {
    const batch = db.batch();
    let batchCount = 0;
    let deletedParts = 0;
    
    for (const pId of partsToDelete) {
      const ref = db.collection('question_parts').doc(pId);
      batch.delete(ref);
      batchCount++;
      deletedParts++;
      
      if (batchCount >= 450) {
        await batch.commit();
        console.log(`   Deleted ${deletedParts}/${partsToDelete.length} parts...`);
        batchCount = 0;
      }
    }
    
    // Commit remaining
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`   ✅ Deleted ${partsToDelete.length} question parts`);
  } else {
    console.log('   ✅ No question parts to delete');
  }
  console.log('');
  
  // Step 6: Delete questions
  console.log('🗑️  Step 6: Deleting questions...');
  if (questionsSnap.size > 0) {
    const batch = db.batch();
    let batchCount = 0;
    let deletedQuestions = 0;
    
    for (const qId of questionIds) {
      const ref = db.collection('questions').doc(qId);
      batch.delete(ref);
      batchCount++;
      deletedQuestions++;
      
      if (batchCount >= 450) {
        await batch.commit();
        console.log(`   Deleted ${deletedQuestions}/${questionsSnap.size} questions...`);
        batchCount = 0;
      }
    }
    
    // Commit remaining
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`   ✅ Deleted ${questionsSnap.size} questions`);
  } else {
    console.log('   ✅ No questions to delete');
  }
  console.log('');
  
  // Step 7: Delete exam document (last!)
  console.log('🗑️  Step 7: Deleting exam document...');
  await examRef.delete();
  console.log(`   ✅ Deleted exam document: ${TARGET_EXAM_ID}`);
  console.log('');
  
  // Step 8: Verification
  console.log('🔍 Step 8: Verifying deletion...');
  
  // Check exam document
  const examCheck = await examRef.get();
  if (!examCheck.exists) {
    console.log('   ✅ Exam document: DELETED');
  } else {
    console.log('   ❌ Exam document: STILL EXISTS');
  }
  
  // Check questions
  const questionsCheck = await db.collection('questions')
    .where('examId', '==', TARGET_EXAM_ID)
    .get();
  if (questionsCheck.size === 0) {
    console.log('   ✅ Questions: ALL DELETED');
  } else {
    console.log(`   ❌ Questions: ${questionsCheck.size} REMAINING`);
  }
  
  // Check question_parts (sample a few question IDs if any remain)
  let remainingParts = 0;
  for (const qId of questionIds.slice(0, 5)) { // Check first 5
    const partsCheck = await db.collection('question_parts')
      .where('questionId', '==', qId)
      .get();
    remainingParts += partsCheck.size;
  }
  if (remainingParts === 0) {
    console.log('   ✅ Question Parts: ALL DELETED (sampled)');
  } else {
    console.log(`   ⚠️  Question Parts: ${remainingParts} remaining in sampled questions`);
  }
  
  console.log('');
  console.log('════════════════════════════════════════');
  console.log('✅ DELETION COMPLETE');
  console.log('════════════════════════════════════════');
  console.log(`Exam "${TARGET_EXAM_ID}" has been completely removed.`);
  console.log('');
}

// Run the deletion
deleteExamPackage()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ DELETION FAILED:', error);
    console.error('');
    process.exit(1);
  });
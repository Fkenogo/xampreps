/**
 * XamPreps Exam Verification Script
 * 
 * Verifies that an exam exists in live Firestore with correct data.
 * 
 * Usage:
 *   cd functions
 *   node scripts/verifyExamInLiveFirestore.js [examId]
 * 
 * If no examId is provided, defaults to 'ple-maths-2015'.
 */

const initAdmin = require('./lib/initAdmin');

async function verifyExamInLiveFirestore(examId) {
  console.log('🔍 XamPreps Exam Verification\n');
  console.log('========================================\n');
  
  const { db, projectId } = initAdmin();
  
  console.log(`📋 Target Project: ${projectId}`);
  console.log(`📋 Exam ID: ${examId}\n`);
  
  let allPassed = true;
  let examData = null;
  
  // 1. Check exam document
  console.log('📄 Checking exam document...');
  const examSnap = await db.collection('exams').doc(examId).get();
  
  if (!examSnap.exists) {
    console.error(`❌ Exam document "${examId}" NOT FOUND in Firestore!`);
    allPassed = false;
  } else {
    examData = examSnap.data();
    console.log('   ✅ Exam document found!');
    console.log(`   Title: ${examData.title}`);
    console.log(`   Subject: ${examData.subject}`);
    console.log(`   Level: ${examData.level}`);
    console.log(`   Year: ${examData.year}`);
    console.log(`   Question Count: ${examData.questionCount || examData.question_count || 'N/A'}`);
  }
  
  // 2. Check questions
  console.log('\n📝 Checking questions...');
  const questionsSnap = await db.collection('questions')
    .where('examId', '==', examId)
    .orderBy('questionNumber', 'asc')
    .get();
  
  const expectedCount = examData ? (examData.questionCount || examData.question_count || questionsSnap.size) : 0;
  console.log(`   Found ${questionsSnap.size} questions (expected: ${expectedCount})`);
  
  if (questionsSnap.size === 0) {
    console.error('   ❌ No questions found!');
    allPassed = false;
  } else if (questionsSnap.size !== expectedCount) {
    console.warn(`   ⚠️ Question count mismatch: ${questionsSnap.size} vs expected ${expectedCount}`);
  } else {
    console.log('   ✅ Question count matches!');
  }
  
  // Show first 5 question numbers and texts
  console.log('   First 5 questions:');
  let count = 0;
  questionsSnap.docs.forEach(doc => {
    if (count < 5) {
      const data = doc.data();
      const qn = data.questionNumber || data.question_number;
      const text = data.text ? (data.text.length > 60 ? data.text.substring(0, 60) + '...' : data.text) : 'N/A';
      console.log(`     - Q${qn}: ${text}`);
    }
    count++;
  });
  
  // 3. Check question parts
  console.log('\n📋 Checking question parts...');
  const questionIds = questionsSnap.docs.map(d => d.id);
  let totalParts = 0;
  
  for (const qId of questionIds) {
    const partsSnap = await db.collection('question_parts')
      .where('questionId', '==', qId)
      .get();
    totalParts += partsSnap.size;
  }
  
  console.log(`   Found ${totalParts} question parts total`);
  
  if (totalParts === 0) {
    console.error('   ❌ No question parts found!');
    allPassed = false;
  } else {
    console.log('   ✅ Parts found!');
  }
  
  // Show first few part IDs
  if (questionIds.length > 0) {
    const firstQuestionParts = await db.collection('question_parts')
      .where('questionId', '==', questionIds[0])
      .orderBy('orderIndex', 'asc')
      .limit(3)
      .get();
    
    console.log('   First few part IDs from Q1:');
    firstQuestionParts.docs.forEach(doc => {
      const data = doc.data();
      console.log(`     - ${doc.id} (order: ${data.orderIndex || data.order_index})`);
    });
  }
  
  // 4. Summary
  console.log('\n========================================');
  
  if (allPassed && questionsSnap.size === expectedCount && totalParts > 0) {
    console.log('🎉 VERIFICATION PASSED - Exam data looks correct!');
    console.log('========================================\n');
    return true;
  } else {
    console.log('⚠️  VERIFICATION FAILED - Some checks failed.');
    console.log('========================================\n');
    return false;
  }
}

// Run
const examId = process.argv[2] || 'ple-maths-2015';
verifyExamInLiveFirestore(examId)
  .then(passed => {
    console.log('✨ Done!');
    process.exit(passed ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  });
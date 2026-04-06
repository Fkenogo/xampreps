/**
 * XamPreps Exam Package Import Script (Idempotent)
 * 
 * Imports a complete exam package (exam metadata + questions + parts) to Firestore.
 * This version is idempotent - it checks for existing data before inserting.
 * 
 * Usage:
 *   cd functions
 *   node scripts/importExamPackage.js ../docs/imports/ple-maths-2015.final.import.json
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
    console.log('Make sure you have run: gcloud auth application-default login');
    if (admin.apps.length === 0) {
      admin.initializeApp();
    }
  }
  
  return admin.firestore();
}

// Main import function
async function importExamPackage(jsonFilePath) {
  console.log('📦 XamPreps Exam Package Importer (Idempotent)\n');
  
  // Read the import JSON
  if (!jsonFilePath) {
    console.error('❌ Error: Please provide the path to the import JSON file');
    console.error('Usage: node scripts/importExamPackage.js <path-to-json>');
    process.exit(1);
  }
  
  const fullPath = path.resolve(jsonFilePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Error: File not found: ${fullPath}`);
    process.exit(1);
  }
  
  const questions = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  if (!Array.isArray(questions)) {
    console.error('❌ Error: JSON must be an array of questions');
    process.exit(1);
  }
  
  console.log(`📄 Loaded ${questions.length} questions from ${fullPath}\n`);
  
  // Initialize Firestore
  const db = initFirebase();
  const examId = 'ple-maths-2015';
  
  // Check if exam already exists
  const examRef = db.collection('exams').doc(examId);
  const examSnap = await examRef.get();
  
  if (examSnap.exists) {
    console.log('⚠️ Exam already exists. Checking for completeness...');
    const existingData = examSnap.data();
    console.log(`   Current question count: ${existingData.questionCount || existingData.question_count || 'N/A'}`);
    
    // Check existing questions
    const existingQuestions = await db.collection('questions')
      .where('examId', '==', examId)
      .get();
    console.log(`   Questions in database: ${existingQuestions.size}`);
    
    if (existingQuestions.size === questions.length) {
      console.log('\n✅ Exam is already complete. No action needed.');
      console.log(`   Exam ID: ${examId}`);
      console.log(`   Student view: /exam/${examId}?mode=practice`);
      return;
    }
    
    if (existingQuestions.size > questions.length) {
      console.log(`\n⚠️ Found ${existingQuestions.size} questions (expected ${questions.length}).`);
      console.log('   This indicates duplicate imports. Run cleanup first.');
      console.log('   Use: node scripts/cleanupExam.js ' + examId);
      process.exit(1);
    }
    
    // Partial import - need to add missing questions
    console.log(`\n📝 Adding missing questions (${questions.length - existingQuestions.size} needed)...\n`);
  }
  
  // Exam metadata
  const examMetadata = {
    title: 'PLE Mathematics 2015',
    subject: 'Mathematics',
    level: 'PLE',
    year: 2015,
    type: 'Past Paper',
    difficulty: 'Medium',
    timeLimit: 150,
    time_limit: 150,
    isFree: true,
    is_free: true,
    description: 'Uganda National Examinations Board (UNEB) PLE Mathematics 2015',
    topic: null,
    explanationPdfUrl: null,
    explanation_pdf_url: null,
    questionCount: questions.length,
    question_count: questions.length,
    createdAt: examSnap.exists ? (examSnap.data().createdAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  console.log('📝 Creating/updating exam metadata...');
  console.log(`   ID: ${examId}`);
  console.log(`   Title: ${examMetadata.title}`);
  console.log(`   Subject: ${examMetadata.subject}`);
  console.log(`   Level: ${examMetadata.level}`);
  console.log(`   Year: ${examMetadata.year}`);
  console.log(`   Questions: ${examMetadata.questionCount}`);
  
  // Get existing question numbers to avoid duplicates
  const existingQuestions = await db.collection('questions')
    .where('examId', '==', examId)
    .get();
  
  const existingQuestionNumbers = new Set();
  existingQuestions.docs.forEach(doc => {
    const data = doc.data();
    const qn = data.question_number || data.questionNumber;
    if (qn !== undefined) {
      existingQuestionNumbers.add(qn);
    }
  });
  
  console.log(`   Existing question numbers: ${existingQuestionNumbers.size}`);
  
  const batch = db.batch();
  
  // Update exam document
  batch.set(examRef, examMetadata, { merge: true });
  
  let questionsCreated = 0;
  let partsCreated = 0;
  
  // Create questions and parts (only for missing ones)
  for (const q of questions) {
    const qn = q.question_number;
    
    // Skip if this question number already exists
    if (existingQuestionNumbers.has(qn)) {
      continue;
    }
    
    const questionRef = db.collection('questions').doc();
    const questionId = questionRef.id;
    
    batch.set(questionRef, {
      examId: examId,
      exam_id: examId,
      questionNumber: qn,
      question_number: qn,
      text: q.text,
      imageUrl: q.image_url || null,
      image_url: q.image_url || null,
      tableData: null,
      table_data: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    questionsCreated++;
    existingQuestionNumbers.add(qn); // Mark as added
    
    // Create question parts
    for (const p of q.parts) {
      const partRef = db.collection('question_parts').doc();
      
      batch.set(partRef, {
        questionId: questionId,
        question_id: questionId,
        orderIndex: p.order_index || 0,
        order_index: p.order_index || 0,
        text: p.text || '',
        answer: p.answer,
        explanation: p.explanation || null,
        marks: p.marks,
        answerType: p.answer_type,
        answer_type: p.answer_type,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      partsCreated++;
    }
  }
  
  if (questionsCreated === 0) {
    console.log('\n✅ All questions already exist. No action needed.');
  } else {
    // Commit all writes
    console.log(`\n💾 Writing ${questionsCreated} questions and ${partsCreated} parts to Firestore...`);
    await batch.commit();
    
    console.log('\n✅ Import complete!');
    console.log(`   Exam ID: ${examId}`);
    console.log(`   Questions created: ${questionsCreated}`);
    console.log(`   Question parts created: ${partsCreated}`);
    console.log(`   Total marks: ${questions.filter(q => !existingQuestionNumbers.has(q.question_number) || questionsCreated > 0)
      .slice(0, questionsCreated)
      .reduce((sum, q) => sum + q.parts.reduce((s, p) => s + p.marks, 0), 0)}`);
  }
  
  // Verify the import
  console.log('\n🔍 Verifying import...');
  
  const finalExamSnap = await examRef.get();
  if (finalExamSnap.exists) {
    console.log('   ✅ Exam document exists');
  } else {
    console.log('   ❌ Exam document NOT found');
  }
  
  const finalQuestionsSnap = await db.collection('questions')
    .where('examId', '==', examId)
    .get();
  console.log(`   ✅ Questions count: ${finalQuestionsSnap.size} (expected: ${questions.length})`);
  
  if (finalQuestionsSnap.size === questions.length) {
    console.log('\n🎉 Exam is now available in the library!');
    console.log(`   Student view: /exam/${examId}?mode=practice`);
    console.log(`   Admin view: /dashboard/admin`);
  } else {
    console.log('\n⚠️ Question count mismatch. Please check the database.');
  }
}

// Run the import
const jsonFilePath = process.argv[2];
importExamPackage(jsonFilePath)
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });
/**
 * XamPreps Exam Package Import Script (Idempotent)
 * 
 * Imports a complete exam package (exam metadata + questions + parts) to Firestore.
 * This version is idempotent - it checks for existing data before inserting.
 * 
 * Usage:
 *   cd functions
 *   node scripts/importExamPackage.js ../docs/imports/ple-science-2024.final.import.json \
 *     --id ple-science-2024 --title "PLE Integrated Science 2024" --subject "Integrated Science" \
 *     --level PLE --year 2024 --timeLimit 135
 * 
 * Or use a JSON file with embedded metadata:
 *   node scripts/importExamPackage.js ../docs/imports/exam-with-metadata.json
 *   (JSON file must have { "exam": {...}, "questions": [...] } format)
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const initAdmin = require('./lib/initAdmin');

// Parse command line arguments
function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--id' && args[i + 1]) {
      result.id = args[++i];
    } else if (args[i] === '--title' && args[i + 1]) {
      result.title = args[++i];
    } else if (args[i] === '--subject' && args[i + 1]) {
      result.subject = args[++i];
    } else if (args[i] === '--level' && args[i + 1]) {
      result.level = args[++i];
    } else if (args[i] === '--year' && args[i + 1]) {
      result.year = parseInt(args[++i], 10);
    } else if (args[i] === '--timeLimit' && args[i + 1]) {
      result.timeLimit = parseInt(args[++i], 10);
    } else if (args[i] === '--type' && args[i + 1]) {
      result.type = args[++i];
    } else if (args[i] === '--difficulty' && args[i + 1]) {
      result.difficulty = args[++i];
    } else if (args[i] === '--isFree') {
      result.isFree = true;
    } else if (args[i] === '--description' && args[i + 1]) {
      result.description = args[++i];
    }
  }
  return result;
}

// Initialize Firebase Admin SDK using shared helper
function initFirebase() {
  const { db, projectId } = initAdmin();
  console.log(`📋 Target Project: ${projectId}`);
  return db;
}

// Validate required exam metadata
function validateMetadata(metadata) {
  const required = ['id', 'title', 'subject', 'level', 'year'];
  const missing = required.filter(key => !metadata[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required exam metadata: ${missing.join(', ')}`);
  }
  if (!/^[a-z0-9-]+$/.test(metadata.id)) {
    throw new Error(`Invalid exam ID "${metadata.id}". Must be lowercase alphanumeric with hyphens only.`);
  }
  if (!Number.isInteger(metadata.year) || metadata.year < 2000 || metadata.year > 2100) {
    throw new Error(`Invalid year "${metadata.year}". Must be a valid year.`);
  }
}

// Main import function
async function importExamPackage() {
  console.log('📦 XamPreps Exam Package Importer (Idempotent)\n');
  
  // Parse arguments (skip node and script name)
  const args = parseArgs(process.argv.slice(3));
  
  // Get JSON file path
  const jsonFilePath = process.argv[2];
  if (!jsonFilePath) {
    console.error('❌ Error: Please provide the path to the import JSON file');
    console.error('Usage: node scripts/importExamPackage.js <path-to-json> [options]');
    console.error('\nOptions:');
    console.error('  --id <exam-id>        Exam document ID (e.g., ple-science-2024)');
    console.error('  --title <title>       Exam title (e.g., "PLE Integrated Science 2024")');
    console.error('  --subject <subject>   Subject name (e.g., "Integrated Science")');
    console.error('  --level <level>       Exam level (e.g., PLE, UCE, UACE)');
    console.error('  --year <year>         Exam year (e.g., 2024)');
    console.error('  --timeLimit <minutes> Time limit in minutes (default: 135)');
    console.error('  --type <type>         Exam type (default: Past Paper)');
    console.error('  --difficulty <diff>   Difficulty (default: Medium)');
    console.error('  --isFree              Mark as free (default: true)');
    console.error('  --description <desc>  Exam description');
    process.exit(1);
  }
  
  const fullPath = path.resolve(jsonFilePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Error: File not found: ${fullPath}`);
    process.exit(1);
  }
  
  const fileContent = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  
  // Support both array format and object format with embedded metadata
  let questions;
  let embeddedMetadata = null;
  
  if (Array.isArray(fileContent)) {
    questions = fileContent;
  } else if (fileContent.questions && Array.isArray(fileContent.questions)) {
    questions = fileContent.questions;
    embeddedMetadata = fileContent.exam || null;
  } else {
    console.error('❌ Error: JSON must be an array of questions or an object with { exam: {...}, questions: [...] }');
    process.exit(1);
  }
  
  console.log(`📄 Loaded ${questions.length} questions from ${fullPath}\n`);
  
  // Initialize Firestore
  const db = initFirebase();
  
  // Merge metadata: CLI args > embedded > defaults
  const examId = args.id || (embeddedMetadata && embeddedMetadata.id);
  const examMetadata = {
    id: examId,
    title: args.title || (embeddedMetadata && embeddedMetadata.title),
    subject: args.subject || (embeddedMetadata && embeddedMetadata.subject),
    level: args.level || (embeddedMetadata && embeddedMetadata.level),
    year: args.year || (embeddedMetadata && embeddedMetadata.year),
    type: args.type || (embeddedMetadata && embeddedMetadata.type) || 'Past Paper',
    difficulty: args.difficulty || (embeddedMetadata && embeddedMetadata.difficulty) || 'Medium',
    timeLimit: args.timeLimit || (embeddedMetadata && embeddedMetadata.timeLimit) || 135,
    isFree: args.isFree !== undefined ? args.isFree : (embeddedMetadata ? (embeddedMetadata.isFree !== undefined ? embeddedMetadata.isFree : true) : true),
    description: args.description || (embeddedMetadata && embeddedMetadata.description) || null,
  };
  
  // Validate required metadata
  try {
    validateMetadata(examMetadata);
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    console.error('\nPlease provide exam metadata using command-line arguments:');
    console.error(`  --id ${examId || '<exam-id>'} --title "<title>" --subject "<subject>" --level <level> --year <year>`);
    process.exit(1);
  }
  
  // Print metadata preview
  console.log('📋 Exam Metadata Preview:');
  console.log(`   ID: ${examMetadata.id}`);
  console.log(`   Title: ${examMetadata.title}`);
  console.log(`   Subject: ${examMetadata.subject}`);
  console.log(`   Level: ${examMetadata.level}`);
  console.log(`   Year: ${examMetadata.year}`);
  console.log(`   Type: ${examMetadata.type}`);
  console.log(`   Difficulty: ${examMetadata.difficulty}`);
  console.log(`   Time Limit: ${examMetadata.timeLimit} minutes`);
  console.log(`   Free: ${examMetadata.isFree ? 'Yes' : 'Premium'}`);
  console.log(`   Questions: ${questions.length}`);
  console.log();
  
  // Safety check: warn if filename suggests different exam than metadata
  const filename = path.basename(fullPath);
  if (filename.includes('maths') && examMetadata.subject !== 'Mathematics') {
    console.warn(`⚠️  WARNING: Filename contains "maths" but subject is "${examMetadata.subject}"`);
  } else if (filename.includes('science') && examMetadata.subject !== 'Integrated Science') {
    console.warn(`⚠️  WARNING: Filename contains "science" but subject is "${examMetadata.subject}"`);
  }
  
  const examRef = db.collection('exams').doc(examMetadata.id);
  const examSnap = await examRef.get();
  
  if (examSnap.exists) {
    console.log('⚠️ Exam already exists. Checking for completeness...');
    const existingData = examSnap.data();
    console.log(`   Current question count: ${existingData.questionCount || existingData.question_count || 'N/A'}`);
    
    // Check existing questions
    const existingQuestions = await db.collection('questions')
      .where('examId', '==', examMetadata.id)
      .get();
    console.log(`   Questions in database: ${existingQuestions.size}`);
    
    if (existingQuestions.size === questions.length) {
      console.log('\n✅ Exam is already complete. No action needed.');
      console.log(`   Exam ID: ${examMetadata.id}`);
      console.log(`   Student view: /exams/${examMetadata.id}?mode=practice`);
      return;
    }
    
    if (existingQuestions.size > questions.length) {
      console.log(`\n⚠️ Found ${existingQuestions.size} questions (expected ${questions.length}).`);
      console.log('   This indicates duplicate imports. Run cleanup first.');
      console.log('   Use: node scripts/cleanupExam.js ' + examMetadata.id);
      process.exit(1);
    }
    
    // Partial import - need to add missing questions
    console.log(`\n📝 Adding missing questions (${questions.length - existingQuestions.size} needed)...\n`);
  }
  
  // Build full exam metadata for Firestore
  const firestoreMetadata = {
    title: examMetadata.title,
    subject: examMetadata.subject,
    level: examMetadata.level,
    year: examMetadata.year,
    type: examMetadata.type,
    difficulty: examMetadata.difficulty,
    timeLimit: examMetadata.timeLimit,
    time_limit: examMetadata.timeLimit,
    isFree: examMetadata.isFree,
    is_free: examMetadata.isFree,
    description: examMetadata.description,
    topic: null,
    explanationPdfUrl: null,
    explanation_pdf_url: null,
    questionCount: questions.length,
    question_count: questions.length,
    createdAt: examSnap.exists ? (examSnap.data().createdAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  console.log('📝 Creating/updating exam metadata...');
  console.log(`   ID: ${examMetadata.id}`);
  console.log(`   Title: ${firestoreMetadata.title}`);
  console.log(`   Subject: ${firestoreMetadata.subject}`);
  console.log(`   Level: ${firestoreMetadata.level}`);
  console.log(`   Year: ${firestoreMetadata.year}`);
  console.log(`   Questions: ${firestoreMetadata.questionCount}`);
  
  // Get existing question numbers to avoid duplicates
  const existingQuestions = await db.collection('questions')
    .where('examId', '==', examMetadata.id)
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
  batch.set(examRef, firestoreMetadata, { merge: true });
  
  let questionsCreated = 0;
  let partsCreated = 0;
  
  // Create questions and parts (only for missing ones)
  for (const q of questions) {
    const qn = q.questionNumber || q.question_number;
    
    // Validate question number exists
    if (qn === undefined || qn === null) {
      console.error(`❌ Error: Question missing questionNumber field:`, q);
      process.exit(1);
    }
    
    // Skip if this question number already exists
    if (existingQuestionNumbers.has(qn)) {
      continue;
    }
    
    // Get question text with fallback
    const questionText = q.questionText || q.text || null;
    
    // Validate question text exists
    if (!questionText) {
      console.error(`❌ Error: Question ${qn} missing question text field:`, q);
      process.exit(1);
    }
    
    const questionRef = db.collection('questions').doc();
    const questionId = questionRef.id;
    
    batch.set(questionRef, {
      examId: examMetadata.id,
      exam_id: examMetadata.id,
      questionNumber: qn,
      question_number: qn,
      text: questionText,
      imageUrl: q.imageUrl || q.image_url || null,
      image_url: q.imageUrl || q.image_url || null,
      tableData: null,
      table_data: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    questionsCreated++;
    existingQuestionNumbers.add(qn); // Mark as added
    
    // Create question parts
    for (const p of q.parts) {
      // Get part text with fallback
      const partText = p.prompt || p.text || '';
      
      // Get answer type with fallback
      const answerType = p.answerType || p.answer_type || null;
      
      // Validate required fields
      if (!answerType) {
        console.error(`❌ Error: Question ${qn} part missing answerType field:`, p);
        process.exit(1);
      }
      
      if (p.marks === undefined || p.marks === null) {
        console.error(`❌ Error: Question ${qn} part missing marks field:`, p);
        process.exit(1);
      }
      
      const partRef = db.collection('question_parts').doc();
      
      // Determine order index from partLabel or default to 0
      let orderIndex = 0;
      if (p.partLabel && typeof p.partLabel === 'string') {
        // Convert letter labels (a, b, c...) to numbers (0, 1, 2...)
        const label = p.partLabel.toLowerCase();
        if (label >= 'a' && label <= 'z') {
          orderIndex = label.charCodeAt(0) - 'a'.charCodeAt(0);
        }
      }
      
      const partData = {
        questionId: questionId,
        question_id: questionId,
        orderIndex: orderIndex,
        order_index: orderIndex,
        text: partText,
        answer: p.answer,
        explanation: p.explanation || null,
        marks: p.marks,
        answerType: answerType,
        answer_type: answerType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Support acceptable_answers if provided
      if (p.acceptable_answers && Array.isArray(p.acceptable_answers)) {
        partData.acceptableAnswers = p.acceptable_answers;
        partData.acceptable_answers = p.acceptable_answers;
      }
      
      batch.set(partRef, partData);
      
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
    console.log(`   Exam ID: ${examMetadata.id}`);
    console.log(`   Questions created: ${questionsCreated}`);
    console.log(`   Question parts created: ${partsCreated}`);
    
    // Calculate total marks for created questions
    const totalMarks = questions
      .filter(q => !existingQuestionNumbers.has(q.question_number) || questionsCreated > 0)
      .slice(0, questionsCreated)
      .reduce((sum, q) => sum + q.parts.reduce((s, p) => s + p.marks, 0), 0);
    console.log(`   Total marks: ${totalMarks}`);
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
    .where('examId', '==', examMetadata.id)
    .get();
  console.log(`   ✅ Questions count: ${finalQuestionsSnap.size} (expected: ${questions.length})`);
  
  if (finalQuestionsSnap.size === questions.length) {
    console.log('\n🎉 Exam is now available in the library!');
    console.log(`   Student view: /exams/${examMetadata.id}?mode=practice`);
    console.log(`   Admin view: /dashboard/admin`);
  } else {
    console.log('\n⚠️ Question count mismatch. Please check the database.');
  }
}

// Run the import
importExamPackage()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });
/**
 * Patch PLE English 2024 structure in live Firestore
 * 
 * Fixes:
 * - Adds missing instructions to questions
 * - Clears duplicated part prompts (sets to empty string)
 * - For Q31-50: Appends rewrite instructions to question.text
 * 
 * Does NOT touch:
 * - Answers
 * - Explanations
 * - Section B (Q51-55)
 */

const initAdmin = require('./lib/initAdmin');
const fs = require('fs');
const path = require('path');

const { db } = initAdmin();

const EXAM_ID = 'ple-english-2024';

// Load local fixed JSON
const localJsonPath = path.join(__dirname, '../../docs/imports/ple-english-2024.insert-ready.json');
const localData = JSON.parse(fs.readFileSync(localJsonPath, 'utf8'));

async function patchStructure() {
  console.log('🔧 Patching PLE English 2024 structure in live Firestore...\n');
  
  // Get exam document
  const examRef = db.collection('exams').doc(EXAM_ID);
  const examDoc = await examRef.get();
  
  if (!examDoc.exists) {
    console.error(`❌ Exam "${EXAM_ID}" not found in Firestore.`);
    return false;
  }
  
  console.log(`✅ Exam found: ${examDoc.data().title}`);
  console.log(`   Exam ID: ${examDoc.id}\n`);
  
  // Get all questions for this exam
  const questionsSnapshot = await db.collection('questions')
    .where('examId', '==', EXAM_ID)
    .orderBy('questionNumber')
    .get();
  
  if (questionsSnapshot.empty) {
    console.error(`❌ No questions found for exam "${EXAM_ID}"`);
    return false;
  }
  
  console.log(`📊 Total questions in Firestore: ${questionsSnapshot.size}\n`);
  
  // Build map of question_number -> question doc
  const questionsMap = {};
  questionsSnapshot.forEach(doc => {
    const data = doc.data();
    questionsMap[data.questionNumber] = { id: doc.id, ref: doc.ref, ...data };
  });
  
  let patchedCount = 0;
  let partPatchedCount = 0;
  const errors = [];
  
  // Process Q1-50 only (skip Section B: Q51-55)
  for (let qNum = 1; qNum <= 50; qNum++) {
    const liveQuestion = questionsMap[qNum];
    const localQuestion = localData.questions.find(q => q.questionNumber === qNum);
    
    if (!liveQuestion) {
      errors.push(`Q${qNum}: Not found in Firestore`);
      continue;
    }
    
    if (!localQuestion) {
      errors.push(`Q${qNum}: Not found in local JSON`);
      continue;
    }
    
    // Get all parts for this question
    const partsSnapshot = await db.collection('question_parts')
      .where('questionId', '==', liveQuestion.id)
      .get();
    
    const parts = [];
    partsSnapshot.forEach(doc => {
      parts.push({ id: doc.id, ref: doc.ref, ...doc.data() });
    });
    
    // Sort by orderIndex
    parts.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    
    // Determine patches needed
    const questionPatches = {};
    const partPatches = {};
    
    // 1. Add instruction if missing
    if (localQuestion.instruction && liveQuestion.instruction !== localQuestion.instruction) {
      questionPatches.instruction = localQuestion.instruction;
    }
    
    // 2. For Q31-50, update question.text to include rewrite instruction
    if (qNum >= 31 && qNum <= 50) {
      if (liveQuestion.text !== localQuestion.questionText) {
        questionPatches.text = localQuestion.questionText;
      }
    }
    
    // 3. Clear first part prompt if it duplicates question text
    if (parts.length > 0) {
      const firstPart = parts[0];
      const localPartPrompt = localQuestion.parts[0]?.prompt || '';
      
      // If local prompt is empty but live prompt is not, clear it
      if (localPartPrompt === '' && firstPart.text && firstPart.text.trim() !== '') {
        partPatches[firstPart.id] = { text: '' };
      }
    }
    
    // Apply patches
    if (Object.keys(questionPatches).length > 0) {
      try {
        await liveQuestion.ref.update(questionPatches);
        patchedCount++;
        console.log(`✅ Q${qNum}: Patched question fields: ${Object.keys(questionPatches).join(', ')}`);
      } catch (err) {
        errors.push(`Q${qNum}: Failed to patch question: ${err.message}`);
      }
    }
    
    // Apply part patches
    for (const [partId, patches] of Object.entries(partPatches)) {
      try {
        const partRef = db.collection('question_parts').doc(partId);
        await partRef.update(patches);
        partPatchedCount++;
        console.log(`✅ Q${qNum}: Patched part ${partId}: text cleared`);
      } catch (err) {
        errors.push(`Q${qNum} part ${partId}: Failed to patch: ${err.message}`);
      }
    }
  }
  
  // Summary
  console.log('\n════════════════════════════════════════');
  console.log('📋 PATCH SUMMARY');
  console.log('════════════════════════════════════════');
  console.log(`Questions patched: ${patchedCount}`);
  console.log(`Part prompts cleared: ${partPatchedCount}`);
  
  if (errors.length > 0) {
    console.log(`\n⚠️  Errors: ${errors.length}`);
    errors.forEach(err => console.log(`   - ${err}`));
  }
  
  console.log('\n✅ Patch complete!');
  console.log('\n⚠️  IMPORTANT: Run checkPleEnglish2024LiveStructure.js to verify the changes.');
  
  return errors.length === 0;
}

// Run the patch
patchStructure()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('❌ Patch failed:', err);
    process.exit(1);
  });
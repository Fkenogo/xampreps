/**
 * Check live Firestore structure for PLE English 2024
 * Compares live data against locally fixed JSON for Q1, Q6, Q20, Q31
 */

const initAdmin = require('./lib/initAdmin');
const fs = require('fs');
const path = require('path');

const { db } = initAdmin();

// Sample questions to check
const SAMPLE_QUESTIONS = [1, 6, 20, 31];
const EXAM_ID = 'ple-english-2024';

// Load local fixed JSON
const localJsonPath = path.join(__dirname, '../../docs/imports/ple-english-2024.insert-ready.json');
const localData = JSON.parse(fs.readFileSync(localJsonPath, 'utf8'));

async function checkLiveStructure() {
  console.log('🔍 Checking live Firestore structure for PLE English 2024...\n');
  
  // Get exam document
  const examRef = db.collection('exams').doc(EXAM_ID);
  const examDoc = await examRef.get();
  
  if (!examDoc.exists) {
    console.error(`❌ Exam "${EXAM_ID}" not found in Firestore.`);
    return;
  }
  
  console.log(`✅ Exam found: ${examDoc.data().title}`);
  console.log(`   Exam ID: ${examDoc.id}\n`);
  
  // Get questions for this exam
  const questionsSnapshot = await db.collection('questions')
    .where('examId', '==', EXAM_ID)
    .orderBy('questionNumber')
    .get();
  
  if (questionsSnapshot.empty) {
    console.error(`❌ No questions found for exam "${EXAM_ID}"`);
    return;
  }
  
  console.log(`📊 Total questions in Firestore: ${questionsSnapshot.size}\n`);
  
  // Build map of question_number -> question doc
  const questionsMap = {};
  questionsSnapshot.forEach(doc => {
    const data = doc.data();
    questionsMap[data.questionNumber] = { id: doc.id, ...data };
  });
  
  // Check each sampled question
  const results = [];
  
  for (const qNum of SAMPLE_QUESTIONS) {
    const liveQuestion = questionsMap[qNum];
    const localQuestion = localData.questions.find(q => q.questionNumber === qNum);
    
    if (!liveQuestion) {
      console.warn(`⚠️  Q${qNum}: Not found in Firestore`);
      results.push({ qNum, status: 'missing', live: null, local: localQuestion });
      continue;
    }
    
    if (!localQuestion) {
      console.warn(`⚠️  Q${qNum}: Not found in local JSON`);
      results.push({ qNum, status: 'local_missing', live: liveQuestion, local: null });
      continue;
    }
    
    // Get first part for this question
    const partsSnapshot = await db.collection('question_parts')
      .where('questionId', '==', liveQuestion.id)
      .orderBy('orderIndex')
      .limit(1)
      .get();
    
    let firstPart = null;
    if (!partsSnapshot.empty) {
      const partDoc = partsSnapshot.docs[0];
      firstPart = { id: partDoc.id, ...partDoc.data() };
    }
    
    // Compare structure
    const comparison = {
      qNum,
      liveQuestionId: liveQuestion.id,
      liveText: liveQuestion.text,
      localText: localQuestion.questionText,
      textMatch: liveQuestion.text === localQuestion.questionText,
      liveInstruction: liveQuestion.instruction || null,
      localInstruction: localQuestion.instruction || null,
      instructionMatch: (liveQuestion.instruction || null) === (localQuestion.instruction || null),
      livePartPrompt: firstPart?.text || firstPart?.prompt || null,
      localPartPrompt: localQuestion.parts[0]?.prompt || '',
      partPromptEmpty: !firstPart?.text && !firstPart?.prompt,
      needsPatch: false,
      livePartId: firstPart?.id,
      patchFields: []
    };
    
    // Determine if patch is needed
    if (!comparison.textMatch) {
      comparison.needsPatch = true;
      comparison.patchFields.push('question.text');
    }
    if (!comparison.instructionMatch && localQuestion.instruction) {
      comparison.needsPatch = true;
      comparison.patchFields.push('question.instruction');
    }
    if (!comparison.partPromptEmpty && localQuestion.parts[0]?.prompt === '') {
      comparison.needsPatch = true;
      comparison.patchFields.push('part.text (clear)');
    }
    
    results.push(comparison);
    
    // Print comparison
    console.log(`--- Q${qNum} ---`);
    console.log(`  Live Text: "${liveQuestion.text?.substring(0, 60)}..."`);
    console.log(`  Local Text: "${localQuestion.questionText?.substring(0, 60)}..."`);
    console.log(`  Text Match: ${comparison.textMatch ? '✅' : '❌'}`);
    console.log(`  Live Instruction: ${liveQuestion.instruction ? `"${liveQuestion.instruction.substring(0, 40)}..."` : 'null'}`);
    console.log(`  Local Instruction: ${localQuestion.instruction ? `"${localQuestion.instruction.substring(0, 40)}..."` : 'null'}`);
    console.log(`  Instruction Match: ${comparison.instructionMatch ? '✅' : '❌'}`);
    console.log(`  Live Part Prompt: "${firstPart?.text?.substring(0, 40) || firstPart?.prompt?.substring(0, 40) || '(empty)'}"`);
    console.log(`  Local Part Prompt: "${localQuestion.parts[0]?.prompt || '(empty)'}"`);
    console.log(`  Part Prompt Empty: ${comparison.partPromptEmpty ? '✅' : '❌'}`);
    console.log(`  Needs Patch: ${comparison.needsPatch ? '⚠️ YES' : '✅ NO'}`);
    if (comparison.patchFields.length > 0) {
      console.log(`  Patch Fields: ${comparison.patchFields.join(', ')}`);
    }
    console.log('');
  }
  
  // Summary
  const needsPatch = results.some(r => r.needsPatch);
  const allMatch = results.every(r => !r.needsPatch);
  
  console.log('════════════════════════════════════════');
  console.log('📋 SUMMARY');
  console.log('════════════════════════════════════════');
  console.log(`Questions checked: ${SAMPLE_QUESTIONS.length}`);
  console.log(`All aligned: ${allMatch ? '✅ YES' : '❌ NO'}`);
  console.log(`Patch needed: ${needsPatch ? '⚠️ YES' : '✅ NO'}`);
  
  if (needsPatch) {
    const patchCount = results.filter(r => r.needsPatch).length;
    console.log(`Questions needing patch: ${patchCount}`);
    console.log('\n⚠️  Run functions/scripts/patchPleEnglish2024Structure.js to apply fixes.');
  } else {
    console.log('\n✅ Live Firestore structure is already aligned with local fixed JSON.');
  }
  
  return { results, needsPatch };
}

// Run the check
checkLiveStructure()
  .then(result => {
    if (result && result.needsPatch) {
      process.exit(1); // Signal that patch is needed
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
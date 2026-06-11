/**
 * XamPreps Debug Script: Extract Specific Questions
 * 
 * Extracts full question + explanation data for specific questions from an exam.
 * 
 * Usage:
 *   cd functions
 *   node scripts/debugExtractQuestions.js ple-science-2024 40 50
 */

const admin = require('firebase-admin');
const initAdmin = require('./lib/initAdmin');

async function debugExtractQuestions() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('❌ Error: Please provide exam ID and question numbers');
    console.error('Usage: node scripts/debugExtractQuestions.js <exam-id> <q1> [q2] [q3] ...');
    console.error('Example: node scripts/debugExtractQuestions.js ple-science-2024 40 50');
    process.exit(1);
  }
  
  const examId = args[0];
  const questionNumbers = args.slice(1).map(n => parseInt(n, 10));
  
  if (questionNumbers.some(isNaN)) {
    console.error('❌ Error: Question numbers must be integers');
    process.exit(1);
  }
  
  // Initialize Firebase
  const { db, projectId } = initAdmin({ verbose: false });
  
  console.error(`🔍 Extracting questions from exam: ${examId}`);
  console.error(`📋 Question numbers: ${questionNumbers.join(', ')}`);
  console.error(`📋 Project: ${projectId}\n`);
  
  // Fetch questions
  const questionsSnap = await db.collection('questions')
    .where('examId', '==', examId)
    .where('question_number', 'in', questionNumbers)
    .get();
  
  if (questionsSnap.empty) {
    console.error(`❌ No questions found for exam "${examId}" with numbers ${questionNumbers.join(', ')}`);
    process.exit(1);
  }
  
  const result = [];
  
  for (const doc of questionsSnap.docs) {
    const questionData = doc.data();
    const questionNumber = questionData.question_number || questionData.questionNumber;
    const questionId = doc.id;
    
    // Fetch question parts
    const partsSnap = await db.collection('question_parts')
      .where('questionId', '==', questionId)
      .orderBy('orderIndex', 'asc')
      .get();
    
    const parts = [];
    const partLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    
    let partIndex = 0;
    for (const partDoc of partsSnap.docs) {
      const partData = partDoc.data();
      parts.push({
        partLabel: partLabels[partIndex] || `${partIndex + 1}`,
        answer: partData.answer,
        explanation: partData.explanation,
        marks: partData.marks,
        answerType: partData.answer_type || partData.answerType,
      });
      partIndex++;
    }
    
    result.push({
      questionNumber,
      questionText: questionData.text,
      parts,
    });
  }
  
  // Sort by question number
  result.sort((a, b) => a.questionNumber - b.questionNumber);
  
  // Output as clean JSON
  console.log(JSON.stringify(result, null, 2));
}

debugExtractQuestions()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
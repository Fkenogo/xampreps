/**
 * XamPreps Science 2024 Import Generator from Guide
 * 
 * Parses the tutor dialogue guide markdown and generates a full import JSON
 * with complete tutor dialogues as explanations.
 * 
 * Usage:
 *   cd functions
 *   node scripts/generateScienceImportFromGuide.js
 */

const fs = require('fs');
const path = require('path');

// Read the guide file
const guidePath = path.resolve(__dirname, '../../docs/imports/ple_science_2024_guide.md');
const guideContent = fs.readFileSync(guidePath, 'utf8');

// Parse the guide into questions
function parseGuide(content) {
  const questions = [];
  
  // Split by question headers (### Q1., ### Q2., etc.)
  const questionBlocks = content.split(/(?=### Q\d+)/);
  
  for (const block of questionBlocks) {
    if (!block.match(/### Q\d+/)) continue;
    
    // Extract question number
    const numMatch = block.match(/### Q(\d+)/);
    if (!numMatch) continue;
    const questionNumber = parseInt(numMatch[1], 10);
    
    // Extract question text
    const questionMatch = block.match(/\*\*Question:\*\*\s*([^\n]+)/);
    const questionText = questionMatch ? questionMatch[1].trim() : '';
    
    // Extract picked answer
    const answerMatch = block.match(/\*\*Picked Answer:\*\*\s*([^\n]+)/);
    const pickedAnswer = answerMatch ? answerMatch[1].trim() : '';
    
    // Extract tutor dialogue (full explanation)
    const tutorDialogueMatch = block.match(/\*\*Tutor Dialogue\*\*\s*([\s\S]*?)(?=\n---|\n### Q|$)/);
    let tutorDialogue = '';
    if (tutorDialogueMatch) {
      tutorDialogue = tutorDialogueMatch[1].trim();
      // Clean up extra whitespace but preserve dialogue structure
      tutorDialogue = tutorDialogue.replace(/\n{3,}/g, '\n\n');
    }
    
    // Check if this is a multipart question (has sub-parts a, b, c, etc.)
    const subParts = [];
    const subPartRegex = /### \((\w)\) Question/g;
    let subMatch;
    
    if (block.includes('### (a) Question')) {
      // This is a multipart question - parse sub-parts
      const subBlocks = block.split(/(?=### \([a-z]\) Question)/);
      
      for (const subBlock of subBlocks) {
        const subNumMatch = subBlock.match(/### \((\w)\) Question/);
        if (!subNumMatch) continue;
        
        const subLabel = subNumMatch[1];
        const subQuestionMatch = subBlock.match(/\*\*Question:\*\*\s*([^\n]+)/);
        const subQuestionText = subQuestionMatch ? subQuestionMatch[1].trim() : '';
        
        const subAnswerMatch = subBlock.match(/\*\*Picked Answer:\*\*\s*([^\n]+)/);
        const subAnswer = subAnswerMatch ? subAnswerMatch[1].trim() : '';
        
        const subTutorMatch = subBlock.match(/\*\*Tutor Dialogue\*\*\s*([\s\S]*?)(?=\n### \([a-z]\)|\n---|\n# END|$)/);
        const subTutorDialogue = subTutorMatch ? subTutorMatch[1].trim() : '';
        
        subParts.push({
          label: subLabel,
          questionText: subQuestionText,
          answer: subAnswer,
          explanation: subTutorDialogue,
        });
      }
    }
    
    questions.push({
      questionNumber,
      questionText: questionText || subParts.map(p => `(${p.label}) ${p.questionText}`).join('\n'),
      pickedAnswer,
      tutorDialogue,
      subParts,
    });
  }
  
  return questions;
}

// Convert parsed questions to import JSON format
function convertToImportFormat(questions) {
  const importData = [];
  
  for (const q of questions) {
    const parts = [];
    
    if (q.subParts.length > 0) {
      // Multipart question
      for (const sub of q.subParts) {
        parts.push({
          order_index: sub.label.charCodeAt(0) - 97, // a=0, b=1, etc.
          text: sub.questionText,
          answer: sub.answer,
          explanation: sub.explanation,
          marks: sub.label === 'c' ? 2 : 1, // Part (c) often has 2 marks
          answer_type: sub.answer.length > 50 ? 'open-ended' : 'text',
        });
      }
    } else {
      // Single part question
      parts.push({
        order_index: 0,
        text: q.questionText,
        answer: q.pickedAnswer,
        explanation: q.tutorDialogue,
        marks: 1,
        answer_type: q.tutorDialogue.length > 100 ? 'open-ended' : 'text',
      });
    }
    
    importData.push({
      question_number: q.questionNumber,
      text: q.questionText,
      image_url: null,
      parts,
    });
  }
  
  return importData;
}

// Main
console.log('📖 Parsing Science 2024 Guide...');
const questions = parseGuide(guideContent);
console.log(`   Found ${questions.length} questions`);

console.log('\n📝 Converting to import format...');
const importData = convertToImportFormat(questions);

// Count parts
let totalParts = 0;
importData.forEach(q => totalParts += q.parts.length);
console.log(`   Total parts: ${totalParts}`);

// Write output
const outputPath = path.resolve(__dirname, '../../docs/imports/ple-science-2024.guide.full.import.json');
fs.writeFileSync(outputPath, JSON.stringify(importData, null, 2));
console.log(`\n✅ Import file written to: ${outputPath}`);

// Show sample of first question
console.log('\n📋 Sample - Q5:');
const q5 = importData.find(q => q.questionNumber === 5);
if (q5) {
  console.log(`   Question: ${q5.text.substring(0, 80)}...`);
  console.log(`   Answer: ${q5.parts[0].answer}`);
  console.log(`   Explanation length: ${q5.parts[0].explanation.length} chars`);
  console.log(`   Explanation preview: ${q5.parts[0].explanation.substring(0, 100)}...`);
}

console.log('\n✨ Done!');
/**
 * XamPreps Science 2024 Guide Parser
 * 
 * Parses ple_science_2024_guide.md and generates import JSON with full tutor dialogues.
 * 
 * Usage:
 *   cd functions
 *   node scripts/parseScienceGuide.js
 */

const fs = require('fs');
const path = require('path');

// Read guide file
const guidePath = path.resolve(__dirname, '../../docs/imports/ple_science_2024_guide.md');
const content = fs.readFileSync(guidePath, 'utf8');

// Parse questions from the guide
function parseGuide(content) {
  const questions = [];
  
  // Split content into sections
  const lines = content.split('\n');
  
  let currentQuestion = null;
  let currentPart = null;
  let inTutorDialogue = false;
  let tutorDialogueLines = [];
  let isInSectionB = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect Section B start
    if (line.includes('## SECTION B') || line.includes('# SECTION B')) {
      isInSectionB = true;
      continue;
    }
    
    // Detect main question headers (### Q1., ### Q2., etc. for Section A)
    const sectionAHeader = line.match(/^###\s*Q(\d+)\.\s*(.+)/);
    // Detect Section B question headers (## Q41., ## Q42., etc.)
    const sectionBHeader = line.match(/^##\s*Q(\d+)\.\s*(.+)/);
    
    if (sectionAHeader || sectionBHeader) {
      // Save previous question if exists
      if (currentQuestion) {
        if (currentPart) {
          currentPart.explanation = tutorDialogueLines.join('\n').trim();
          currentQuestion.parts.push(currentPart);
        }
        questions.push(currentQuestion);
      }
      
      const qNum = parseInt((sectionAHeader || sectionBHeader)[1], 10);
      currentQuestion = {
        questionNumber: qNum,
        questionText: '',
        parts: [],
      };
      currentPart = null;
      inTutorDialogue = false;
      tutorDialogueLines = [];
      continue;
    }
    
    // Detect Section B sub-question headers (### (a) Question, etc.)
    const subPartHeader = line.match(/^###\s*\(([a-z])\)\s*Question/);
    if (subPartHeader && currentQuestion) {
      // Save previous part if exists
      if (currentPart) {
        currentPart.explanation = tutorDialogueLines.join('\n').trim();
        currentQuestion.parts.push(currentPart);
      }
      
      const partLabel = subPartHeader[1];
      currentPart = {
        label: partLabel,
        questionText: '',
        answer: '',
        explanation: '',
        marks: 1,
        answerType: 'text',
      };
      inTutorDialogue = false;
      tutorDialogueLines = [];
      continue;
    }
    
    if (!currentQuestion) continue;
    
    // Extract question text for Section A (single part)
    if (line.startsWith('**Question:**') && currentQuestion.parts.length === 0 && !currentPart) {
      currentQuestion.questionText = line.replace(/\*\*Question:\*\*\s*/, '').trim();
      // Create the single part
      currentPart = {
        label: 'a',
        questionText: currentQuestion.questionText,
        answer: '',
        explanation: '',
        marks: 1,
        answerType: 'text',
      };
      continue;
    }
    
    // Extract question text for Section B sub-parts
    if (line.startsWith('**Question:**') && currentPart) {
      currentPart.questionText = line.replace(/\*\*Question:\*\*\s*/, '').trim();
      currentQuestion.questionText += (currentQuestion.questionText ? '\n' : '') + `(${currentPart.label}) ${currentPart.questionText}`;
      continue;
    }
    
    // Extract picked answer
    if (line.startsWith('**Picked Answer:**') && currentPart) {
      currentPart.answer = line.replace(/\*\*Picked Answer:\*\*\s*/, '').trim();
      // Determine answer type based on length and content
      if (currentPart.answer.includes(';') || currentPart.answer.length > 60) {
        currentPart.answerType = 'open-ended';
      }
      continue;
    }
    
    // Extract picked answers for multipart (may have multiple)
    if (line.startsWith('**Picked Answers:**') && currentPart) {
      currentPart.answer = line.replace(/\*\*Picked Answers:\*\*\s*/, '').trim();
      if (currentPart.answer.includes(';') || currentPart.answer.length > 60) {
        currentPart.answerType = 'open-ended';
      }
      continue;
    }
    
    // Start of tutor dialogue
    if (line === '**Tutor Dialogue**') {
      inTutorDialogue = true;
      tutorDialogueLines = [];
      continue;
    }
    
    // Collect tutor dialogue lines
    if (inTutorDialogue && line && !line.startsWith('---') && !line.startsWith('#')) {
      tutorDialogueLines.push(line);
    }
    
    // End of tutor dialogue section (hit separator or new section)
    if (inTutorDialogue && (line.startsWith('---') || line.startsWith('#'))) {
      inTutorDialogue = false;
    }
  }
  
  // Save last question
  if (currentQuestion) {
    if (currentPart) {
      currentPart.explanation = tutorDialogueLines.join('\n').trim();
      currentQuestion.parts.push(currentPart);
    }
    questions.push(currentQuestion);
  }
  
  return questions;
}

// Convert to import format
function convertToImportFormat(questions) {
  const importData = [];
  
  for (const q of questions) {
    const parts = q.parts.map((p, idx) => ({
      order_index: idx,
      text: p.questionText || q.questionText,
      answer: p.answer,
      explanation: p.explanation,
      marks: p.marks,
      answer_type: p.answerType,
    }));
    
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
console.log('📖 Parsing Science 2024 Guide...\n');
const questions = parseGuide(content);
console.log(`   Found ${questions.length} questions\n`);

// Show summary
for (const q of questions) {
  console.log(`   Q${q.questionNumber}: ${q.parts.length} part(s)`);
}

console.log('\n📝 Converting to import format...');
const importData = convertToImportFormat(questions);

// Validate
let totalParts = 0;
importData.forEach(q => totalParts += q.parts.length);
console.log(`   Total parts: ${totalParts}`);

// Check for empty explanations
let emptyExplanations = 0;
importData.forEach(q => {
  q.parts.forEach(p => {
    if (!p.explanation || p.explanation.length < 10) {
      emptyExplanations++;
    }
  });
});
if (emptyExplanations > 0) {
  console.warn(`   ⚠️  ${emptyExplanations} parts have empty/short explanations`);
}

// Write output
const outputPath = path.resolve(__dirname, '../../docs/imports/ple-science-2024.guide.full.import.json');
fs.writeFileSync(outputPath, JSON.stringify(importData, null, 2));
console.log(`\n✅ Import file written to: ${outputPath}`);

// Show samples
console.log('\n📋 Sample - Q5:');
const q5 = importData.find(q => q.questionNumber === 5);
if (q5) {
  console.log(`   Question: ${q5.text.substring(0, 80)}...`);
  console.log(`   Answer: ${q5.parts[0].answer}`);
  console.log(`   Explanation length: ${q5.parts[0].explanation.length} chars`);
  console.log(`   Explanation: ${q5.parts[0].explanation.substring(0, 150)}...`);
}

console.log('\n📋 Sample - Q40:');
const q40 = importData.find(q => q.questionNumber === 40);
if (q40) {
  console.log(`   Question: ${q40.text.substring(0, 80)}...`);
  console.log(`   Answer: ${q40.parts[0].answer}`);
  console.log(`   Explanation length: ${q40.parts[0].explanation.length} chars`);
}

console.log('\n📋 Sample - Q50:');
const q50 = importData.find(q => q.questionNumber === 50);
if (q50) {
  console.log(`   Question: ${q50.text.substring(0, 80)}...`);
  q50.parts.forEach((p, i) => {
    console.log(`   Part ${i}: Answer="${p.answer}", Explanation length: ${p.explanation.length} chars`);
  });
}

console.log('\n✨ Done!');
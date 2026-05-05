/**
 * Fix structural mismatch for PLE English 2024 Section A (Q1-30)
 * 
 * Problem: questionText and parts[0].prompt contain duplicate content
 * Solution: Keep questionText as full question, empty parts[0].prompt
 * 
 * This script ONLY fixes structure, not content.
 */

const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../../docs/imports/ple-english-2024.insert-ready.json');

// Read the JSON file
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('🔧 Fixing PLE English 2024 Section A structure...\n');

let changesCount = 0;

// Fix Q1-30 (Sub-Section I)
for (let i = 0; i < 30; i++) {
  const question = data.questions[i];
  
  if (!question) {
    console.warn(`⚠️  Question ${i + 1} not found`);
    continue;
  }

  // Store original for comparison
  const originalQuestionText = question.questionText;
  const originalPartPrompt = question.parts[0]?.prompt;

  // Check if there's duplication
  if (originalQuestionText === originalPartPrompt) {
    // Fix: Keep questionText, empty the part prompt
    question.parts[0].prompt = '';
    
    // Add instruction based on question range
    if (i < 5) {
      // Q1-5: Fill in blank with suitable word
      question.instruction = 'In each of the questions 1 to 5, fill in the blank space with a suitable word.';
    } else if (i < 15) {
      // Q6-15: Use correct form of word in brackets
      question.instruction = 'In each of the questions 6 to 15, use the correct form of the word given in brackets.';
    } else if (i < 18) {
      // Q16-17: Write short forms in full
      question.instruction = 'In each of the questions 16 to 17, write the given short forms in full.';
    } else if (i < 20) {
      // Q18-19: Arrange in alphabetical order
      question.instruction = 'In each of the questions 18 to 19, arrange the following words in alphabetical order.';
    } else if (i < 22) {
      // Q20-21: Rewrite with opposite meaning
      question.instruction = 'In each of the questions 20 to 21, rewrite the sentence giving the opposite of the underlined word.';
    } else if (i < 24) {
      // Q22-23: Rearrange words
      question.instruction = 'In each of the questions 22 to 23, rearrange the words to form a correct sentence.';
    } else if (i < 26) {
      // Q24-25: Give plural
      question.instruction = 'In each of the questions 24 to 25, give the plural of the given word.';
    } else if (i < 28) {
      // Q26-27: Rewrite giving one word
      question.instruction = 'In each of the questions 26 to 27, rewrite the sentence giving one word for the underlined group of words.';
    } else if (i < 30) {
      // Q28-30: Use word in sentence
      question.instruction = 'In each of the questions 28 to 30, use the word in a sentence to show that you know the difference in its meaning.';
    }

    changesCount++;
    console.log(`✅ Q${i + 1}: Removed duplication, added instruction`);
  } else {
    console.log(`⏭️  Q${i + 1}: No duplication found, skipping`);
  }
}

// Fix Q31-50 (Sub-Section II)
console.log('\n📝 Fixing Sub-Section II (Q31-50)...\n');

for (let i = 30; i < 50; i++) {
  const question = data.questions[i];
  
  if (!question) {
    console.warn(`⚠️  Question ${i + 1} not found`);
    continue;
  }

  const originalQuestionText = question.questionText;
  const originalPartPrompt = question.parts[0]?.prompt;

  // Check if there's duplication
  if (originalQuestionText === originalPartPrompt) {
    // For Q31-50, the questionText should contain both the sentence AND the instruction in brackets
    // The part prompt should be empty since there's only one part per question
    
    // Example transformation:
    // FROM: questionText: "Turkeys are bigger than cocks."
    //       partPrompt: "Turkeys are bigger than cocks."
    // TO:   questionText: "Turkeys are bigger than cocks. (Rewrite the sentence using: ... as ... as ...)"
    //       partPrompt: ""
    
    // We need to add the instruction from the answers document
    const instructions = {
      31: '(Rewrite the sentence using: ... as ... as ...)',
      32: '(Rewrite as one sentence using: whose)',
      33: '(Rewrite the sentence using: immediately)',
      34: '(Rewrite the sentence using: ... after ...)',
      35: '(Rewrite the sentence using: ... than ...)',
      36: '(Rewrite the sentence using: ... responsible ...)',
      37: '(Rewrite as one sentence beginning: While ...)',
      38: '(Rewrite as one sentence using: ... neither ... nor ...)',
      39: '(Rewrite the sentence ending: ... ?" the teacher asked Nambuya.)',
      40: '(Rewrite the sentence beginning: The tailor cut ...)',
      41: '(Rewrite the sentence ending: ... by Shakirah.)',
      42: '(Rewrite the sentence ending: ... ago.)',
      43: '(Rewrite as one sentence using: ... too ... to ...)',
      44: '(Rewrite as one sentence beginning: Although ...)',
      45: '(Rewrite the sentence using: ... spent ...)',
      46: '(Rewrite the sentence beginning: In order to ...)',
      47: '(Rewrite the sentence beginning: If ...)',
      48: '(Rewrite the sentence ending: ... didn\'t she?)',
      49: '(Rewrite the sentence beginning: Both ...)',
      50: '(Rewrite the sentence ending: ... to us.)'
    };

    const instruction = instructions[i + 1];
    if (instruction) {
      // Append instruction to questionText
      question.questionText = `${originalQuestionText} ${instruction}`;
      // Empty the part prompt
      question.parts[0].prompt = '';
      
      changesCount++;
      console.log(`✅ Q${i + 1}: Added instruction to questionText, emptied part prompt`);
    } else {
      console.warn(`⚠️  Q${i + 1}: No instruction found in mapping`);
    }
  } else {
    console.log(`⏭️  Q${i + 1}: No duplication found, skipping`);
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Total changes: ${changesCount}`);
console.log(`   Questions fixed: Q1-50`);
console.log(`   Section B: Untouched (Q51-55)`);

// Write the modified JSON back
const outputPath = path.join(__dirname, '../../docs/imports/ple-english-2024.insert-ready.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

console.log(`\n💾 File saved: ${outputPath}`);
console.log(`\n✅ Structure fix complete!`);
/**
 * Verify Section B (Q51-55) was NOT touched by the patch
 */
const initAdmin = require('./lib/initAdmin');
const { db } = initAdmin();

async function checkSectionB() {
  console.log('🔍 Verifying Section B (Q51-55) was untouched...\n');
  
  // Check Q51, Q52, Q53, Q54, Q55
  for (let qNum = 51; qNum <= 55; qNum++) {
    const qSnap = await db.collection('questions')
      .where('examId', '==', 'ple-english-2024')
      .where('questionNumber', '==', qNum)
      .get();
    
    if (qSnap.empty) {
      console.log(`⚠️  Q${qNum}: Not found`);
      continue;
    }
    
    const doc = qSnap.docs[0];
    const data = doc.data();
    
    // Check parts
    const partsSnap = await db.collection('question_parts')
      .where('questionId', '==', doc.id)
      .get();
    
    let hasPrompts = false;
    partsSnap.forEach(p => {
      const pd = p.data();
      if (pd.text && pd.text.trim()) hasPrompts = true;
    });
    
    console.log(`Q${qNum}:`);
    console.log(`  Parts: ${partsSnap.size}`);
    console.log(`  Has prompts: ${hasPrompts ? '✅ YES (untouched)' : '❌ NO (incorrectly modified)'}`);
    console.log('');
  }
}

checkSectionB().catch(console.error);
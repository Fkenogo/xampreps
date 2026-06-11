/**
 * XamPreps Q45 Table Patch Script
 * 
 * Patches the live Firestore Q45 document for ple-science-2024 to add the missing table.
 * This is a targeted fix that only updates the text field of the specific question.
 * 
 * Usage:
 *   cd functions
 *   node scripts/patchQ45Table.js
 */

const admin = require('firebase-admin');
const initAdmin = require('./lib/initAdmin');

async function patchQ45Table() {
  console.log('🔧 XamPreps Q45 Table Patch\n');
  console.log('========================================\n');
  
  // Initialize Firebase Admin SDK using shared helper
  const { db, projectId } = initAdmin();
  console.log(`📋 Target Project: ${projectId}`);
  console.log('📋 Target Exam: ple-science-2024');
  console.log('📋 Target Question: 45\n');
  
  const examId = 'ple-science-2024';
  const questionNumber = 45;
  
  // New text with markdown table
  const newText = `The table below shows some of the steps followed in the cleaning of clothes and the purpose of each step. Complete the table correctly.

| Step | Purpose |
|------|---------|
| _____ | Separating clothes according to washing needs. |
| Soaking | _____ |
| _____ | Removing dirty soapy water from the clothes. |
| Ironing | _____ |`;
  
  try {
    // Find the question document
    console.log('🔍 Finding Q45 document...');
    const questionsQuery = db.collection('questions')
      .where('examId', '==', examId)
      .where('questionNumber', '==', questionNumber);
    
    const questionSnap = await questionsQuery.get();
    
    if (questionSnap.empty) {
      console.error('❌ Q45 document not found!');
      console.error(`   Exam ID: ${examId}`);
      console.error(`   Question Number: ${questionNumber}`);
      console.error('   Please verify the question exists in the database.');
      process.exit(1);
    }
    
    if (questionSnap.size > 1) {
      console.warn(`⚠️  Found ${questionSnap.size} documents for Q45. Updating the first one.`);
    }
    
    const questionDoc = questionSnap.docs[0];
    const questionId = questionDoc.id;
    const currentData = questionDoc.data();
    
    console.log('✅ Q45 document found!');
    console.log(`   Document ID: ${questionId}`);
    console.log(`   Current text length: ${currentData.text ? currentData.text.length : 0} characters`);
    
    // Show current text (first 200 chars)
    if (currentData.text) {
      const preview = currentData.text.length > 200 ? 
        currentData.text.substring(0, 200) + '...' : 
        currentData.text;
      console.log(`   Current text preview: "${preview}"`);
    }
    
    // Update the document
    console.log('\n📝 Updating Q45 text field...');
    const updateData = {
      text: newText,
      updatedAt: admin.firestore.Timestamp.now(),
    };
    
    await db.collection('questions').doc(questionId).update(updateData);
    
    console.log('✅ Q45 document updated successfully!');
    console.log(`   New text length: ${newText.length} characters`);
    
    // Verify the update
    console.log('\n🔍 Verifying update...');
    const updatedDoc = await db.collection('questions').doc(questionId).get();
    const updatedData = updatedDoc.data();
    
    if (updatedData.text === newText) {
      console.log('✅ Verification passed! Q45 text matches expected content.');
      
      // Show the new text
      console.log('\n📄 New Q45 text:');
      console.log('---');
      console.log(newText);
      console.log('---');
      
      console.log('\n🎉 Q45 table patch completed successfully!');
      console.log('   The question will now render the table correctly in the UI.');
      console.log('   Answer parts (a-d) remain unchanged and functional.');
      
    } else {
      console.error('❌ Verification failed! Text does not match expected content.');
      console.error('   Expected length:', newText.length);
      console.error('   Actual length:', updatedData.text ? updatedData.text.length : 0);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Patch failed:', error.message);
    process.exit(1);
  }
}

// Run the patch
patchQ45Table()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Patch failed:', error);
    process.exit(1);
  });
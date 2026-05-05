/**
 * XamPreps Maths 2015 Image URLs Setter
 * 
 * Patches image URLs for diagram questions in ple-maths-2015 exam.
 * Supports both question-level and part-level images.
 * 
 * Usage:
 *   cd functions
 *   GCLOUD_PROJECT=xampreps node scripts/setMaths2015ImageUrls.js
 */

const admin = require('firebase-admin');
const initAdmin = require('./lib/initAdmin');

// Image URL mapping for Maths 2015
// Note: Q9 filename has a space before .jpeg - using exact on-disk name
const IMAGE_MAPPING = {
  // Question-level images
  questions: {
    5: '/exam-assets/ple-maths-2015/q5-numberline.jpeg',
    9: '/exam-assets/ple-maths-2015/Q9-symmetry .jpeg',
    15: '/exam-assets/ple-maths-2015/q15-angles.jpeg',
    16: '/exam-assets/ple-maths-2015/q16-venn-diagram.jpeg',
    21: '/exam-assets/ple-maths-2015/q21a-q21b-venn-diagram.jpeg',
    24: '/exam-assets/ple-maths-2015/q24-container.jpeg',
  },
  // Part-level images (for Q26 and Q29 which have multiple parts)
  // Note: All parts have orderIndex=0, so we update ALL parts for these questions
  parts: {
    26: '/exam-assets/ple-maths-2015/q26a-q26b-parrellels.jpeg',
    29: '/exam-assets/ple-maths-2015/q29a-q29b-perimeter.jpeg',
  }
};

async function setMaths2015ImageUrls() {
  console.log('🖼️  XamPreps Maths 2015 Image URLs Setter\n');
  
  const { db, projectId } = initAdmin();
  const examId = 'ple-maths-2015';
  
  console.log(`📋 Target Project: ${projectId}`);
  console.log(`📋 Target Exam: ${examId}\n`);
  
  let updatesCount = 0;
  const batch = db.batch();
  
  // Update question-level images
  console.log('📝 Updating question-level images...');
  for (const [questionNumber, imageUrl] of Object.entries(IMAGE_MAPPING.questions)) {
    const qn = parseInt(questionNumber, 10);
    const qSnap = await db.collection('questions')
      .where('examId', '==', examId)
      .where('questionNumber', '==', qn)
      .limit(1)
      .get();
    
    if (qSnap.empty) {
      console.warn(`   ⚠️  Question ${qn} not found`);
      continue;
    }
    
    const qRef = qSnap.docs[0].ref;
    batch.update(qRef, {
      imageUrl: imageUrl,
      image_url: imageUrl,
      updatedAt: new Date().toISOString(),
    });
    updatesCount++;
    console.log(`   ✅ Q${qn}: ${imageUrl}`);
  }
  
  // Update part-level images (for Q26 and Q29)
  // Note: All parts have orderIndex=0, so we update ALL parts for these questions
  console.log('\n📝 Updating part-level images...');
  for (const [questionNumberStr, imageUrl] of Object.entries(IMAGE_MAPPING.parts)) {
    const questionNumber = parseInt(questionNumberStr, 10);
    
    const qSnap = await db.collection('questions')
      .where('examId', '==', examId)
      .where('questionNumber', '==', questionNumber)
      .limit(1)
      .get();
    
    if (qSnap.empty) {
      console.warn(`   ⚠️  Question ${questionNumber} not found`);
      continue;
    }
    
    const questionId = qSnap.docs[0].id;
    
    // Get ALL parts for this question (since they all have orderIndex=0)
    const pSnap = await db.collection('question_parts')
      .where('questionId', '==', questionId)
      .get();
    
    if (pSnap.empty) {
      console.warn(`   ⚠️  Q${questionNumber}: No parts found`);
      continue;
    }
    
    // Update all parts with the same image
    pSnap.docs.forEach((partDoc) => {
      batch.update(partDoc.ref, {
        imageUrl: imageUrl,
        image_url: imageUrl,
        updatedAt: new Date().toISOString(),
      });
      updatesCount++;
      const partData = partDoc.data();
      const partLabel = partData.text && partData.text.startsWith('(') 
        ? partData.text.charAt(1) 
        : '?';
      console.log(`   ✅ Q${questionNumber}(${partLabel}): ${imageUrl}`);
    });
  }
  
  // Commit all updates
  if (updatesCount > 0) {
    console.log(`\n💾 Writing ${updatesCount} updates to Firestore...`);
    await batch.commit();
    console.log('   ✅ All updates committed');
  } else {
    console.log('\n⚠️  No updates needed');
  }
  
  // Verify
  console.log('\n🔍 Verifying updates...');
  let verifiedCount = 0;
  
  for (const [questionNumber, imageUrl] of Object.entries(IMAGE_MAPPING.questions)) {
    const qn = parseInt(questionNumber, 10);
    const qSnap = await db.collection('questions')
      .where('examId', '==', examId)
      .where('questionNumber', '==', qn)
      .limit(1)
      .get();
    
    if (!qSnap.empty) {
      const data = qSnap.docs[0].data();
      if (data.imageUrl === imageUrl || data.image_url === imageUrl) {
        verifiedCount++;
      } else {
        console.warn(`   ⚠️  Q${qn}: URL mismatch (got: ${data.imageUrl || data.image_url || 'none'})`);
      }
    }
  }
  
  console.log(`   ✅ ${verifiedCount}/${Object.keys(IMAGE_MAPPING.questions).length} question images verified`);
  
  console.log('\n✨ Done!');
  console.log(`   Total updates: ${updatesCount}`);
}

setMaths2015ImageUrls()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
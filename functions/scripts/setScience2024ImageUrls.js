/**
 * XamPreps Science 2024 Image URLs Setter
 * 
 * Patches image URLs for diagram questions in ple-science-2024 exam.
 * Supports both question-level and part-level images.
 * 
 * Usage:
 *   cd functions
 *   GCLOUD_PROJECT=xampreps node scripts/setScience2024ImageUrls.js
 */

const admin = require('firebase-admin');
const initAdmin = require('./lib/initAdmin');

// Image URL mapping for Science 2024
const IMAGE_MAPPING = {
  // Question-level images
  questions: {
    5: '/exam-assets/ple-science-2024/q5-q6-snail.jpeg',
    6: '/exam-assets/ple-science-2024/q5-q6-snail.jpeg',
    16: '/exam-assets/ple-science-2024/q16-q17-kidney.jpeg',
    17: '/exam-assets/ple-science-2024/q16-q17-kidney.jpeg',
    32: '/exam-assets/ple-science-2024/q31-crop-planting-method.jpeg',
    33: '/exam-assets/ple-science-2024/q31-crop-planting-method.jpeg',
    44: '/exam-assets/ple-science-2024/q44-digestive-system.jpeg',
    48: '/exam-assets/ple-science-2024/q48-face-mask.jpeg',
    51: '/exam-assets/ple-science-2024/q51-weather-types.jpeg',
  },
  // Part-level images (for Q55 which has two separate diagrams)
  parts: {
    55: {
      0: '/exam-assets/ple-science-2024/q55a-plane-mirror-cup.jpeg',      // Part (a)
      1: '/exam-assets/ple-science-2024/q55b-plane-mirror-reflection.jpeg', // Part (b)
      2: '/exam-assets/ple-science-2024/q55b-plane-mirror-reflection.jpeg', // Part (c)
    }
  }
};

async function setScience2024ImageUrls() {
  console.log('🖼️  XamPreps Science 2024 Image URLs Setter\n');
  
  const { db, projectId } = initAdmin();
  const examId = 'ple-science-2024';
  
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
  
  // Update part-level images (for Q55)
  console.log('\n📝 Updating part-level images...');
  for (const [questionNumberStr, partImages] of Object.entries(IMAGE_MAPPING.parts)) {
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
    
    for (const [orderIndexStr, imageUrl] of Object.entries(partImages)) {
      const orderIndex = parseInt(orderIndexStr, 10);
      
      const pSnap = await db.collection('question_parts')
        .where('questionId', '==', questionId)
        .where('orderIndex', '==', orderIndex)
        .limit(1)
        .get();
      
      if (pSnap.empty) {
        console.warn(`   ⚠️  Q${questionNumber} part ${orderIndex} not found`);
        continue;
      }
      
      const pRef = pSnap.docs[0].ref;
      batch.update(pRef, {
        imageUrl: imageUrl,
        image_url: imageUrl,
        updatedAt: new Date().toISOString(),
      });
      updatesCount++;
      const partLabel = String.fromCharCode(97 + orderIndex); // a, b, c...
      console.log(`   ✅ Q${questionNumber}(${partLabel}): ${imageUrl}`);
    }
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
        console.warn(`   ⚠️  Q${qn}: URL mismatch`);
      }
    }
  }
  
  console.log(`   ✅ ${verifiedCount}/${Object.keys(IMAGE_MAPPING.questions).length} question images verified`);
  
  console.log('\n✨ Done!');
  console.log(`   Total updates: ${updatesCount}`);
}

setScience2024ImageUrls()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
/**
 * XamPreps Exam Import Diagnostic Script
 * 
 * Diagnoses which Firebase project/database the import targets
 * and checks for existing exam data.
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

console.log('🔍 XamPreps Firebase Import Diagnostic\n');

// Check Firebase project config
console.log('=== Firebase Project Configuration ===\n');

// Read .firebaserc
const firebasercPath = path.resolve(__dirname, '../../.firebaserc');
if (fs.existsSync(firebasercPath)) {
  const firebaserc = JSON.parse(fs.readFileSync(firebasercPath, 'utf8'));
  console.log('.firebaserc contents:');
  console.log(JSON.stringify(firebaserc, null, 2));
  console.log('');
} else {
  console.log('.firebaserc not found');
}

// Read firebase.json
const firebaseJsonPath = path.resolve(__dirname, '../../firebase.json');
if (fs.existsSync(firebaseJsonPath)) {
  const firebaseJson = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
  if (firebaseJson.projects) {
    console.log('firebase.json projects:');
    console.log(JSON.stringify(firebaseJson.projects, null, 2));
  }
  console.log('');
}

// Initialize Firebase Admin
console.log('=== Firebase Admin SDK Initialization ===\n');

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (serviceAccountPath) {
  console.log(`GOOGLE_APPLICATION_CREDENTIALS: ${serviceAccountPath}`);
  if (fs.existsSync(serviceAccountPath)) {
    const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    console.log(`Service Account Project ID: ${sa.project_id || 'N/A'}`);
    console.log(`Service Account Client Email: ${sa.client_email || 'N/A'}`);
  } else {
    console.log('Service account file NOT found');
  }
} else {
  console.log('GOOGLE_APPLICATION_CREDENTIALS not set');
  console.log('Using Application Default Credentials (ADC)');
}

// Check for .env.local
const envLocalPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const firebaseConfigMatch = envContent.match(/VITE_FIREBASE_PROJECT_ID=(.+)/);
  if (firebaseConfigMatch) {
    console.log(`\nFrontend Firebase Project ID (.env.local): ${firebaseConfigMatch[1]}`);
  }
}
console.log('');

// Initialize Admin SDK
if (admin.apps.length === 0) {
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(sa),
    });
  } else {
    admin.initializeApp();
  }
}

const db = admin.firestore();
const app = admin.app();

console.log('=== Admin SDK App Info ===\n');
console.log(`App Name: ${app.name}`);
console.log(`App Options: ${JSON.stringify(app.options, null, 2)}`);
console.log('');

// Check Firestore settings
console.log('=== Firestore Connection Info ===\n');
// Note: We can't directly get the project ID from the Firestore instance,
// but we can infer it from the app options
const projectId = app.options?.projectId || process.env.GCLOUD_PROJECT || 'unknown';
console.log(`Resolved Project ID: ${projectId}`);
console.log('');

// Check for existing exams
console.log('=== Checking Existing Exam Data ===\n');

async function diagnose() {
  try {
    // Get project ID from ADC
    const adcProjectId = await admin.credential.applicationDefault().getAccessToken()
      .then(() => process.env.GCLOUD_PROJECT || 'resolved-via-ADC')
      .catch(() => 'ADC-unavailable');
    console.log(`ADC Project ID: ${adcProjectId}`);
    console.log('');

    // List top-level collections (if possible)
    console.log('Attempting to list top-level collections...');
    const collectionsIter = await db.listCollections();
    const collections = Array.isArray(collectionsIter) ? collectionsIter[0] : collectionsIter;
    if (Array.isArray(collections)) {
      console.log(`Found ${collections.length} top-level collections:`);
      collections.forEach(c => console.log(`  - ${c.id}`));
    } else {
      console.log('Could not list collections (API may not support it)');
    }
    console.log('');

    // Check for existing ple-maths-2015 exam
    const examRef = db.collection('exams').doc('ple-maths-2015');
    const examSnap = await examRef.get();
    if (examSnap.exists) {
      console.log('✅ Exam "ple-maths-2015" EXISTS');
      console.log('   Data:', JSON.stringify(examSnap.data(), null, 2));
    } else {
      console.log('❌ Exam "ple-maths-2015" does NOT exist');
    }
    console.log('');

    // Count questions for ple-maths-2015
    const questionsSnap = await db.collection('questions')
      .where('examId', '==', 'ple-maths-2015')
      .get();
    console.log(`Questions with examId="ple-maths-2015": ${questionsSnap.size}`);
    
    if (questionsSnap.size > 0) {
      console.log('First 5 question IDs:');
      questionsSnap.docs.slice(0, 5).forEach(doc => {
        console.log(`  - ${doc.id}`);
      });
    }
    console.log('');

    // Count all questions (to check for duplicates)
    const allQuestionsSnap = await db.collection('questions').count().get();
    console.log(`Total questions in database: ${allQuestionsSnap.data().count}`);
    console.log('');

    // Count question_parts
    let totalParts = 0;
    questionsSnap.docs.forEach(qDoc => {
      // We can't easily count subcollections without querying each
    });
    const allPartsSnap = await db.collection('question_parts').count().get();
    console.log(`Total question_parts in database: ${allPartsSnap.data().count}`);
    console.log('');

    // Check for duplicate question numbers
    console.log('=== Duplicate Analysis ===\n');
    const questionNumbers = new Map();
    questionsSnap.docs.forEach(doc => {
      const qn = doc.data().question_number || doc.data().questionNumber;
      questionNumbers.set(qn, (questionNumbers.get(qn) || 0) + 1);
    });
    
    let duplicates = 0;
    questionNumbers.forEach((count, qn) => {
      if (count > 1) {
        console.log(`Question ${qn}: ${count} duplicates`);
        duplicates += count - 1;
      }
    });
    
    if (duplicates === 0) {
      console.log('No duplicate question numbers found');
    } else {
      console.log(`\n⚠️ Found ${duplicates} duplicate questions`);
    }

  } catch (error) {
    console.error('Error during diagnosis:', error);
  }
}

diagnose().then(() => {
  console.log('\n✨ Diagnosis complete');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Diagnosis failed:', error);
  process.exit(1);
});
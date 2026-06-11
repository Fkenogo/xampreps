/**
 * XamPreps Firestore Target Probe Script
 * 
 * Proves which Firestore project is being targeted and verifies read/write access.
 * 
 * Usage:
 *   cd functions
 *   node scripts/probeFirestoreTarget.js
 */

const initAdmin = require('./lib/initAdmin');

async function probeFirestoreTarget() {
  console.log('🔍 XamPreps Firestore Target Probe\n');
  console.log('========================================\n');
  
  // Environment info
  console.log('📋 Environment:');
  console.log(`   GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || '(not set)'}`);
  console.log(`   GOOGLE_CLOUD_PROJECT: ${process.env.GOOGLE_CLOUD_PROJECT || '(not set)'}`);
  console.log(`   GCLOUD_PROJECT: ${process.env.GCLOUD_PROJECT || '(not set)'}`);
  console.log(`   FIRESTORE_EMULATOR_HOST: ${process.env.FIRESTORE_EMULATOR_HOST || '(not set)'}`);
  console.log();
  
  // Initialize using shared helper
  const { db, projectId, credentialInfo } = initAdmin();
  
  console.log('📊 Target Project Verification:');
  console.log(`   Expected: xampreps`);
  console.log(`   Actual: ${projectId}`);
  
  if (projectId !== 'xampreps') {
    console.error(`\n❌ ERROR: Target project is "${projectId}", not "xampreps"!`);
    process.exit(1);
  }
  
  console.log('   ✅ Match confirmed!\n');
  
  // Write probe document
  const probeRef = db.collection('debug_import_probe').doc('probe-xampreps');
  const probeData = {
    test: 'xampreps-firestore-access',
    timestamp: new Date().toISOString(),
    source: 'probeFirestoreTarget.js',
    version: '2.0.0',
    projectId,
    credentialInfo,
  };
  
  console.log('✍️  Writing probe document...');
  console.log(`   Collection: debug_import_probe`);
  console.log(`   Document: probe-xampreps`);
  
  await probeRef.set(probeData);
  console.log('   ✅ Write successful!\n');
  
  // Read back immediately
  console.log('📖 Reading probe document back...');
  const probeSnap = await probeRef.get();
  
  if (!probeSnap.exists) {
    console.error('❌ ERROR: Probe document not found after write!');
    process.exit(1);
  }
  
  const readData = probeSnap.data();
  console.log('   ✅ Read successful!');
  console.log(`   Data: ${JSON.stringify(readData, null, 2)}`);
  
  // Verify data matches
  if (readData.test !== probeData.test) {
    console.error('❌ ERROR: Read data does not match written data!');
    process.exit(1);
  }
  
  console.log('\n✅ Data integrity verified!\n');
  
  // List collections to show current state
  console.log('📊 Current Firestore collections:');
  const collections = await db.listCollections();
  collections.forEach(col => {
    console.log(`   - ${col.id}`);
  });
  
  console.log('\n========================================');
  console.log('🎉 PROBE COMPLETE - Firestore access verified for project "xampreps"');
  console.log('========================================\n');
}

// Run
probeFirestoreTarget()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Probe failed:', error.message);
    process.exit(1);
  });
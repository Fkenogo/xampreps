/**
 * One-Time Super Admin Provisioning Script
 * 
 * This script promotes a specific user (fredkenogo@gmail.com) to super_admin.
 * It sets both Firebase Auth custom claims and Firestore role.
 * 
 * Usage:
 *   1. Ensure Firebase Admin SDK is installed: npm install firebase-admin
 *   2. Set GOOGLE_APPLICATION_CREDENTIALS or run `firebase login`
 *   3. Run: node functions/scripts/setSuperAdmin.js
 * 
 * WARNING: This is a one-time administrative script. Run with caution.
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');

try {
  // Try to initialize with service account if it exists
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Initialized Firebase Admin SDK with service account');
} catch (error) {
  // Fall back to application default credentials
  console.log('⚠️ Service account not found, using Application Default Credentials');
  admin.initializeApp();
}

const SUPER_ADMIN_EMAIL = 'fredkenogo@gmail.com';
const SUPER_ADMIN_ROLE = 'super_admin';

async function setSuperAdmin() {
  console.log('\n🔐 XamPreps Super Admin Provisioning Script');
  console.log('============================================\n');

  try {
    // Step 1: Find user by email
    console.log(`🔍 Looking up user with email: ${SUPER_ADMIN_EMAIL}`);
    const userRecord = await admin.auth().getUserByEmail(SUPER_ADMIN_EMAIL);
    const uid = userRecord.uid;
    console.log(`✅ Found user: ${uid}`);
    console.log(`   Email: ${userRecord.email}`);
    console.log(`   Display Name: ${userRecord.displayName || '(none)'}`);
    console.log(`   Created: ${new Date(userRecord.metadata.creationTime).toLocaleString()}\n`);

    // Step 2: Set Firebase Auth custom claims
    console.log(`🔑 Setting custom claims: { role: "${SUPER_ADMIN_ROLE}" }`);
    await admin.auth().setCustomUserClaims(uid, { role: SUPER_ADMIN_ROLE });
    console.log('✅ Custom claims set successfully\n');

    // Step 3: Update Firestore role
    const db = admin.firestore();
    const userRolesRef = db.collection('user_roles').doc(uid);
    
    console.log('📝 Updating Firestore user_roles...');
    await userRolesRef.set({
      role: SUPER_ADMIN_ROLE,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('✅ Firestore role updated successfully\n');

    // Step 4: Verify profiles document exists
    const profilesRef = db.collection('profiles').doc(uid);
    const profileDoc = await profilesRef.get();
    
    if (profileDoc.exists) {
      console.log('✅ Profile document exists');
      const profileData = profileDoc.data();
      console.log(`   Name: ${profileData?.name || '(none)'}`);
      console.log(`   Email: ${profileData?.email || '(none)'}`);
    } else {
      console.log('⚠️ Profile document does not exist. Creating one...');
      await profilesRef.set({
        id: uid,
        email: SUPER_ADMIN_EMAIL,
        name: userRecord.displayName || SUPER_ADMIN_EMAIL.split('@')[0],
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Profile document created');
    }

    console.log('\n✅ Super admin provisioning complete!');
    console.log('\n📋 Summary:');
    console.log(`   User ID: ${uid}`);
    console.log(`   Email: ${SUPER_ADMIN_EMAIL}`);
    console.log(`   Role: ${SUPER_ADMIN_ROLE}`);
    console.log(`   Custom Claims: Set`);
    console.log(`   Firestore Role: Set`);
    console.log('\n⚠️  The user must sign out and sign back in for the changes to take effect.');
    console.log('   Custom claims are included in the ID token, which is refreshed on login.\n');

  } catch (error) {
    console.error('❌ Error during provisioning:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the script
setSuperAdmin();
/**
 * XamPreps Firebase Admin Initialization Helper
 * 
 * Provides deterministic Firebase Admin SDK initialization with explicit project ID resolution.
 * 
 * Resolution precedence:
 * 1. Service account JSON project_id (if GOOGLE_APPLICATION_CREDENTIALS file exists)
 * 2. GOOGLE_CLOUD_PROJECT env var
 * 3. GCLOUD_PROJECT env var
 * 4. Fail hard with clear error
 * 
 * Usage:
 *   const { db, projectId, credentialInfo } = require('./lib/initAdmin')();
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const EXPECTED_PROJECT = 'xampreps';

/**
 * Resolve the project ID from available sources
 */
function resolveProjectId() {
  // 1. Check service account JSON
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      if (serviceAccount.project_id) {
        return {
          projectId: serviceAccount.project_id,
          credentialMode: 'service_account',
          credentialEmail: serviceAccount.client_email,
        };
      }
    } catch (e) {
      // Fall through to next method
    }
  }

  // 2. Check GOOGLE_CLOUD_PROJECT
  if (process.env.GOOGLE_CLOUD_PROJECT) {
    return {
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      credentialMode: 'adc',
      credentialEmail: null,
    };
  }

  // 3. Check GCLOUD_PROJECT
  if (process.env.GCLOUD_PROJECT) {
    return {
      projectId: process.env.GCLOUD_PROJECT,
      credentialMode: 'adc',
      credentialEmail: null,
    };
  }

  // 4. Fail hard
  return null;
}

/**
 * Initialize Firebase Admin with explicit project ID
 */
function initAdmin(options = {}) {
  const {
    requireExactProject = true,
    expectedProject = EXPECTED_PROJECT,
    verbose = true,
  } = options;

  if (admin.apps.length > 0) {
    // Already initialized - return existing instance
    const existingProject = admin.app().options.projectId;
    if (requireExactProject && existingProject !== expectedProject) {
      throw new Error(
        `Firebase Admin already initialized with project "${existingProject}", expected "${expectedProject}"`
      );
    }
    return {
      db: admin.firestore(),
      projectId: existingProject,
      credentialInfo: 'existing_initialization',
      credentialMode: 'existing',
    };
  }

  const resolved = resolveProjectId();

  if (!resolved) {
    throw new Error(
      'Could not determine Firebase project ID.\n' +
      'Set one of:\n' +
      '  - GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON)\n' +
      '  - GOOGLE_CLOUD_PROJECT (environment variable)\n' +
      '  - GCLOUD_PROJECT (environment variable)\n'
    );
  }

  const { projectId, credentialMode, credentialEmail } = resolved;

  if (verbose) {
    console.log(`🔐 Firebase Admin Init:`);
    console.log(`   Credential Mode: ${credentialMode === 'service_account' ? 'Service Account' : 'Application Default Credentials (ADC)'}`);
    if (credentialEmail) {
      console.log(`   Service Account: ${credentialEmail}`);
    }
    console.log(`   Resolved Project ID: ${projectId}`);
  }

  if (requireExactProject && projectId !== expectedProject) {
    throw new Error(
      `Target project is "${projectId}", but expected "${expectedProject}".\n` +
      'Check your credentials and environment variables.'
    );
  }

  // Initialize with explicit projectId
  const initOptions = {
    projectId,
  };

  if (credentialMode === 'service_account') {
    const serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
    initOptions.credential = admin.credential.cert(serviceAccount);
  } else {
    // ADC
    initOptions.credential = admin.credential.applicationDefault();
  }

  admin.initializeApp(initOptions);

  if (verbose) {
    console.log(`   ✅ Firebase Admin initialized successfully\n`);
  }

  return {
    db: admin.firestore(),
    projectId: admin.app().options.projectId,
    credentialInfo: credentialMode === 'service_account' ? credentialEmail : 'ADC',
    credentialMode,
  };
}

module.exports = initAdmin;
module.exports.resolveProjectId = resolveProjectId;
module.exports.EXPECTED_PROJECT = EXPECTED_PROJECT;
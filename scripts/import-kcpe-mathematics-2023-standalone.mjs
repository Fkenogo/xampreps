#!/usr/bin/env node

/**
 * KCPE Mathematics 2023 Kenya - V2 Import Script (Standalone Admin SDK)
 * 
 * This script imports the KCPE Mathematics 2023 exam into the live XamPreps V2 Firestore system.
 * It uses Firebase Admin SDK directly to create documents in the correct order.
 * 
 * CRITICAL FIX: This version properly handles marking rule linkage by:
 * 1. Creating marking rules first and mapping local refs to real Firestore IDs
 * 2. Updating interactions with the real markingRuleId before writing them
 * 
 * Usage: 
 *   # Option 1: Using service account file (recommended)
 *   node scripts/import-kcpe-mathematics-2023-standalone.mjs --service-account /path/to/service-account.json
 *
 *   # Option 2: Using environment variables
 *   export FIREBASE_PROJECT_ID="xampreps-427913"
 *   export FIREBASE_CLIENT_EMAIL="service-account@xampreps-427913.iam.gserviceaccount.com"
 *   export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
 *   node scripts/import-kcpe-mathematics-2023-standalone.mjs
 *
 *   # Option 3: Dry run (validation only)
 *   node scripts/import-kcpe-mathematics-2023-standalone.mjs --dry-run
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Import the import package
const importPackage = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'docs/data/kcpe-mathematics-2023-kenya-v2-import.json'), 'utf8')
);

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('-d');
const isVerbose = args.includes('--verbose') || args.includes('-v');
const serviceAccountIndex = args.indexOf('--service-account');
const serviceAccountPath = serviceAccountIndex !== -1 ? args[serviceAccountIndex + 1] : null;

class KCPEImportScript {
  constructor() {
    this.references = new Map(); // Maps local refs to real Firestore IDs
    this.counts = {
      exams: 0,
      sections: 0,
      instructionGroups: 0,
      items: 0,
      interactions: 0,
      markingRules: 0,
      modelAnswerVersions: 0
    };
    this.examId = null;
    this.db = null;
    this.errors = [];
    this.credentialSource = null; // Track where credentials came from
  }

  async initializeFirebase() {
    try {
      let credentialConfig = null;

      // Priority 1: Service account file from --service-account argument
      if (serviceAccountPath) {
        if (!fs.existsSync(serviceAccountPath)) {
          throw new Error(`Service account file not found: ${serviceAccountPath}`);
        }
        console.log(`📄 Reading service account from: ${serviceAccountPath}`);
        const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
        const serviceAccount = JSON.parse(serviceAccountContent);
        
        if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
          throw new Error('Invalid service account file. Must contain project_id, client_email, and private_key.');
        }

        credentialConfig = {
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key.replace(/\\n/g, '\n')
        };
        this.credentialSource = `service-account file: ${serviceAccountPath}`;
      }
      // Priority 2: Environment variables
      else {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!projectId || !clientEmail || !privateKey) {
          throw new Error(
            'Missing Firebase credentials. Either:\n' +
            '  1. Use --service-account <path-to-json-file>, OR\n' +
            '  2. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.'
          );
        }

        credentialConfig = { projectId, clientEmail, privateKey };
        this.credentialSource = 'environment variables';
      }

      // Initialize Firebase Admin SDK
      if (!getApps().length) {
        initializeApp({
          credential: cert(credentialConfig)
        });
      }

      this.db = getFirestore();
      console.log(`✅ Firebase Admin SDK initialized using ${this.credentialSource}`);
      console.log(`📋 Project ID: ${credentialConfig.projectId}\n`);
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error.message);
      throw error;
    }
  }

  async run() {
    console.log('🚀 Starting KCPE Mathematics 2023 Kenya import...\n');

    if (isDryRun) {
      console.log('🔍 DRY RUN MODE - No data will be written to Firestore\n');
    }

    try {
      // Step 0: Validate import package
      console.log('0. Validating import package...');
      this.validateImportPackage();
      console.log('   ✅ Validation passed\n');

      if (isDryRun) {
        this.printDryRunSummary();
        console.log('\n🎉 Dry run completed successfully!');
        console.log('   No data was written to Firestore.\n');
        return;
      }

      // Initialize Firebase (only if not dry run)
      await this.initializeFirebase();

      // Step 1: Create Exam
      console.log('1. Creating Exam...');
      const examId = await this.createExam();
      this.examId = examId;
      console.log(`   ✅ Exam created with ID: ${examId}\n`);

      // Step 2: Create Sections
      console.log('2. Creating Sections...');
      await this.createSections(examId);
      console.log(`   ✅ Created ${this.counts.sections} section(s)\n`);

      // Step 3: Create Instruction Groups
      console.log('3. Creating Instruction Groups...');
      await this.createInstructionGroups(examId);
      console.log(`   ✅ Created ${this.counts.instructionGroups} instruction group(s)\n`);

      // Step 4: Create Items
      console.log('4. Creating Items...');
      await this.createItems(examId);
      console.log(`   ✅ Created ${this.counts.items} item(s)\n`);

      // Step 5: Create Marking Rules (BEFORE interactions so we can link them)
      console.log('5. Creating Marking Rules...');
      await this.createMarkingRules();
      console.log(`   ✅ Created ${this.counts.markingRules} marking rule(s)\n`);

      // Step 6: Create Interactions (with real markingRuleId from step 5)
      console.log('6. Creating Interactions...');
      await this.createInteractions();
      console.log(`   ✅ Created ${this.counts.interactions} interaction(s)\n`);

      // Step 7: Create Model Answer Versions
      console.log('7. Creating Model Answer Versions...');
      await this.createModelAnswerVersions();
      console.log(`   ✅ Created ${this.counts.modelAnswerVersions} model answer version(s)\n`);

      // Summary
      this.printSummary();

      console.log('🎉 Import completed successfully!');
      console.log(`   Exam ID: ${this.examId}`);
      console.log('   You can now access the exam in the XamPreps V2 system.\n');

    } catch (error) {
      console.error('❌ Import failed:', error.message);
      if (isVerbose && error.stack) {
        console.error('Stack trace:', error.stack);
      }
      process.exit(1);
    }
  }

  validateImportPackage() {
    // Check required top-level keys
    const requiredKeys = ['exam', 'sections', 'instructionGroups', 'items', 'interactions', 'markingRules', 'modelAnswerVersions'];
    for (const key of requiredKeys) {
      if (!importPackage[key]) {
        this.errors.push(`Missing required key: ${key}`);
      }
    }

    // Validate interactions have markingRuleRef that exist in markingRules
    const markingRuleRefs = new Set(importPackage.markingRules.map(mr => mr.ref));
    for (const interaction of importPackage.interactions) {
      if (interaction.markingRuleRef && !markingRuleRefs.has(interaction.markingRuleRef)) {
        this.errors.push(`Interaction ${interaction.ref} references non-existent marking rule: ${interaction.markingRuleRef}`);
      }
    }

    // Validate items referenced by interactions exist
    const itemRefs = new Set(importPackage.items.map(item => item.ref));
    for (const interaction of importPackage.interactions) {
      if (!itemRefs.has(interaction.itemRef)) {
        this.errors.push(`Interaction ${interaction.ref} references non-existent item: ${interaction.itemRef}`);
      }
    }

    // Validate model answer versions reference existing items and interactions
    const interactionRefs = new Set(importPackage.interactions.map(int => int.ref));
    for (const mav of importPackage.modelAnswerVersions) {
      if (!itemRefs.has(mav.itemRef)) {
        this.errors.push(`Model answer version references non-existent item: ${mav.itemRef}`);
      }
      if (!interactionRefs.has(mav.interactionRef)) {
        this.errors.push(`Model answer version references non-existent interaction: ${mav.interactionRef}`);
      }
    }

    if (this.errors.length > 0) {
      console.error('   ❌ Validation errors:');
      this.errors.forEach(err => console.error(`      - ${err}`));
      throw new Error(`Validation failed with ${this.errors.length} error(s)`);
    }

    console.log(`   ✅ All ${importPackage.items.length} items validated`);
    console.log(`   ✅ All ${importPackage.interactions.length} interactions validated`);
    console.log(`   ✅ All ${importPackage.markingRules.length} marking rules validated`);
    console.log(`   ✅ All ${importPackage.modelAnswerVersions.length} model answer versions validated`);
  }

  async createExam() {
    const examData = {
      ...importPackage.exam,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    };

    const docRef = this.db.collection('exams').doc();
    if (!isDryRun) {
      await docRef.set({ ...examData, examId: docRef.id });
    }
    this.references.set('exam', docRef.id);
    this.counts.exams++;
    return docRef.id;
  }

  async createSections(examId) {
    for (const section of importPackage.sections) {
      const sectionData = {
        ...section,
        examId: examId,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      };

      // Remove local ref fields
      delete sectionData.ref;

      const docRef = this.db.collection('sections').doc();
      if (!isDryRun) {
        await docRef.set({ ...sectionData, sectionId: docRef.id });
      }
      this.references.set(section.ref, docRef.id);
      this.counts.sections++;
    }
  }

  async createInstructionGroups(examId) {
    for (const instructionGroup of importPackage.instructionGroups) {
      const sectionId = this.references.get(instructionGroup.sectionRef);
      if (!sectionId) {
        throw new Error(`Section reference ${instructionGroup.sectionRef} not found`);
      }

      const instructionGroupData = {
        ...instructionGroup,
        examId: examId,
        sectionId: sectionId,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      };

      // Remove local ref fields
      delete instructionGroupData.ref;

      const docRef = this.db.collection('instruction_groups').doc();
      if (!isDryRun) {
        await docRef.set({ ...instructionGroupData, instructionGroupId: docRef.id });
      }
      this.references.set(instructionGroup.ref, docRef.id);
      this.counts.instructionGroups++;
    }
  }

  async createItems(examId) {
    for (const item of importPackage.items) {
      const sectionId = this.references.get(item.sectionRef);
      if (!sectionId) {
        throw new Error(`Section reference ${item.sectionRef} not found`);
      }

      const instructionGroupId = item.instructionGroupRef ?
        this.references.get(item.instructionGroupRef) : null;

      const itemData = {
        ...item,
        examId: examId,
        sectionId: sectionId,
        instructionGroupId: instructionGroupId,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      };

      // Remove local ref fields
      delete itemData.ref;

      const docRef = this.db.collection('items').doc();
      if (!isDryRun) {
        await docRef.set({ ...itemData, itemId: docRef.id });
      }
      this.references.set(item.ref, docRef.id);
      this.counts.items++;
    }
  }

  async createMarkingRules() {
    // Create marking rules first and map refs to real IDs
    for (const markingRule of importPackage.markingRules) {
      const markingRuleData = {
        ...markingRule,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      };

      // Remove local ref fields
      delete markingRuleData.ref;

      const docRef = this.db.collection('marking_rules').doc();
      if (!isDryRun) {
        await docRef.set({ ...markingRuleData, markingRuleId: docRef.id });
      }
      // Map local ref to real Firestore ID
      this.references.set(markingRule.ref, docRef.id);
      this.counts.markingRules++;
    }
  }

  async createInteractions() {
    for (const interaction of importPackage.interactions) {
      const itemId = this.references.get(interaction.itemRef);
      if (!itemId) {
        throw new Error(`Item reference ${interaction.itemRef} not found`);
      }

      const examId = this.references.get('exam');
      if (!examId) {
        throw new Error('Exam reference not found');
      }

      // Get the real markingRuleId from the marking rule we created earlier
      let markingRuleId = null;
      if (interaction.markingRuleRef) {
        markingRuleId = this.references.get(interaction.markingRuleRef);
        if (!markingRuleId) {
          throw new Error(`Marking rule reference ${interaction.markingRuleRef} not found`);
        }
      }

      const interactionData = {
        ...interaction,
        itemId: itemId,
        examId: examId,
        markingRuleId: markingRuleId, // Use real Firestore ID
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      };

      // Remove local ref fields
      delete interactionData.ref;
      delete interactionData.markingRuleRef; // Remove local ref, we have real ID now

      const docRef = this.db.collection('interactions').doc();
      if (!isDryRun) {
        await docRef.set({ ...interactionData, interactionId: docRef.id });
      }
      this.references.set(interaction.ref, docRef.id);
      this.counts.interactions++;
    }
  }

  async createModelAnswerVersions() {
    for (const modelAnswerVersion of importPackage.modelAnswerVersions) {
      const itemId = this.references.get(modelAnswerVersion.itemRef);
      if (!itemId) {
        throw new Error(`Item reference ${modelAnswerVersion.itemRef} not found`);
      }

      const interactionId = this.references.get(modelAnswerVersion.interactionRef);
      if (!interactionId) {
        throw new Error(`Interaction reference ${modelAnswerVersion.interactionRef} not found`);
      }

      const modelAnswerVersionData = {
        ...modelAnswerVersion,
        itemId: itemId,
        interactionId: interactionId,
        createdAt: Timestamp.fromDate(new Date())
      };

      // Remove local ref fields
      delete modelAnswerVersionData.ref;

      const docRef = this.db.collection('model_answer_versions').doc();
      if (!isDryRun) {
        await docRef.set(modelAnswerVersionData);
      }
      this.counts.modelAnswerVersions++;
    }
  }

  printDryRunSummary() {
    console.log('📊 Dry Run Summary:');
    console.log(`   Would create 1 exam`);
    console.log(`   Would create ${importPackage.sections.length} section(s)`);
    console.log(`   Would create ${importPackage.instructionGroups.length} instruction group(s)`);
    console.log(`   Would create ${importPackage.items.length} item(s)`);
    console.log(`   Would create ${importPackage.markingRules.length} marking rule(s)`);
    console.log(`   Would create ${importPackage.interactions.length} interaction(s) (with markingRuleId linkage)`);
    console.log(`   Would create ${importPackage.modelAnswerVersions.length} model answer version(s)`);
  }

  printSummary() {
    console.log('📊 Import Summary:');
    console.log(`   Exams: ${this.counts.exams}`);
    console.log(`   Sections: ${this.counts.sections}`);
    console.log(`   Instruction Groups: ${this.counts.instructionGroups}`);
    console.log(`   Items: ${this.counts.items}`);
    console.log(`   Marking Rules: ${this.counts.markingRules}`);
    console.log(`   Interactions: ${this.counts.interactions} (all linked to marking rules)`);
    console.log(`   Model Answer Versions: ${this.counts.modelAnswerVersions}`);
    console.log('');
  }
}

// Run the script
const importer = new KCPEImportScript();
importer.run().catch(console.error);
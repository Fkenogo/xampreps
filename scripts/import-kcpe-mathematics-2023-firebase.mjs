#!/usr/bin/env node

/**
 * KCPE Mathematics 2023 Kenya - V2 Import Script (Firebase Web SDK)
 * 
 * This script imports the KCPE Mathematics 2023 exam into the live XamPreps V2 Firestore system.
 * It uses the Firebase web SDK directly, which is already configured in the project.
 * 
 * Usage: node scripts/import-kcpe-mathematics-2023-firebase.mjs
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Import the import package
const importPackage = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'docs/data/kcpe-mathematics-2023-kenya-v2-import.json'), 'utf8')
);

// Import Firebase config from the project
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqJVHI",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "xampreps-427913.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "xampreps-427913",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "xampreps-427913.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "1072942160814",
  appId: process.env.FIREBASE_APP_ID || "1:1072942160814:web:5b7f0b5e5f5e5f5e5f5e5f"
};

// Collection names (matching v2-collections.ts)
const COLLECTIONS = {
  exams: 'exams',
  sections: 'sections',
  instructionGroups: 'instruction_groups',
  items: 'items',
  interactions: 'interactions',
  markingRules: 'marking_rules',
  modelAnswerVersions: 'model_answer_versions'
};

class KCPEImportScript {
  constructor() {
    this.references = new Map();
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
  }

  async initializeFirebase() {
    try {
      if (!getApps().length) {
        initializeApp(firebaseConfig);
      }
      this.db = getFirestore();
      console.log('✅ Firebase initialized successfully');
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error.message);
      throw error;
    }
  }

  async run() {
    console.log('🚀 Starting KCPE Mathematics 2023 Kenya import...\n');
    
    try {
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

      // Step 5: Create Interactions
      console.log('5. Creating Interactions...');
      await this.createInteractions();
      console.log(`   ✅ Created ${this.counts.interactions} interaction(s)\n`);

      // Step 6: Create Marking Rules
      console.log('6. Creating Marking Rules...');
      await this.createMarkingRules();
      console.log(`   ✅ Created ${this.counts.markingRules} marking rule(s)\n`);

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
      console.error('Stack trace:', error.stack);
      process.exit(1);
    }
  }

  async createExam() {
    const examData = {
      ...importPackage.exam,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    };

    const docRef = doc(collection(this.db, COLLECTIONS.exams));
    await setDoc(docRef, { ...examData, examId: docRef.id });
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

      delete sectionData.ref;

      const docRef = doc(collection(this.db, COLLECTIONS.sections));
      await setDoc(docRef, { ...sectionData, sectionId: docRef.id });
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

      delete instructionGroupData.ref;

      const docRef = doc(collection(this.db, COLLECTIONS.instructionGroups));
      await setDoc(docRef, { ...instructionGroupData, instructionGroupId: docRef.id });
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

      delete itemData.ref;

      const docRef = doc(collection(this.db, COLLECTIONS.items));
      await setDoc(docRef, { ...itemData, itemId: docRef.id });
      this.references.set(item.ref, docRef.id);
      this.counts.items++;
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

      const interactionData = {
        ...interaction,
        itemId: itemId,
        examId: examId,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      };

      delete interactionData.ref;

      const docRef = doc(collection(this.db, COLLECTIONS.interactions));
      await setDoc(docRef, { ...interactionData, interactionId: docRef.id });
      this.references.set(interaction.ref, docRef.id);
      this.counts.interactions++;
    }
  }

  async createMarkingRules() {
    for (const markingRule of importPackage.markingRules) {
      const markingRuleData = {
        ...markingRule,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      };

      delete markingRuleData.ref;

      const docRef = doc(collection(this.db, COLLECTIONS.markingRules));
      await setDoc(docRef, { ...markingRuleData, markingRuleId: docRef.id });
      this.references.set(markingRule.ref, docRef.id);
      this.counts.markingRules++;
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

      delete modelAnswerVersionData.ref;

      const docRef = doc(collection(this.db, COLLECTIONS.modelAnswerVersions));
      await setDoc(docRef, modelAnswerVersionData);
      this.counts.modelAnswerVersions++;
    }
  }

  printSummary() {
    console.log('📊 Import Summary:');
    console.log(`   Exams: ${this.counts.exams}`);
    console.log(`   Sections: ${this.counts.sections}`);
    console.log(`   Instruction Groups: ${this.counts.instructionGroups}`);
    console.log(`   Items: ${this.counts.items}`);
    console.log(`   Interactions: ${this.counts.interactions}`);
    console.log(`   Marking Rules: ${this.counts.markingRules}`);
    console.log(`   Model Answer Versions: ${this.counts.modelAnswerVersions}`);
    console.log('');
  }
}

// Run the script
const importer = new KCPEImportScript();
importer.run().catch(console.error);
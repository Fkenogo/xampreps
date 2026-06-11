#!/usr/bin/env node

/**
 * KCPE Mathematics 2023 Kenya - V2 Import Script
 * 
 * This script imports the KCPE Mathematics 2023 exam into the live XamPreps V2 Firestore system.
 * It uses the exact V2 creation functions and follows the strict write order requirements.
 * 
 * Usage: node scripts/import-kcpe-mathematics-2023.mjs
 */

import fs from 'fs';
import path from 'path';

// Import the V2 creation functions
import { 
  createExam, 
  createSection, 
  createInstructionGroup, 
  createItem, 
  createInteraction, 
  createMarkingRule, 
  createModelAnswerVersion 
} from '../src/integrations/firebase/v2-collections.js';

// Import the import package
const importPackage = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'docs/data/kcpe-mathematics-2023-kenya-v2-import.json'), 'utf8')
);

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
  }

  async run() {
    console.log('🚀 Starting KCPE Mathematics 2023 Kenya import...\n');
    
    try {
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
      // Add any additional fields required by the V2 system
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const examId = await createExam(examData);
    this.references.set('exam', examId);
    this.counts.exams++;
    return examId;
  }

  async createSections(examId) {
    for (const section of importPackage.sections) {
      const sectionData = {
        ...section,
        examId: examId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Remove the ref field as it's not needed in the actual document
      delete sectionData.ref;

      const sectionId = await createSection(sectionData);
      this.references.set(section.ref, sectionId);
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
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Remove the ref field as it's not needed in the actual document
      delete instructionGroupData.ref;

      const instructionGroupId = await createInstructionGroup(instructionGroupData);
      this.references.set(instructionGroup.ref, instructionGroupId);
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
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Remove the ref field as it's not needed in the actual document
      delete itemData.ref;

      const itemId = await createItem(itemData);
      this.references.set(item.ref, itemId);
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
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Remove the ref field as it's not needed in the actual document
      delete interactionData.ref;

      const interactionId = await createInteraction(interactionData);
      this.references.set(interaction.ref, interactionId);
      this.counts.interactions++;
    }
  }

  async createMarkingRules() {
    for (const markingRule of importPackage.markingRules) {
      const markingRuleData = {
        ...markingRule,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Remove the ref field as it's not needed in the actual document
      delete markingRuleData.ref;

      const markingRuleId = await createMarkingRule(markingRuleData);
      this.references.set(markingRule.ref, markingRuleId);
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
        createdAt: new Date()
      };

      // Remove the ref field as it's not needed in the actual document
      delete modelAnswerVersionData.ref;

      await createModelAnswerVersion(modelAnswerVersionData);
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
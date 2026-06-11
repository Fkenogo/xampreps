#!/usr/bin/env node

/**
 * Generic XamPreps V2 package importer.
 *
 * Dry run:
 *   node scripts/import-v2-package.mjs --dry-run --package docs/data/ple-maths-2015-uganda-v2-import.json
 *
 * Real import:
 *   node scripts/import-v2-package.mjs --service-account /absolute/path/service-account.json --package docs/data/ple-maths-2015-uganda-v2-import.json
 */

import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const COLLECTIONS = {
  exams: 'exams',
  sections: 'sections',
  instructionGroups: 'instruction_groups',
  contextBlocks: 'context_blocks',
  items: 'items',
  interactions: 'interactions',
  markingRules: 'marking_rules',
  modelAnswerVersions: 'model_answer_versions',
};

const ALLOWED_MARKING_MODES = new Set([
  'exactMatch',
  'normalizedTextMatch',
  'alternativeAnswers',
  'keywordBased',
  'conceptMatch',
  'mcqOptionMatch',
  'manualReviewRequired',
  'rubricBasedManualReview',
  'hybridAutoPlusManual',
]);

function parseArgs(argv) {
  const args = {
    dryRun: false,
    serviceAccountPath: null,
    packagePath: null,
    projectId: null,
    useAdc: false,
    verbose: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--dry-run':
      case '-d':
        args.dryRun = true;
        break;
      case '--verbose':
      case '-v':
        args.verbose = true;
        break;
      case '--service-account':
        args.serviceAccountPath = argv[index + 1] ?? null;
        index += 1;
        break;
      case '--package':
        args.packagePath = argv[index + 1] ?? null;
        index += 1;
        break;
      case '--use-adc':
        args.useAdc = true;
        break;
      case '--project-id':
        args.projectId = argv[index + 1] ?? null;
        index += 1;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printUsage() {
  console.log(`Usage:
  node scripts/import-v2-package.mjs --dry-run --package <path>
  node scripts/import-v2-package.mjs --dry-run --service-account <path> --package <path>
  node scripts/import-v2-package.mjs --service-account <path> --package <path>
  node scripts/import-v2-package.mjs --use-adc --project-id <project> --package <path>

Options:
  --package <path>          V2 package JSON file to validate/import.
  --service-account <path>  Firebase service-account JSON file. Required for real import.
  --use-adc                 Use Google Application Default Credentials instead of a service-account file.
  --project-id <project>    Firebase/GCP project id. Useful with --use-adc.
  --dry-run                 Validate and summarize only; no Firestore writes.
  --verbose                 Print stack traces on errors.`);
}

function loadJsonFile(filePath, label) {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`${label} not found: ${resolvedPath}`);
  }
  const parsed = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  return { parsed, resolvedPath };
}

function loadServiceAccount(serviceAccountPath) {
  const { parsed: serviceAccount, resolvedPath } = loadJsonFile(serviceAccountPath, 'Service account file');

  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Invalid service account file. Must contain project_id, client_email, and private_key.');
  }

  return {
    credentialConfig: {
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
    },
    credentialSource: `service-account file: ${resolvedPath}`,
  };
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function serializeConceptGroupsForFirestore(conceptGroups) {
  if (!Array.isArray(conceptGroups)) return conceptGroups;
  return Object.fromEntries(conceptGroups.map((group, index) => [String(index), group]));
}

class V2PackageImporter {
  constructor({ importPackage, packagePath, serviceAccountPath, projectId, useAdc, dryRun }) {
    this.importPackage = importPackage;
    this.packagePath = packagePath;
    this.serviceAccountPath = serviceAccountPath;
    this.projectId = projectId;
    this.useAdc = useAdc;
    this.dryRun = dryRun;
    this.references = new Map();
    this.counts = {
      exams: 0,
      sections: 0,
      instructionGroups: 0,
      contextBlocks: 0,
      items: 0,
      markingRules: 0,
      interactions: 0,
      modelAnswerVersions: 0,
    };
    this.errors = [];
    this.warnings = [];
    this.db = null;
    this.examId = null;
    this.credentialSource = this.dryRun && !serviceAccountPath
      ? 'not loaded (dry-run without service account)'
      : null;
  }

  async initializeFirebase() {
    if (this.dryRun && !this.serviceAccountPath && !this.useAdc) {
      return;
    }

    if (!getApps().length) {
      if (this.useAdc) {
        initializeApp({
          credential: applicationDefault(),
          ...(this.projectId ? { projectId: this.projectId } : {}),
        });
        this.credentialSource = `Google Application Default Credentials${this.projectId ? ` (project: ${this.projectId})` : ''}`;
      } else {
        const { credentialConfig, credentialSource } = loadServiceAccount(this.serviceAccountPath);
        this.credentialSource = credentialSource;
        initializeApp({
          credential: cert(credentialConfig),
        });
      }
    } else if (this.useAdc) {
      this.credentialSource = `Google Application Default Credentials${this.projectId ? ` (project: ${this.projectId})` : ''}`;
    } else if (this.serviceAccountPath) {
      this.credentialSource = `service-account file: ${path.resolve(process.cwd(), this.serviceAccountPath)}`;
    }

    this.db = getFirestore();
  }

  validateImportPackage() {
    const requiredKeys = [
      'exam',
      'sections',
      'instructionGroups',
      'items',
      'interactions',
      'markingRules',
      'modelAnswerVersions',
    ];

    for (const key of requiredKeys) {
      if (!this.importPackage[key]) {
        this.errors.push(`Missing required key: ${key}`);
      }
    }

    if (this.errors.length > 0) {
      this.throwIfErrors();
      return;
    }

    const sectionRefs = new Set(this.importPackage.sections.map((section) => section.ref));
    const instructionGroupRefs = new Set(this.importPackage.instructionGroups.map((group) => group.ref));
    const contextBlockRefs = new Set((this.importPackage.contextBlocks || []).map((block) => block.ref));
    const itemRefs = new Set(this.importPackage.items.map((item) => item.ref));
    const interactionRefs = new Set(this.importPackage.interactions.map((interaction) => interaction.ref));
    const markingRuleRefs = new Set(this.importPackage.markingRules.map((rule) => rule.ref));
    const interactionsByItemRef = new Map();

    for (const instructionGroup of this.importPackage.instructionGroups) {
      if (!sectionRefs.has(instructionGroup.sectionRef)) {
        this.errors.push(`Instruction group ${instructionGroup.ref} references missing section: ${instructionGroup.sectionRef}`);
      }
    }

    for (const contextBlock of this.importPackage.contextBlocks || []) {
      if (contextBlock.sectionRef && !sectionRefs.has(contextBlock.sectionRef)) {
        this.errors.push(`Context block ${contextBlock.ref} references missing section: ${contextBlock.sectionRef}`);
      }
      if (contextBlock.instructionGroupRef && !instructionGroupRefs.has(contextBlock.instructionGroupRef)) {
        this.errors.push(`Context block ${contextBlock.ref} references missing instruction group: ${contextBlock.instructionGroupRef}`);
      }
    }

    for (const interaction of this.importPackage.interactions) {
      if (!itemRefs.has(interaction.itemRef)) {
        this.errors.push(`Interaction ${interaction.ref} references missing item: ${interaction.itemRef}`);
      }
      if (!markingRuleRefs.has(interaction.markingRuleRef)) {
        this.errors.push(`Interaction ${interaction.ref} references missing marking rule: ${interaction.markingRuleRef}`);
      }

      const matchingRule = this.importPackage.markingRules.find((rule) => rule.ref === interaction.markingRuleRef);
      if (matchingRule && Boolean(interaction.manualReviewDefault) !== Boolean(matchingRule.manualReviewRequired)) {
        this.errors.push(`Manual review mismatch between interaction ${interaction.ref} and marking rule ${matchingRule.ref}`);
      }

      const existing = interactionsByItemRef.get(interaction.itemRef) || [];
      existing.push(interaction);
      interactionsByItemRef.set(interaction.itemRef, existing);
    }

    for (const item of this.importPackage.items) {
      if (!sectionRefs.has(item.sectionRef)) {
        this.errors.push(`Item ${item.ref} references missing section: ${item.sectionRef}`);
      }
      if (item.instructionGroupRef && !instructionGroupRefs.has(item.instructionGroupRef)) {
        this.errors.push(`Item ${item.ref} references missing instruction group: ${item.instructionGroupRef}`);
      }
      for (const contextBlockRef of item.contextBlockRefs || []) {
        if (!contextBlockRefs.has(contextBlockRef)) {
          this.errors.push(`Item ${item.ref} references missing context block: ${contextBlockRef}`);
        }
      }

      const itemInteractions = interactionsByItemRef.get(item.ref) || [];
      if (itemInteractions.length === 0) {
        this.errors.push(`Item ${item.ref} has no interactions`);
      }
      if ((item.itemType === 'multiPart' || item.layoutMode === 'multiPart') && itemInteractions.length < 2) {
        this.errors.push(`Multipart item ${item.ref} has fewer than two interactions`);
      }
      if (itemInteractions.length > 1 && item.layoutMode !== 'multiPart') {
        this.warnings.push(`Item ${item.ref} has multiple interactions but layoutMode=${item.layoutMode}`);
      }

      for (const media of item.mediaRefs || []) {
        if (!media.url || typeof media.url !== 'string') {
          this.errors.push(`Item ${item.ref} has a mediaRef without a string url`);
          continue;
        }

        const localPath = path.join(process.cwd(), 'public', decodeURIComponent(media.url.replace(/^\//, '')));
        if (!fs.existsSync(localPath)) {
          this.errors.push(`Item ${item.ref} media file not found: ${localPath}`);
        }
      }
    }

    for (const modelAnswerVersion of this.importPackage.modelAnswerVersions) {
      if (!itemRefs.has(modelAnswerVersion.itemRef)) {
        this.errors.push(`Model answer version ${modelAnswerVersion.ref} references missing item: ${modelAnswerVersion.itemRef}`);
      }
      if (!interactionRefs.has(modelAnswerVersion.interactionRef)) {
        this.errors.push(`Model answer version ${modelAnswerVersion.ref} references missing interaction: ${modelAnswerVersion.interactionRef}`);
      }
    }

    for (const markingRule of this.importPackage.markingRules) {
      const used = this.importPackage.interactions.some((interaction) => interaction.markingRuleRef === markingRule.ref);
      if (!used) {
        this.errors.push(`Orphan marking rule: ${markingRule.ref}`);
      }
      this.validateMarkingRule(markingRule);
    }

    const itemMarks = this.importPackage.items.reduce((sum, item) => sum + Number(item.marksTotal || 0), 0);
    if (Number(this.importPackage.exam.totalMarks || 0) !== itemMarks) {
      this.errors.push(`Exam totalMarks (${this.importPackage.exam.totalMarks}) does not match summed item marks (${itemMarks})`);
    }

    this.throwIfErrors();
  }

  throwIfErrors() {
    if (this.errors.length === 0) return;

    console.error('❌ Validation errors:');
    for (const error of this.errors) {
      console.error(`   - ${error}`);
    }
    throw new Error(`Validation failed with ${this.errors.length} error(s)`);
  }

  validateMarkingRule(markingRule) {
    if (!ALLOWED_MARKING_MODES.has(markingRule.markingMode)) {
      this.errors.push(`Marking rule ${markingRule.ref} has unsupported markingMode: ${markingRule.markingMode}`);
    }

    if (typeof markingRule.manualReviewRequired !== 'boolean') {
      this.errors.push(`Marking rule ${markingRule.ref} must include boolean manualReviewRequired`);
    }

    if (
      markingRule.allowFullSentenceContainingAnswer !== undefined &&
      typeof markingRule.allowFullSentenceContainingAnswer !== 'boolean'
    ) {
      this.errors.push(`Marking rule ${markingRule.ref} allowFullSentenceContainingAnswer must be a boolean when provided`);
    }

    if (markingRule.markingMode === 'conceptMatch') {
      if (!Array.isArray(markingRule.conceptGroups) || markingRule.conceptGroups.length === 0) {
        this.errors.push(`ConceptMatch rule ${markingRule.ref} must include non-empty conceptGroups`);
      } else {
        markingRule.conceptGroups.forEach((group, groupIndex) => {
          if (!Array.isArray(group) || group.length === 0) {
            this.errors.push(`ConceptMatch rule ${markingRule.ref} conceptGroups[${groupIndex}] must be a non-empty array`);
            return;
          }
          group.forEach((term, termIndex) => {
            if (!isNonEmptyString(term)) {
              this.errors.push(`ConceptMatch rule ${markingRule.ref} conceptGroups[${groupIndex}][${termIndex}] must be a non-empty string`);
            }
          });
        });
      }

      if (
        typeof markingRule.minimumConceptGroupsRequired !== 'number' ||
        markingRule.minimumConceptGroupsRequired <= 0
      ) {
        this.errors.push(`ConceptMatch rule ${markingRule.ref} must include positive minimumConceptGroupsRequired`);
      } else if (
        Array.isArray(markingRule.conceptGroups) &&
        markingRule.minimumConceptGroupsRequired > markingRule.conceptGroups.length
      ) {
        this.errors.push(`ConceptMatch rule ${markingRule.ref} minimumConceptGroupsRequired cannot exceed conceptGroups length`);
      }
    }
  }

  async guardAgainstDuplicateExam() {
    if (this.dryRun) return;
    if (!this.db) {
      throw new Error('Firestore is not initialized');
    }

    const exam = this.importPackage.exam;
    const duplicateSnapshot = await this.db.collection(COLLECTIONS.exams)
      .where('title', '==', exam.title)
      .where('year', '==', exam.year)
      .where('country', '==', exam.country)
      .where('subject', '==', exam.subject)
      .where('engineVersion', '==', exam.engineVersion)
      .limit(5)
      .get();

    if (!duplicateSnapshot.empty) {
      const matches = duplicateSnapshot.docs.map((doc) => doc.id).join(', ');
      throw new Error(
        `Duplicate exam guard stopped import. Existing exam(s) match title/year/country/subject/engineVersion: ${matches}`,
      );
    }
  }

  async run() {
    console.log('🚀 XamPreps V2 Package Importer');
    console.log(`   Mode: ${this.dryRun ? 'DRY RUN - no Firestore writes' : 'REAL IMPORT'}`);
    console.log(`   Package: ${this.packagePath}`);
    console.log(`   Exam: ${this.importPackage.exam?.title || '(missing title)'}`);

    await this.initializeFirebase();
    console.log(`   Credential source: ${this.credentialSource}`);
    console.log('');

    console.log('0. Validating package...');
    this.validateImportPackage();
    this.printValidationSummary();
    console.log('');

    if (this.dryRun) {
      this.printDryRunSummary();
      console.log('\n✅ Dry run completed successfully. No data was written to Firestore.');
      return;
    }

    console.log('0b. Checking duplicate exam guard...');
    await this.guardAgainstDuplicateExam();
    console.log('   ✅ No duplicate exam found\n');

    console.log('1. Creating exam...');
    const examId = await this.createExam();
    this.examId = examId;
    console.log(`   ✅ Created exam ${examId}\n`);

    console.log('2. Creating sections...');
    await this.createSections(examId);
    console.log(`   ✅ Created ${this.counts.sections} section(s)\n`);

    console.log('3. Creating instruction groups...');
    await this.createInstructionGroups(examId);
    console.log(`   ✅ Created ${this.counts.instructionGroups} instruction group(s)\n`);

    console.log('4. Creating context blocks...');
    await this.createContextBlocks(examId);
    console.log(`   ✅ Created ${this.counts.contextBlocks} context block(s)\n`);

    console.log('5. Creating items...');
    await this.createItems(examId);
    console.log(`   ✅ Created ${this.counts.items} item(s)\n`);

    console.log('6. Creating marking rules...');
    await this.createMarkingRules();
    console.log(`   ✅ Created ${this.counts.markingRules} marking rule(s)\n`);

    console.log('7. Creating interactions...');
    await this.createInteractions();
    console.log(`   ✅ Created ${this.counts.interactions} interaction(s)\n`);

    console.log('8. Creating model answer versions...');
    await this.createModelAnswerVersions();
    console.log(`   ✅ Created ${this.counts.modelAnswerVersions} model answer version(s)\n`);

    this.printSummary();
    console.log(`✅ Import completed successfully. Created examId: ${this.examId}`);
  }

  timestamped(data, includeUpdatedAt = true) {
    return {
      ...data,
      createdAt: Timestamp.fromDate(new Date()),
      ...(includeUpdatedAt ? { updatedAt: Timestamp.fromDate(new Date()) } : {}),
    };
  }

  async createExam() {
    const examData = this.timestamped(this.importPackage.exam);
    const docRef = this.db.collection(COLLECTIONS.exams).doc();
    await docRef.set({ ...examData, examId: docRef.id });
    this.references.set('exam', docRef.id);
    this.counts.exams += 1;
    return docRef.id;
  }

  async createSections(examId) {
    for (const section of this.importPackage.sections) {
      const sectionData = this.timestamped({
        ...section,
        examId,
      });
      delete sectionData.ref;

      const docRef = this.db.collection(COLLECTIONS.sections).doc();
      await docRef.set({ ...sectionData, sectionId: docRef.id });
      this.references.set(section.ref, docRef.id);
      this.counts.sections += 1;
    }
  }

  async createInstructionGroups(examId) {
    for (const instructionGroup of this.importPackage.instructionGroups) {
      const sectionId = this.references.get(instructionGroup.sectionRef);
      if (!sectionId) {
        throw new Error(`Section reference ${instructionGroup.sectionRef} not found`);
      }

      const instructionGroupData = this.timestamped({
        ...instructionGroup,
        examId,
        sectionId,
      });
      delete instructionGroupData.ref;
      delete instructionGroupData.sectionRef;

      const docRef = this.db.collection(COLLECTIONS.instructionGroups).doc();
      await docRef.set({ ...instructionGroupData, instructionGroupId: docRef.id });
      this.references.set(instructionGroup.ref, docRef.id);
      this.counts.instructionGroups += 1;
    }
  }

  async createContextBlocks(examId) {
    for (const contextBlock of this.importPackage.contextBlocks || []) {
      const sectionId = contextBlock.sectionRef
        ? this.references.get(contextBlock.sectionRef)
        : null;
      const instructionGroupId = contextBlock.instructionGroupRef
        ? this.references.get(contextBlock.instructionGroupRef)
        : null;

      const contextBlockData = this.timestamped({
        ...contextBlock,
        examId,
        ...(sectionId ? { sectionId } : {}),
        ...(instructionGroupId ? { instructionGroupId } : {}),
      });
      delete contextBlockData.ref;
      delete contextBlockData.sectionRef;
      delete contextBlockData.instructionGroupRef;

      const docRef = this.db.collection(COLLECTIONS.contextBlocks).doc();
      await docRef.set({ ...contextBlockData, contextBlockId: docRef.id });
      this.references.set(contextBlock.ref, docRef.id);
      this.counts.contextBlocks += 1;
    }
  }

  async createItems(examId) {
    for (const item of this.importPackage.items) {
      const sectionId = this.references.get(item.sectionRef);
      if (!sectionId) {
        throw new Error(`Section reference ${item.sectionRef} not found`);
      }

      const instructionGroupId = item.instructionGroupRef
        ? this.references.get(item.instructionGroupRef)
        : null;
      const contextBlockIds = (item.contextBlockRefs || []).map((contextBlockRef) => {
        const contextBlockId = this.references.get(contextBlockRef);
        if (!contextBlockId) {
          throw new Error(`Context block reference ${contextBlockRef} not found`);
        }
        return contextBlockId;
      });

      const itemData = this.timestamped({
        ...item,
        examId,
        sectionId,
        instructionGroupId,
        ...(contextBlockIds.length > 0 ? { contextBlockIds } : {}),
      });
      delete itemData.ref;
      delete itemData.sectionRef;
      delete itemData.instructionGroupRef;
      delete itemData.contextBlockRefs;

      const docRef = this.db.collection(COLLECTIONS.items).doc();
      await docRef.set({ ...itemData, itemId: docRef.id });
      this.references.set(item.ref, docRef.id);
      this.counts.items += 1;
    }
  }

  async createMarkingRules() {
    for (const markingRule of this.importPackage.markingRules) {
      const markingRuleData = this.timestamped(markingRule);
      if (markingRuleData.markingMode === 'conceptMatch') {
        markingRuleData.conceptGroups = serializeConceptGroupsForFirestore(markingRuleData.conceptGroups);
      }
      delete markingRuleData.ref;

      const docRef = this.db.collection(COLLECTIONS.markingRules).doc();
      await docRef.set({ ...markingRuleData, markingRuleId: docRef.id });
      this.references.set(markingRule.ref, docRef.id);
      this.counts.markingRules += 1;
    }
  }

  async createInteractions() {
    for (const interaction of this.importPackage.interactions) {
      const itemId = this.references.get(interaction.itemRef);
      if (!itemId) {
        throw new Error(`Item reference ${interaction.itemRef} not found`);
      }

      const examId = this.references.get('exam');
      if (!examId) {
        throw new Error('Exam reference not found');
      }

      let markingRuleId = null;
      if (interaction.markingRuleRef) {
        markingRuleId = this.references.get(interaction.markingRuleRef);
        if (!markingRuleId) {
          throw new Error(`Marking rule reference ${interaction.markingRuleRef} not found`);
        }
      }

      const interactionData = this.timestamped({
        ...interaction,
        itemId,
        examId,
        markingRuleId,
      });
      delete interactionData.ref;
      delete interactionData.itemRef;
      delete interactionData.markingRuleRef;

      const docRef = this.db.collection(COLLECTIONS.interactions).doc();
      await docRef.set({ ...interactionData, interactionId: docRef.id });
      this.references.set(interaction.ref, docRef.id);
      this.counts.interactions += 1;
    }
  }

  async createModelAnswerVersions() {
    for (const modelAnswerVersion of this.importPackage.modelAnswerVersions) {
      const itemId = this.references.get(modelAnswerVersion.itemRef);
      if (!itemId) {
        throw new Error(`Item reference ${modelAnswerVersion.itemRef} not found`);
      }

      const interactionId = this.references.get(modelAnswerVersion.interactionRef);
      if (!interactionId) {
        throw new Error(`Interaction reference ${modelAnswerVersion.interactionRef} not found`);
      }

      const modelAnswerVersionData = this.timestamped({
        ...modelAnswerVersion,
        itemId,
        interactionId,
      }, false);
      delete modelAnswerVersionData.ref;
      delete modelAnswerVersionData.itemRef;
      delete modelAnswerVersionData.interactionRef;

      const docRef = this.db.collection(COLLECTIONS.modelAnswerVersions).doc();
      await docRef.set({ ...modelAnswerVersionData, modelAnswerVersionId: docRef.id });
      this.counts.modelAnswerVersions += 1;
    }
  }

  printValidationSummary() {
    console.log(`   ✅ Package shape validated`);
    console.log(`   ✅ ${this.importPackage.items.length} item(s) validated`);
    console.log(`   ✅ ${this.importPackage.contextBlocks?.length || 0} context block(s) validated`);
    console.log(`   ✅ ${this.importPackage.interactions.length} interaction(s) validated`);
    console.log(`   ✅ ${this.importPackage.markingRules.length} marking rule(s) validated`);
    console.log(`   ✅ ${this.importPackage.modelAnswerVersions.length} model answer version(s) validated`);

    if (this.warnings.length > 0) {
      console.log('   ⚠️ Warnings:');
      for (const warning of this.warnings) {
        console.log(`      - ${warning}`);
      }
    }
  }

  printDryRunSummary() {
    console.log('📊 Dry Run Summary:');
    console.log(`   Would create 1 exam`);
    console.log(`   Would create ${this.importPackage.sections.length} section(s)`);
    console.log(`   Would create ${this.importPackage.instructionGroups.length} instruction group(s)`);
    console.log(`   Would create ${this.importPackage.contextBlocks?.length || 0} context block(s)`);
    console.log(`   Would create ${this.importPackage.items.length} item(s)`);
    console.log(`   Would create ${this.importPackage.markingRules.length} marking rule(s)`);
    console.log(`   Would create ${this.importPackage.interactions.length} interaction(s) after marking rules`);
    console.log(`   Would create ${this.importPackage.modelAnswerVersions.length} model answer version(s)`);
    console.log(`   Duplicate exam guard would run before real import`);
  }

  printSummary() {
    console.log('📊 Import Summary:');
    console.log(`   Exams: ${this.counts.exams}`);
    console.log(`   Sections: ${this.counts.sections}`);
    console.log(`   Instruction Groups: ${this.counts.instructionGroups}`);
    console.log(`   Context Blocks: ${this.counts.contextBlocks}`);
    console.log(`   Items: ${this.counts.items}`);
    console.log(`   Marking Rules: ${this.counts.markingRules}`);
    console.log(`   Interactions: ${this.counts.interactions}`);
    console.log(`   Model Answer Versions: ${this.counts.modelAnswerVersions}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.packagePath) {
    throw new Error('Missing required argument: --package <path>');
  }
  if (!args.dryRun && !args.serviceAccountPath && !args.useAdc) {
    throw new Error('Missing credentials for real import: pass --service-account <path> or --use-adc');
  }
  if (args.serviceAccountPath && args.useAdc) {
    throw new Error('Choose only one credential mode: --service-account <path> or --use-adc');
  }

  const { parsed: importPackage, resolvedPath: packagePath } = loadJsonFile(args.packagePath, 'V2 package file');

  const importer = new V2PackageImporter({
    importPackage,
    packagePath,
    serviceAccountPath: args.serviceAccountPath,
    projectId: args.projectId,
    useAdc: args.useAdc,
    dryRun: args.dryRun,
  });

  await importer.run();
}

const verboseErrors = process.argv.includes('--verbose') || process.argv.includes('-v');

main().catch((error) => {
  console.error(`❌ ${error.message}`);
  if (verboseErrors && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});

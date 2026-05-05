#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const packagePath = process.argv[2];

if (!packagePath) {
  console.error('Usage: node scripts/dry-run-v2-import-package.mjs <v2-package-json>');
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), packagePath);
const importPackage = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
const errors = [];
const warnings = [];

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
  if (!importPackage[key]) {
    errors.push(`Missing required key: ${key}`);
  }
}

const sectionRefs = new Set((importPackage.sections || []).map((section) => section.ref));
const instructionGroupRefs = new Set((importPackage.instructionGroups || []).map((group) => group.ref));
const contextBlockRefs = new Set((importPackage.contextBlocks || []).map((block) => block.ref));
const itemRefs = new Set((importPackage.items || []).map((item) => item.ref));
const interactionRefs = new Set((importPackage.interactions || []).map((interaction) => interaction.ref));
const markingRuleRefs = new Set((importPackage.markingRules || []).map((rule) => rule.ref));
const interactionsByItemRef = new Map();

for (const interaction of importPackage.interactions || []) {
  if (!itemRefs.has(interaction.itemRef)) {
    errors.push(`Interaction ${interaction.ref} references missing item: ${interaction.itemRef}`);
  }
  if (!markingRuleRefs.has(interaction.markingRuleRef)) {
    errors.push(`Interaction ${interaction.ref} references missing marking rule: ${interaction.markingRuleRef}`);
  }

  const rule = (importPackage.markingRules || []).find((candidate) => candidate.ref === interaction.markingRuleRef);
  if (rule && Boolean(interaction.manualReviewDefault) !== Boolean(rule.manualReviewRequired)) {
    errors.push(`Manual review mismatch between interaction ${interaction.ref} and marking rule ${rule.ref}`);
  }

  const existing = interactionsByItemRef.get(interaction.itemRef) || [];
  existing.push(interaction);
  interactionsByItemRef.set(interaction.itemRef, existing);
}

for (const group of importPackage.instructionGroups || []) {
  if (!sectionRefs.has(group.sectionRef)) {
    errors.push(`Instruction group ${group.ref} references missing section: ${group.sectionRef}`);
  }
}

for (const block of importPackage.contextBlocks || []) {
  if (block.sectionRef && !sectionRefs.has(block.sectionRef)) {
    errors.push(`Context block ${block.ref} references missing section: ${block.sectionRef}`);
  }
  if (block.instructionGroupRef && !instructionGroupRefs.has(block.instructionGroupRef)) {
    errors.push(`Context block ${block.ref} references missing instruction group: ${block.instructionGroupRef}`);
  }

  for (const media of block.mediaRefs || []) {
    if (!media.url || typeof media.url !== 'string') {
      errors.push(`Context block ${block.ref} has a mediaRef without a string url`);
      continue;
    }

    const localPath = path.join(process.cwd(), 'public', decodeURIComponent(media.url.replace(/^\//, '')));
    if (!fs.existsSync(localPath)) {
      errors.push(`Context block ${block.ref} media file not found: ${localPath}`);
    }
  }
}

for (const item of importPackage.items || []) {
  if (!sectionRefs.has(item.sectionRef)) {
    errors.push(`Item ${item.ref} references missing section: ${item.sectionRef}`);
  }
  if (item.instructionGroupRef && !instructionGroupRefs.has(item.instructionGroupRef)) {
    errors.push(`Item ${item.ref} references missing instruction group: ${item.instructionGroupRef}`);
  }
  for (const contextBlockRef of item.contextBlockRefs || []) {
    if (!contextBlockRefs.has(contextBlockRef)) {
      errors.push(`Item ${item.ref} references missing context block: ${contextBlockRef}`);
    }
  }

  const itemInteractions = interactionsByItemRef.get(item.ref) || [];
  if (itemInteractions.length === 0) {
    errors.push(`Item ${item.ref} has no interactions`);
  }
  if ((item.itemType === 'multiPart' || item.layoutMode === 'multiPart') && itemInteractions.length < 2) {
    errors.push(`Multipart item ${item.ref} has fewer than two interactions`);
  }
  if (itemInteractions.length > 1 && item.layoutMode !== 'multiPart') {
    warnings.push(`Item ${item.ref} has multiple interactions but layoutMode=${item.layoutMode}`);
  }

  for (const media of item.mediaRefs || []) {
    if (!media.url || typeof media.url !== 'string') {
      errors.push(`Item ${item.ref} has a mediaRef without a string url`);
      continue;
    }

    const localPath = path.join(process.cwd(), 'public', decodeURIComponent(media.url.replace(/^\//, '')));
    if (!fs.existsSync(localPath)) {
      errors.push(`Item ${item.ref} media file not found: ${localPath}`);
    }
  }
}

for (const modelAnswer of importPackage.modelAnswerVersions || []) {
  if (!itemRefs.has(modelAnswer.itemRef)) {
    errors.push(`Model answer ${modelAnswer.ref} references missing item: ${modelAnswer.itemRef}`);
  }
  if (!interactionRefs.has(modelAnswer.interactionRef)) {
    errors.push(`Model answer ${modelAnswer.ref} references missing interaction: ${modelAnswer.interactionRef}`);
  }
}

for (const rule of importPackage.markingRules || []) {
  const used = (importPackage.interactions || []).some((interaction) => interaction.markingRuleRef === rule.ref);
  if (!used) {
    errors.push(`Orphan marking rule: ${rule.ref}`);
  }
}

const itemMarks = (importPackage.items || []).reduce((sum, item) => sum + Number(item.marksTotal || 0), 0);
if (Number(importPackage.exam?.totalMarks || 0) !== itemMarks) {
  errors.push(`Exam totalMarks (${importPackage.exam?.totalMarks}) does not match item marks (${itemMarks})`);
}

const summary = {
  packagePath,
  examTitle: importPackage.exam?.title,
  sections: importPackage.sections?.length || 0,
  instructionGroups: importPackage.instructionGroups?.length || 0,
  contextBlocks: importPackage.contextBlocks?.length || 0,
  items: importPackage.items?.length || 0,
  interactions: importPackage.interactions?.length || 0,
  markingRules: importPackage.markingRules?.length || 0,
  modelAnswerVersions: importPackage.modelAnswerVersions?.length || 0,
  totalMarks: itemMarks,
  manualReviewInteractions: (importPackage.interactions || []).filter((interaction) => interaction.manualReviewDefault).length,
  mediaRefs: (importPackage.items || []).reduce((sum, item) => sum + (item.mediaRefs?.length || 0), 0)
    + (importPackage.contextBlocks || []).reduce((sum, block) => sum + (block.mediaRefs?.length || 0), 0),
  warnings,
  errors,
};

console.log(JSON.stringify(summary, null, 2));

if (errors.length > 0) {
  process.exit(1);
}

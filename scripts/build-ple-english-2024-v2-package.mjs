#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const sourcePath = 'docs/imports/ple-english-2024.insert-ready.json';
const outputPath = 'docs/data/ple-english-2024-uganda-v2-import.json';

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const normalizedMatchConfig = {
  caseSensitive: false,
  trimWhitespace: true,
  ignorePunctuation: true,
  normalizeSpaces: true,
};

const normalizationProfile = {
  caseSensitive: false,
  trimWhitespace: true,
  ignorePunctuation: true,
  normalizeSpaces: true,
  normalizeNumeric: true,
  allowUnitOmission: false,
};

const instructionGroups = [
  {
    ref: 'ig_q1_5',
    sectionRef: 'sec_a',
    orderIndex: 0,
    title: 'Sub-Section I',
    questionRangeLabel: 'Questions 1-5',
    instructionsMarkdown: 'In each of the questions 1 to 5, fill in the blank space with a suitable word.',
    displayMode: 'boxed',
  },
  {
    ref: 'ig_q6_15',
    sectionRef: 'sec_a',
    orderIndex: 1,
    title: 'Sub-Section I',
    questionRangeLabel: 'Questions 6-15',
    instructionsMarkdown: 'In each of the questions 6 to 15, use the correct form of the word given in brackets.',
    displayMode: 'boxed',
  },
  {
    ref: 'ig_q16_17',
    sectionRef: 'sec_a',
    orderIndex: 2,
    title: 'Sub-Section I',
    questionRangeLabel: 'Questions 16-17',
    instructionsMarkdown: 'In each of the questions 16 to 17, write the given short forms in full.',
    displayMode: 'boxed',
  },
  {
    ref: 'ig_q18_19',
    sectionRef: 'sec_a',
    orderIndex: 3,
    title: 'Sub-Section I',
    questionRangeLabel: 'Questions 18-19',
    instructionsMarkdown: 'In each of the questions 18 to 19, arrange the following words in alphabetical order.',
    displayMode: 'boxed',
  },
  {
    ref: 'ig_q20_21',
    sectionRef: 'sec_a',
    orderIndex: 4,
    title: 'Sub-Section I',
    questionRangeLabel: 'Questions 20-21',
    instructionsMarkdown: 'In each of the questions 20 to 21, rewrite the sentence giving the opposite of the underlined word.',
    displayMode: 'boxed',
  },
  {
    ref: 'ig_q22_23',
    sectionRef: 'sec_a',
    orderIndex: 5,
    title: 'Sub-Section I',
    questionRangeLabel: 'Questions 22-23',
    instructionsMarkdown: 'In each of the questions 22 to 23, rearrange the words to form a correct sentence.',
    displayMode: 'boxed',
  },
  {
    ref: 'ig_q24_25',
    sectionRef: 'sec_a',
    orderIndex: 6,
    title: 'Sub-Section I',
    questionRangeLabel: 'Questions 24-25',
    instructionsMarkdown: 'In each of the questions 24 to 25, give the plural of the given word.',
    displayMode: 'boxed',
  },
  {
    ref: 'ig_q26_27',
    sectionRef: 'sec_a',
    orderIndex: 7,
    title: 'Sub-Section I',
    questionRangeLabel: 'Questions 26-27',
    instructionsMarkdown: 'In each of the questions 26 to 27, rewrite the sentence giving one word for the underlined group of words.',
    displayMode: 'boxed',
  },
  {
    ref: 'ig_q28_30',
    sectionRef: 'sec_a',
    orderIndex: 8,
    title: 'Sub-Section I',
    questionRangeLabel: 'Questions 28-30',
    instructionsMarkdown: 'In each of the questions 28 to 30, use the word in a sentence to show that you know the difference in its meaning.',
    displayMode: 'boxed',
  },
  {
    ref: 'ig_q31_50',
    sectionRef: 'sec_a',
    orderIndex: 9,
    title: 'Sub-Section II',
    questionRangeLabel: 'Questions 31-50',
    instructionsMarkdown: 'Rewrite each sentence as instructed.',
    displayMode: 'boxed',
  },
  {
    ref: 'ig_q51',
    sectionRef: 'sec_b',
    orderIndex: 10,
    title: 'Passage Comprehension',
    questionRangeLabel: 'Question 51',
    instructionsMarkdown: 'Read the passage below and then answer, in full sentences, the questions that follow.',
    displayMode: 'boxed',
  },
  {
    ref: 'ig_q52',
    sectionRef: 'sec_b',
    orderIndex: 11,
    title: 'Poem Comprehension',
    questionRangeLabel: 'Question 52',
    instructionsMarkdown: 'Read the poem below and then answer, in full sentences, the questions that follow.',
    displayMode: 'boxed',
  },
  {
    ref: 'ig_q53',
    sectionRef: 'sec_b',
    orderIndex: 12,
    title: 'Table Comprehension',
    questionRangeLabel: 'Question 53',
    instructionsMarkdown: 'Study the record carefully and then answer, in full sentences, the questions that follow.',
    displayMode: 'boxed',
  },
  {
    ref: 'ig_q54',
    sectionRef: 'sec_b',
    orderIndex: 13,
    title: 'Picture Story',
    questionRangeLabel: 'Question 54',
    instructionsMarkdown: 'Study each picture carefully and then answer the questions that follow. Use the guide words where helpful.',
    displayMode: 'boxed',
  },
  {
    ref: 'ig_q55',
    sectionRef: 'sec_b',
    orderIndex: 14,
    title: 'Composition',
    questionRangeLabel: 'Question 55',
    instructionsMarkdown: 'Write a letter as instructed.',
    displayMode: 'boxed',
  },
];

function groupRefForQuestion(questionNumber) {
  if (questionNumber <= 5) return 'ig_q1_5';
  if (questionNumber <= 15) return 'ig_q6_15';
  if (questionNumber <= 17) return 'ig_q16_17';
  if (questionNumber <= 19) return 'ig_q18_19';
  if (questionNumber <= 21) return 'ig_q20_21';
  if (questionNumber <= 23) return 'ig_q22_23';
  if (questionNumber <= 25) return 'ig_q24_25';
  if (questionNumber <= 27) return 'ig_q26_27';
  if (questionNumber <= 30) return 'ig_q28_30';
  if (questionNumber <= 50) return 'ig_q31_50';
  return `ig_q${questionNumber}`;
}

function itemTypeForQuestion(questionNumber) {
  if (questionNumber <= 17) return 'singleBlank';
  if (questionNumber <= 19) return 'ordering';
  if (questionNumber <= 28) return 'rewrite';
  if (questionNumber <= 30) return 'shortText';
  if (questionNumber <= 50) return 'rewrite';
  if (questionNumber === 51) return 'passageComprehension';
  if (questionNumber === 52) return 'poemComprehension';
  if (questionNumber === 53) return 'tableCompletion';
  if (questionNumber === 54) return 'pictureStory';
  return 'composition';
}

function layoutModeForQuestion(question) {
  if (question.questionNumber === 55) return 'composition';
  if (question.questionNumber === 53) return 'tableDriven';
  if (question.questionNumber >= 51) return 'contextDriven';
  return question.parts.length > 1 ? 'multiPart' : 'single';
}

function responseModeForQuestion(questionNumber) {
  if (questionNumber === 55) return 'textarea';
  if (questionNumber >= 29) return 'textLong';
  return 'textShort';
}

function isAutoMarked(questionNumber) {
  return questionNumber <= 28;
}

function safeAlternatives(part) {
  return (part.acceptable_answers || [])
    .filter((answer) => {
      const lowered = answer.toLowerCase();
      return !lowered.includes('wrong')
        && !lowered.includes('incorrect')
        && !lowered.includes('not best')
        && !lowered.includes('less suitable')
        && !lowered.includes('less precise');
    });
}

function markingRuleForPart(question, part, interactionRef) {
  if (!isAutoMarked(question.questionNumber)) {
    return {
      ref: `mr_${interactionRef}`,
      markingMode: question.questionNumber === 55 ? 'rubricBasedManualReview' : 'manualReviewRequired',
      manualReviewRequired: true,
      notes: question.questionNumber === 55
        ? 'Manual review required for composition content, format, grammar, organization, and relevance.'
        : 'Manual review required because English phrasing may vary and safe automation would be too strict.',
    };
  }

  const alternatives = safeAlternatives(part);
  const rule = {
    ref: `mr_${interactionRef}`,
    markingMode: alternatives.length > 0 ? 'alternativeAnswers' : 'exactMatch',
    manualReviewRequired: false,
    exactAnswer: part.answer,
    normalizedMatchConfig,
    normalizationProfile,
    notes: alternatives.length > 0
      ? 'Auto-check exact answer plus safe accepted aliases from the recovered answer source.'
      : 'Auto-check normalized exact answer from the recovered answer source.',
  };

  if (alternatives.length > 0) {
    rule.acceptedAnswers = [part.answer, ...alternatives];
    rule.alternativeAnswers = alternatives;
  }

  return rule;
}

function modelAnswerForPart(question, part, itemRef, interactionRef) {
  const answer = part.answer || 'Manual review required.';
  const alternatives = safeAlternatives(part);
  const teacherNotes = [];

  if (question.questionNumber === 51) {
    teacherNotes.push('Review against the passage. Prior audit flagged Q51(e) and Q51(f); this package keeps them manual-review only.');
  }
  if (question.questionNumber === 53 && part.partLabel === 'g') {
    teacherNotes.push('Ensure all three Thursday pupils are present: Sidia Sania, Akiasiina Noet, and Bwambale Tito.');
  }
  if (question.questionNumber === 55) {
    teacherNotes.push('Award marks manually for correct informal letter format, thanks to uncle, details of the game park visited, lessons learnt, language control, and relevance to the prompt.');
  }

  return {
    ref: `mav_${interactionRef}`,
    itemRef,
    interactionRef,
    versionNumber: 1,
    approvedAnswer: answer,
    acceptableAlternatives: alternatives,
    explanation: part.explanation || '',
    teacherNotes: teacherNotes.join(' '),
    status: 'approved',
    updatedBy: 'system-import',
    approvedBy: 'content-audit',
  };
}

function parseMarkdownTable(markdown) {
  const lines = markdown.split('\n').map((line) => line.trim()).filter(Boolean);
  const tableLines = lines.filter((line) => line.startsWith('|') && line.endsWith('|'));
  const rows = tableLines.map((line) => line.slice(1, -1).split('|').map((cell) => cell.trim()));
  const headers = (rows[0] || []).map((label, index) => ({
    key: `col_${index + 1}`,
    label,
  }));
  const body = rows.slice(2).map((row) => Object.fromEntries(
    headers.map((header, index) => [header.key, row[index] || '']),
  ));
  return { headers, rows: body };
}

function contextBlocksForSource() {
  const q51 = source.questions.find((question) => question.questionNumber === 51);
  const q52 = source.questions.find((question) => question.questionNumber === 52);
  const q53 = source.questions.find((question) => question.questionNumber === 53);
  const q54 = source.questions.find((question) => question.questionNumber === 54);
  const q55 = source.questions.find((question) => question.questionNumber === 55);
  const q53Table = parseMarkdownTable(q53.sharedContext.content_markdown);

  return [
    {
      ref: 'cb_q51_passage',
      sectionRef: 'sec_b',
      instructionGroupRef: 'ig_q51',
      type: 'passage',
      title: 'Passage',
      contentText: q51.sharedContext.content,
      layoutHint: 'shared-passage',
      sourceReference: 'PLE English 2024 Uganda, Question 51',
    },
    {
      ref: 'cb_q52_poem',
      sectionRef: 'sec_b',
      instructionGroupRef: 'ig_q52',
      type: 'poem',
      title: 'Poem',
      contentText: q52.sharedContext.content,
      layoutHint: 'shared-poem',
      sourceReference: 'PLE English 2024 Uganda, Question 52',
    },
    {
      ref: 'cb_q53_intro',
      sectionRef: 'sec_b',
      instructionGroupRef: 'ig_q53',
      type: 'plainText',
      title: 'Record Context',
      contentText: `${q53.sharedContext.intro}\n\n${q53.sharedContext.heading}`,
      layoutHint: 'shared-table-intro',
      sourceReference: 'PLE English 2024 Uganda, Question 53',
    },
    {
      ref: 'cb_q53_table',
      sectionRef: 'sec_b',
      instructionGroupRef: 'ig_q53',
      type: 'table',
      title: 'Week Five, Term Two (2024)',
      tableData: {
        caption: q53.sharedContext.heading,
        headers: q53Table.headers,
        rows: q53Table.rows,
      },
      layoutHint: 'shared-table',
      sourceReference: 'PLE English 2024 Uganda, Question 53',
    },
    {
      ref: 'cb_q54_guide',
      sectionRef: 'sec_b',
      instructionGroupRef: 'ig_q54',
      type: 'plainText',
      title: 'Guide Words',
      contentText: `${q54.sharedContext.intro}\n\nGuide words: ${q54.sharedContext.guide_words.join(', ')}`,
      layoutHint: 'picture-story-guide',
      sourceReference: 'PLE English 2024 Uganda, Question 54',
    },
    {
      ref: 'cb_q54_story_image',
      sectionRef: 'sec_b',
      instructionGroupRef: 'ig_q54',
      type: 'image',
      title: 'Pictures A-F',
      mediaRefs: [
        {
          mediaId: 'ple-english-2024-q54-story',
          url: '/exam-assets/ple-english-2024/q54-story.png',
          altText: 'PLE English 2024 Question 54 picture story panels A to F',
          caption: 'Pictures A-F for Question 54',
        },
      ],
      layoutHint: 'picture-story',
      sourceReference: 'PLE English 2024 Uganda, Question 54',
    },
    {
      ref: 'cb_q55_composition_prompt',
      sectionRef: 'sec_b',
      instructionGroupRef: 'ig_q55',
      type: 'compositionPrompt',
      title: 'Composition / Informal Letter',
      contentText: q55.sharedContext.content,
      layoutHint: 'composition',
      sourceReference: 'PLE English 2024 Uganda, Question 55',
    },
  ];
}

function contextRefsForQuestion(questionNumber) {
  if (questionNumber === 51) return ['cb_q51_passage'];
  if (questionNumber === 52) return ['cb_q52_poem'];
  if (questionNumber === 53) return ['cb_q53_intro', 'cb_q53_table'];
  if (questionNumber === 54) return ['cb_q54_guide', 'cb_q54_story_image'];
  if (questionNumber === 55) return ['cb_q55_composition_prompt'];
  return [];
}

const packageData = {
  _meta: {
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/build-ple-english-2024-v2-package.mjs',
    sourcePackage: sourcePath,
    sourceAnswers: 'docs/Ple-English-2024-Answers+Explanations.md',
    recoveryDecision: 'B. Recover content from old files and create a clean V2 package.',
    notes: [
      'Legacy insert-ready JSON is the best content source and was salvaged.',
      'Shared Section B passage, poem, table, picture story, and composition prompt are represented as context blocks.',
      'Comprehension, picture story, sentence-writing, rewrite-heavy, and composition interactions default to manual review.',
    ],
  },
  exam: {
    title: 'PLE English 2024',
    subject: 'English',
    level: 'PLE',
    year: 2024,
    country: 'UGANDA',
    curriculumVersion: 'PLE',
    durationMinutes: source.timeLimit || 135,
    totalMarks: 100,
    questionCount: 55,
    itemCount: 55,
    interactionCount: 91,
    status: 'published',
    version: 1,
    createdBy: 'system-import',
    engineVersion: 'v2',
    overallInstructions: 'This paper has two sections: Section A and Section B. Answer all questions in the spaces provided.',
    sourceFiles: [
      {
        name: 'PLE-English-2024.pdf',
        type: 'pdf',
      },
      {
        name: 'Ple-English-2024-Answers+Explanations.md',
        type: 'doc',
      },
    ],
  },
  sections: [
    {
      ref: 'sec_a',
      orderIndex: 0,
      title: 'Section A',
      marks: 50,
      sharedInstructions: 'Questions 1 to 50 carry one mark each.',
    },
    {
      ref: 'sec_b',
      orderIndex: 1,
      title: 'Section B',
      marks: 50,
      sharedInstructions: 'Answer in full sentences where instructed.',
    },
  ],
  instructionGroups,
  contextBlocks: contextBlocksForSource(),
  items: [],
  interactions: [],
  markingRules: [],
  modelAnswerVersions: [],
};

for (const question of source.questions) {
  const itemRef = `item_q${question.questionNumber}`;
  const isMultiPart = question.parts.length > 1;
  const contextBlockRefs = contextRefsForQuestion(question.questionNumber);
  const stemMarkdown = question.questionNumber === 55
    ? 'Write your letter in the answer space provided.'
    : question.questionText;

  const item = {
    ref: itemRef,
    sectionRef: question.section === 'Section A' ? 'sec_a' : 'sec_b',
    instructionGroupRef: groupRefForQuestion(question.questionNumber),
    orderIndex: question.questionNumber - 1,
    itemType: itemTypeForQuestion(question.questionNumber),
    stemMarkdown,
    marksTotal: question.marks,
    layoutMode: isMultiPart ? 'multiPart' : layoutModeForQuestion(question),
    status: 'draft',
    sourceReference: `PLE English 2024 Uganda, Question ${question.questionNumber}`,
  };

  if (contextBlockRefs.length > 0) {
    item.contextBlockRefs = contextBlockRefs;
  }

  packageData.items.push(item);

  question.parts.forEach((part, partIndex) => {
    const label = part.partLabel ? `(${part.partLabel})` : undefined;
    const interactionRef = isMultiPart
      ? `int_q${question.questionNumber}_${part.partLabel.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`
      : `int_q${question.questionNumber}`;
    const manualReview = !isAutoMarked(question.questionNumber);

    packageData.interactions.push({
      ref: interactionRef,
      itemRef,
      orderIndex: partIndex,
      ...(label ? { label } : {}),
      promptMarkdown: isMultiPart ? part.prompt : '',
      responseMode: responseModeForQuestion(question.questionNumber),
      marks: part.marks,
      required: true,
      manualReviewDefault: manualReview,
      markingRuleRef: `mr_${interactionRef}`,
    });

    packageData.markingRules.push(markingRuleForPart(question, part, interactionRef));
    packageData.modelAnswerVersions.push(modelAnswerForPart(question, part, itemRef, interactionRef));
  });
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(packageData, null, 2)}\n`);

console.log(JSON.stringify({
  outputPath,
  items: packageData.items.length,
  interactions: packageData.interactions.length,
  markingRules: packageData.markingRules.length,
  modelAnswerVersions: packageData.modelAnswerVersions.length,
  contextBlocks: packageData.contextBlocks.length,
  manualReviewInteractions: packageData.interactions.filter((interaction) => interaction.manualReviewDefault).length,
  autoMarkedInteractions: packageData.interactions.filter((interaction) => !interaction.manualReviewDefault).length,
  totalMarks: packageData.items.reduce((sum, item) => sum + item.marksTotal, 0),
}, null, 2));

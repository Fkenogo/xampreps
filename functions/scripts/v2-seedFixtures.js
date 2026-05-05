/**
 * V2 Test Fixture Seeder
 * 
 * Seeds the 5 documented V2 test fixtures into Firestore.
 * Run with: node scripts/v2-seedFixtures.js
 * 
 * Fixtures:
 * 1. Simple fill-in (singleBlank)
 * 2. Rewrite (transformation)
 * 3. Passage comprehension
 * 4. Table-based block
 * 5. Composition/manual-review block
 * 
 * NO real exam content is used.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

const FIXTURE_EXAM_ID = 'v2-test-exam-001';

const fixtures = {
  exam: {
    examId: FIXTURE_EXAM_ID,
    engineVersion: 'v2',
    title: 'V2 Test Exam - Fixture Set',
    subject: 'English',
    level: 'PLE',
    year: 2024,
    country: 'UG',
    curriculumVersion: 'v2-test',
    durationMinutes: 30,
    timeLimit: 30,
    totalMarks: 10,
    questionCount: 6,
    question_count: 6,
    status: 'published',
    isFree: true,
    is_free: true,
    overallInstructions: 'This is a test exam with V2 fixtures only.',
    version: 1,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    publishedAt: admin.firestore.Timestamp.now(),
    createdBy: 'system',
    updatedBy: 'system',
  },

  sections: [
    {
      sectionId: 'v2-test-section-a',
      examId: FIXTURE_EXAM_ID,
      orderIndex: 0,
      title: 'Section A',
      marks: 10,
      sharedInstructions: 'Answer all questions in this section.',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
  ],

  instructionGroups: [
    {
      instructionGroupId: 'v2-test-ig-001',
      examId: FIXTURE_EXAM_ID,
      sectionId: 'v2-test-section-a',
      orderIndex: 0,
      title: 'Fill in the blanks',
      instructionsMarkdown: 'In questions 1-2, fill in the blank with the correct word.',
      questionRangeLabel: 'Questions 1-2',
      displayMode: 'boxed',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      instructionGroupId: 'v2-test-ig-002',
      examId: FIXTURE_EXAM_ID,
      sectionId: 'v2-test-section-a',
      orderIndex: 1,
      title: 'Rewrite sentences',
      instructionsMarkdown: 'In question 3, rewrite the sentence as instructed.',
      questionRangeLabel: 'Question 3',
      displayMode: 'boxed',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      instructionGroupId: 'v2-test-ig-003',
      examId: FIXTURE_EXAM_ID,
      sectionId: 'v2-test-section-a',
      orderIndex: 2,
      title: 'Passage comprehension',
      instructionsMarkdown: 'Read the passage below and answer questions 4-5.',
      questionRangeLabel: 'Questions 4-5',
      displayMode: 'boxed',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      instructionGroupId: 'v2-test-ig-004',
      examId: FIXTURE_EXAM_ID,
      sectionId: 'v2-test-section-a',
      orderIndex: 3,
      title: 'Table completion',
      instructionsMarkdown: 'Complete the table below with the correct information.',
      questionRangeLabel: 'Question 6',
      displayMode: 'boxed',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      instructionGroupId: 'v2-test-ig-005',
      examId: FIXTURE_EXAM_ID,
      sectionId: 'v2-test-section-a',
      orderIndex: 4,
      title: 'Composition',
      instructionsMarkdown: 'Write a short composition on the given topic.',
      questionRangeLabel: 'Question 7',
      displayMode: 'boxed',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
  ],

  contextBlocks: [
    {
      contextBlockId: 'v2-test-cb-001',
      examId: FIXTURE_EXAM_ID,
      sectionId: 'v2-test-section-a',
      instructionGroupId: 'v2-test-ig-003',
      type: 'passage',
      title: 'The Market Day',
      contentText: 'Every Saturday, the village market comes alive with activity. Farmers bring fresh vegetables from their gardens. Traders set up colorful stalls with clothes and household items. Children run around playing while their parents shop. The air is filled with the sounds of bargaining and laughter.',
      contentMarkdown: 'Every Saturday, the village market comes alive with activity. Farmers bring fresh vegetables from their gardens. Traders set up colorful stalls with clothes and household items. Children run around playing while their parents shop. The air is filled with the sounds of bargaining and laughter.',
      layoutHint: 'full-width',
      sourceReference: 'V2 Test Fixture',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      contextBlockId: 'v2-test-cb-002',
      examId: FIXTURE_EXAM_ID,
      sectionId: 'v2-test-section-a',
      instructionGroupId: 'v2-test-ig-004',
      type: 'table',
      title: 'School Supplies',
      tableData: {
        headers: [
          { key: 'item', label: 'Item' },
          { key: 'price', label: 'Price' },
          { key: 'quantity', label: 'Quantity' },
        ],
        rows: [
          { item: 'Pen', price: '500 UGX', quantity: '___' },
          { item: 'Notebook', price: '___', quantity: '3' },
          { item: 'Ruler', price: '1000 UGX', quantity: '1' },
        ],
      },
      layoutHint: 'centered',
      sourceReference: 'V2 Test Fixture',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
  ],

  items: [
    // Fixture 1: Simple fill-in
    {
      itemId: 'v2-test-item-001',
      examId: FIXTURE_EXAM_ID,
      sectionId: 'v2-test-section-a',
      instructionGroupId: 'v2-test-ig-001',
      orderIndex: 0,
      itemType: 'singleBlank',
      stemText: 'The sun rises in the ______.',
      stemMarkdown: 'The sun rises in the ______.',
      marksTotal: 1,
      layoutMode: 'single',
      status: 'published',
      sourceReference: 'V2 Test Fixture',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    // Fixture 1b: Second fill-in
    {
      itemId: 'v2-test-item-002',
      examId: FIXTURE_EXAM_ID,
      sectionId: 'v2-test-section-a',
      instructionGroupId: 'v2-test-ig-001',
      orderIndex: 1,
      itemType: 'singleBlank',
      stemText: 'Water boils at ______ degrees Celsius.',
      stemMarkdown: 'Water boils at ______ degrees Celsius.',
      marksTotal: 1,
      layoutMode: 'single',
      status: 'published',
      sourceReference: 'V2 Test Fixture',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    // Fixture 2: Rewrite
    {
      itemId: 'v2-test-item-003',
      examId: FIXTURE_EXAM_ID,
      sectionId: 'v2-test-section-a',
      instructionGroupId: 'v2-test-ig-002',
      orderIndex: 0,
      itemType: 'rewrite',
      stemText: 'Change to passive voice: "The boy kicked the ball."',
      stemMarkdown: 'Change to passive voice: "The boy kicked the ball."',
      marksTotal: 2,
      layoutMode: 'single',
      status: 'published',
      sourceReference: 'V2 Test Fixture',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    // Fixture 3: Passage comprehension
    {
      itemId: 'v2-test-item-004',
      examId: FIXTURE_EXAM_ID,
      sectionId: 'v2-test-section-a',
      instructionGroupId: 'v2-test-ig-003',
      orderIndex: 0,
      itemType: 'passageComprehension',
      stemText: 'Answer the following questions about the passage.',
      stemMarkdown: 'Answer the following questions about the passage.',
      contextBlockIds: ['v2-test-cb-001'],
      marksTotal: 2,
      layoutMode: 'multiPart',
      status: 'published',
      sourceReference: 'V2 Test Fixture',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    // Fixture 4: Table completion
    {
      itemId: 'v2-test-item-005',
      examId: FIXTURE_EXAM_ID,
      sectionId: 'v2-test-section-a',
      instructionGroupId: 'v2-test-ig-004',
      orderIndex: 0,
      itemType: 'tableCompletion',
      stemText: 'Complete the missing values in the table above.',
      stemMarkdown: 'Complete the missing values in the table above.',
      contextBlockIds: ['v2-test-cb-002'],
      marksTotal: 2,
      layoutMode: 'tableDriven',
      status: 'published',
      sourceReference: 'V2 Test Fixture',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    // Fixture 5: Composition
    {
      itemId: 'v2-test-item-006',
      examId: FIXTURE_EXAM_ID,
      sectionId: 'v2-test-section-a',
      instructionGroupId: 'v2-test-ig-005',
      orderIndex: 0,
      itemType: 'composition',
      stemText: 'Write a letter to your friend describing your last holiday.',
      stemMarkdown: 'Write a letter to your friend describing your last holiday.',
      marksTotal: 2,
      layoutMode: 'composition',
      status: 'published',
      sourceReference: 'V2 Test Fixture',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
  ],

  interactions: [
    // Item 1 interaction
    {
      interactionId: 'v2-test-int-001',
      itemId: 'v2-test-item-001',
      examId: FIXTURE_EXAM_ID,
      orderIndex: 0,
      label: '(a)',
      promptText: 'Fill in the blank:',
      promptMarkdown: 'Fill in the blank:',
      responseMode: 'textShort',
      marks: 1,
      required: true,
      manualReviewDefault: false,
      markingRuleId: 'v2-test-rule-001',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    // Item 2 interaction
    {
      interactionId: 'v2-test-int-002',
      itemId: 'v2-test-item-002',
      examId: FIXTURE_EXAM_ID,
      orderIndex: 0,
      label: '(b)',
      promptText: 'Fill in the blank:',
      promptMarkdown: 'Fill in the blank:',
      responseMode: 'textShort',
      marks: 1,
      required: true,
      manualReviewDefault: false,
      markingRuleId: 'v2-test-rule-002',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    // Item 3 interaction
    {
      interactionId: 'v2-test-int-003',
      itemId: 'v2-test-item-003',
      examId: FIXTURE_EXAM_ID,
      orderIndex: 0,
      promptText: 'Write your answer:',
      promptMarkdown: 'Write your answer:',
      responseMode: 'textarea',
      marks: 2,
      required: true,
      manualReviewDefault: false,
      markingRuleId: 'v2-test-rule-003',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    // Item 4 interactions (comprehension - 2 parts)
    {
      interactionId: 'v2-test-int-004a',
      itemId: 'v2-test-item-004',
      examId: FIXTURE_EXAM_ID,
      orderIndex: 0,
      label: '(a)',
      promptText: 'When does the market take place?',
      promptMarkdown: 'When does the market take place?',
      responseMode: 'textShort',
      marks: 1,
      required: true,
      manualReviewDefault: false,
      markingRuleId: 'v2-test-rule-004a',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      interactionId: 'v2-test-int-004b',
      itemId: 'v2-test-item-004',
      examId: FIXTURE_EXAM_ID,
      orderIndex: 1,
      label: '(b)',
      promptText: 'Who brings vegetables to the market?',
      promptMarkdown: 'Who brings vegetables to the market?',
      responseMode: 'textShort',
      marks: 1,
      required: true,
      manualReviewDefault: false,
      markingRuleId: 'v2-test-rule-004b',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    // Item 5 interactions (table - 2 cells)
    {
      interactionId: 'v2-test-int-005a',
      itemId: 'v2-test-item-005',
      examId: FIXTURE_EXAM_ID,
      orderIndex: 0,
      label: 'Pen quantity',
      promptText: 'Enter the quantity of pens:',
      promptMarkdown: 'Enter the quantity of pens:',
      responseMode: 'textShort',
      marks: 1,
      required: true,
      manualReviewDefault: false,
      markingRuleId: 'v2-test-rule-005a',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      interactionId: 'v2-test-int-005b',
      itemId: 'v2-test-item-005',
      examId: FIXTURE_EXAM_ID,
      orderIndex: 1,
      label: 'Notebook price',
      promptText: 'Enter the price of a notebook:',
      promptMarkdown: 'Enter the price of a notebook:',
      responseMode: 'textShort',
      marks: 1,
      required: true,
      manualReviewDefault: false,
      markingRuleId: 'v2-test-rule-005b',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    // Item 6 interaction (composition - manual review)
    {
      interactionId: 'v2-test-int-006',
      itemId: 'v2-test-item-006',
      examId: FIXTURE_EXAM_ID,
      orderIndex: 0,
      promptText: 'Write your composition here:',
      promptMarkdown: 'Write your composition here:',
      responseMode: 'textarea',
      marks: 2,
      required: true,
      markingRuleId: 'v2-test-rule-006',
      rubricId: 'v2-test-rubric-001',
      manualReviewDefault: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
  ],

  markingRules: [
    {
      markingRuleId: 'v2-test-rule-001',
      markingMode: 'exactMatch',
      exactAnswer: 'east',
      manualReviewRequired: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      markingRuleId: 'v2-test-rule-002',
      markingMode: 'exactMatch',
      exactAnswer: '100',
      manualReviewRequired: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      markingRuleId: 'v2-test-rule-003',
      markingMode: 'alternativeAnswers',
      exactAnswer: 'The ball was kicked by the boy.',
      alternativeAnswers: [
        'The ball was kicked by the boy.',
        'The ball is kicked by the boy.',
      ],
      manualReviewRequired: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      markingRuleId: 'v2-test-rule-004a',
      markingMode: 'keywordBased',
      keywordRules: [
        { keywords: ['saturday', 'every saturday'], matchMode: 'any', weight: 1 },
      ],
      manualReviewRequired: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      markingRuleId: 'v2-test-rule-004b',
      markingMode: 'keywordBased',
      keywordRules: [
        { keywords: ['farmers'], matchMode: 'any', weight: 1 },
      ],
      manualReviewRequired: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      markingRuleId: 'v2-test-rule-005a',
      markingMode: 'exactMatch',
      exactAnswer: '10',
      manualReviewRequired: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      markingRuleId: 'v2-test-rule-005b',
      markingMode: 'normalizedTextMatch',
      exactAnswer: '1500 UGX',
      acceptedAnswers: ['1500', 'UGX 1500'],
      normalizationProfile: {
        trimWhitespace: true,
        caseSensitive: false,
        ignorePunctuation: true,
        normalizeSpaces: true,
        normalizeNumeric: true,
        allowUnitOmission: true,
        unitTokens: ['UGX'],
      },
      normalizedMatchConfig: {
        trimWhitespace: true,
        caseSensitive: false,
        ignorePunctuation: true,
        normalizeSpaces: true,
      },
      manualReviewRequired: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      markingRuleId: 'v2-test-rule-006',
      markingMode: 'manualReviewRequired',
      manualReviewRequired: true,
      notes: 'Composition requires teacher review using rubric.',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
  ],

  rubrics: [
    {
      rubricId: 'v2-test-rubric-001',
      title: 'Composition Rubric',
      criteria: [
        { name: 'content', description: 'Relevance to topic and development of ideas.', maxPoints: 5 },
        { name: 'grammar', description: 'Sentence structure, grammar, and punctuation.', maxPoints: 3 },
        { name: 'vocabulary', description: 'Word choice and spelling.', maxPoints: 2 },
      ],
      descriptors: [
        { level: 3, label: 'Strong', description: 'Clear, well-developed writing.' },
        { level: 2, label: 'Developing', description: 'Mostly relevant with some errors.' },
        { level: 1, label: 'Limited', description: 'Minimal development or frequent errors.' },
      ],
      maxScore: 10,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
  ],

  modelAnswerVersions: [
    {
      modelAnswerVersionId: 'v2-test-ma-001',
      itemId: 'v2-test-item-001',
      interactionId: 'v2-test-int-001',
      versionNumber: 1,
      approvedAnswer: 'east',
      explanation: 'The sun rises in the east due to Earth\'s rotation.',
      status: 'approved',
      updatedBy: 'system',
      approvedBy: 'system',
      createdAt: admin.firestore.Timestamp.now(),
    },
    {
      modelAnswerVersionId: 'v2-test-ma-002',
      itemId: 'v2-test-item-003',
      interactionId: 'v2-test-int-003',
      versionNumber: 1,
      approvedAnswer: 'The ball was kicked by the boy.',
      explanation: 'To change to passive voice, make the object the subject and use "was/were" + past participle.',
      status: 'approved',
      updatedBy: 'system',
      approvedBy: 'system',
      createdAt: admin.firestore.Timestamp.now(),
    },
  ],
};

async function seedFixtures() {
  console.log('Seeding V2 test fixtures...');
  console.log(`Exam ID: ${FIXTURE_EXAM_ID}`);

  const batch = db.batch();

  // Write exam
  const examRef = db.collection('exams').doc(FIXTURE_EXAM_ID);
  batch.set(examRef, fixtures.exam);
  console.log('✓ Exam document prepared');

  // Write sections
  fixtures.sections.forEach(section => {
    const ref = db.collection('sections').doc(section.sectionId);
    batch.set(ref, section);
  });
  console.log(`✓ ${fixtures.sections.length} section(s) prepared`);

  // Write instruction groups
  fixtures.instructionGroups.forEach(ig => {
    const ref = db.collection('instruction_groups').doc(ig.instructionGroupId);
    batch.set(ref, ig);
  });
  console.log(`✓ ${fixtures.instructionGroups.length} instruction groups prepared`);

  // Write context blocks
  fixtures.contextBlocks.forEach(cb => {
    const ref = db.collection('context_blocks').doc(cb.contextBlockId);
    batch.set(ref, cb);
  });
  console.log(`✓ ${fixtures.contextBlocks.length} context blocks prepared`);

  // Write items
  fixtures.items.forEach(item => {
    const ref = db.collection('items').doc(item.itemId);
    batch.set(ref, item);
  });
  console.log(`✓ ${fixtures.items.length} items prepared`);

  // Write interactions
  fixtures.interactions.forEach(int => {
    const ref = db.collection('interactions').doc(int.interactionId);
    batch.set(ref, int);
  });
  console.log(`✓ ${fixtures.interactions.length} interactions prepared`);

  // Write marking rules
  fixtures.markingRules.forEach(rule => {
    const ref = db.collection('marking_rules').doc(rule.markingRuleId);
    batch.set(ref, rule);
  });
  console.log(`✓ ${fixtures.markingRules.length} marking rules prepared`);

  // Write rubrics
  fixtures.rubrics.forEach(rubric => {
    const ref = db.collection('rubrics').doc(rubric.rubricId);
    batch.set(ref, rubric);
  });
  console.log(`✓ ${fixtures.rubrics.length} rubrics prepared`);

  // Write model answer versions
  fixtures.modelAnswerVersions.forEach(ma => {
    const ref = db.collection('model_answer_versions').doc(ma.modelAnswerVersionId);
    batch.set(ref, ma);
  });
  console.log(`✓ ${fixtures.modelAnswerVersions.length} model answer versions prepared`);

  await batch.commit();
  console.log('\n✅ All fixtures seeded successfully!');
  console.log(`\nTest URL: /v2-test/${FIXTURE_EXAM_ID}`);
}

// Run if called directly
if (require.main === module) {
  seedFixtures()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error seeding fixtures:', err);
      process.exit(1);
    });
}

module.exports = { seedFixtures, FIXTURE_EXAM_ID };

#!/usr/bin/env node

/**
 * Update live PLE English 2024 V2 answers from docs/Ple-English-2024-Answers.md.
 *
 * Dry run:
 *   node scripts/update-ple-english-2024-answers-from-md.cjs --examId weBoSWQcIi7ZjyDPVx3I --answers docs/Ple-English-2024-Answers.md
 *
 * Apply:
 *   node scripts/update-ple-english-2024-answers-from-md.cjs --examId weBoSWQcIi7ZjyDPVx3I --answers docs/Ple-English-2024-Answers.md --apply
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const DEFAULT_EXAM_ID = 'weBoSWQcIi7ZjyDPVx3I';
const NORMALIZED_MATCH_CONFIG = {
  caseSensitive: false,
  trimWhitespace: true,
  ignorePunctuation: true,
  normalizeSpaces: true,
};
const NORMALIZATION_PROFILE = {
  caseSensitive: false,
  trimWhitespace: true,
  ignorePunctuation: true,
  normalizeSpaces: true,
  normalizeNumeric: true,
  allowUnitOmission: false,
};
const OPEN_ENDED_QUESTIONS = new Set([29, 30, ...range(51, 55)]);
const MANUAL_REWRITE_QUESTIONS = new Set();
const REPLACE_AUTO_ANSWER_KEYS = new Set(['9', '13', '21', '48']);
const FULL_SENTENCE_CONTAINING_ANSWER_QUESTIONS = new Set([
  ...range(1, 17),
  20, 21, 24, 25, 26, 27, 28,
]);

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function parseArgs(argv) {
  const args = {
    examId: DEFAULT_EXAM_ID,
    answersPath: null,
    apply: false,
    projectId: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--examId') {
      args.examId = argv[index + 1] || null;
      index += 1;
    } else if (arg === '--answers') {
      args.answersPath = argv[index + 1] || null;
      index += 1;
    } else if (arg === '--apply') {
      args.apply = true;
    } else if (arg === '--project-id') {
      args.projectId = argv[index + 1] || null;
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.examId) throw new Error('--examId is required');
  if (!args.answersPath) throw new Error('--answers is required');
  return args;
}

function printUsage() {
  console.log(`Usage:
  node scripts/update-ple-english-2024-answers-from-md.cjs --examId <examId> --answers <path>
  node scripts/update-ple-english-2024-answers-from-md.cjs --examId <examId> --answers <path> --apply

Options:
  --apply                 Patch Firestore. Omit for dry-run.
  --project-id <project>  Optional project id when using ADC.`);
}

function initializeFirebase(projectId) {
  if (admin.apps.length > 0) return;
  admin.initializeApp(projectId ? { projectId } : undefined);
}

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function unique(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const normalized = compact(value);
    if (!normalized || seen.has(normalized.toLowerCase())) continue;
    seen.add(normalized.toLowerCase());
    result.push(normalized);
  }
  return result;
}

function assertMarkdownLooksRight(markdown) {
  const requiredPhrases = [
    'Anne is the faster of the two girls',
    'The big mangoes Aisha bought were sweet and juicy',
    'Eating too much sugar can cause health problems',
    'In order to save the cyclist',
    'Lolo could buy pancakes, buns and some juice',
    'The poem is about',
    'Muna Primary School',
  ];

  const missing = requiredPhrases.filter((phrase) => !markdown.includes(phrase));
  if (missing.length > 0) {
    throw new Error(`Answers markdown does not look like the expected PLE English 2024 answer file. Missing: ${missing.join(', ')}`);
  }
}

function answer(exactAnswer, alternatives = [], options = {}) {
  const acceptedAnswers = unique([exactAnswer, ...alternatives]);
  const alternativeAnswers = acceptedAnswers.filter((item) => item.toLowerCase() !== compact(exactAnswer).toLowerCase());
  return {
    exactAnswer: compact(exactAnswer),
    acceptedAnswers,
    alternativeAnswers,
    approvedAnswer: compact(options.approvedAnswer || exactAnswer),
    acceptableAlternatives: unique(alternatives),
    explanation: compact(options.explanation || ''),
    manual: options.manual === true,
    markingMode: options.markingMode,
    allowFullSentenceContainingAnswer: options.allowFullSentenceContainingAnswer,
  };
}

function manual(approvedAnswer, alternatives = [], explanation = '') {
  return answer(approvedAnswer, alternatives, {
    manual: true,
    markingMode: 'manualReviewRequired',
    explanation,
  });
}

function buildUpdatesFromMarkdown(markdown) {
  assertMarkdownLooksRight(markdown);

  const updates = new Map();
  const set = (key, value) => updates.set(key, value);

  set('1', answer('soon', [], { explanation: 'Expected word: soon, from the phrase “as soon as”.' }));
  set('2', answer('older', [], { explanation: 'Comparative form used with “than”.' }));
  set('3', answer('for', [], { explanation: 'Use “leaves for Kampala” to show destination.' }));
  set('4', answer('hair', [], { explanation: 'The object of combing is hair.' }));
  set('5', answer('say', ['recite'], { explanation: 'The common expression is “say my prayers”.' }));
  set('6', answer('faster', [], { explanation: 'Comparative form of “fast” for two girls.' }));
  set('7', answer('juicy', [], { explanation: 'Adjective form of “juice”.' }));
  set('8', answer('safely', [], { explanation: 'Adverb form of “safe”.' }));
  set('9', answer('happiness', [], { explanation: 'Noun form of “happy”.' }));
  set('10', answer('rainy', [], { explanation: 'Adjective form of “rain”.' }));
  set('11', answer('learning', [], { explanation: 'Fits “have been learning”.' }));
  set('12', answer('mine', [], { explanation: 'Possessive pronoun form of “my”.' }));
  set('13', answer('revision', [], { explanation: 'Noun form of “revise”.' }));
  set('14', answer('bitten', [], { explanation: 'Past participle of “bite” in passive voice.' }));
  set('15', answer('puppies', [], { explanation: 'Plural form after “one of the”.' }));
  set('16', answer('kilogram', ['kilogramme', 'kilograms', 'kilogrammes', 'kilo', 'kilos'], { explanation: 'Accepted full forms of “kg”.' }));
  set('17', answer('they have', [], { explanation: 'Full form of “they’ve”.' }));
  set('18', answer('hammer, nail, plank, saw', ['hammer nail plank saw'], { explanation: 'Words arranged alphabetically.' }));
  set('19', answer('ear, eye, neck, nose', ['ear eye neck nose'], { explanation: 'Words arranged alphabetically.' }));
  set('20', answer('Mary remembered to turn off the TV last night.', ['Mary remembered to turn off the television last night.'], { explanation: 'Opposite of “forgot” is “remembered”.' }));
  set('21', answer('Some foreign tourists like carrying heavy bags.', [], { explanation: 'Opposite of “light” in this sentence is “heavy”.' }));
  set('22', answer('Never accept gifts from strangers.', [], { explanation: 'Correct sentence order.' }));
  set('23', answer('In which class is your cousin?', ['Which class is your cousin in?'], { explanation: 'Correct question order.' }));
  set('24', answer('oxen', [], { explanation: 'Irregular plural of “ox”.' }));
  set('25', answer('secretaries', [], { explanation: 'Plural of “secretary”.' }));
  set('26', answer('cause', ['Eating too much sugar can cause health problems.', 'Eating too much sugar can cause health problems'], {
    explanation: 'One-word replacement for “lead to” is “cause”.',
  }));
  set('27', answer('twice', ['My mother visits the dentist twice a year.', 'My mother visits the dentist twice a year'], {
    explanation: 'One-word replacement for “two times” is “twice”.',
  }));
  set('28', answer('menu', [
    'When Mr. Byansi entered the restaurant, the waitress gave him a menu.',
    'When Mr Byansi entered the restaurant the waitress gave him a menu',
    'When Mr. Byaruhanga entered the restaurant, the waitress gave him a menu.',
    'When Mr. Byaruhanga entered the restaurant, the waitress gave him a menu',
  ], {
    explanation: 'One-word replacement for “a list of food available” is “menu”.',
  }));

  set('29', manual('Use “air” in a sentence that shows its meaning, for example: I went outside to get some fresh air.', [
    'You should put some air in your flat tyres.',
    'I don’t travel much by air.',
    'The radio station is on air from 6 a.m.',
  ], 'Manual review: accept any grammatical sentence that clearly uses “air” with a correct meaning.'));
  set('30', manual('Use “heir” in a sentence that shows its meaning, for example: He has no heir to leave his fortune to.', [
    'He left most of his property to his eldest son and heir.',
    'On his deathbed he named his second son as his heir.',
  ], 'Manual review: accept any grammatical sentence that clearly uses “heir” to mean inheritor.'));

  set('31', answer('Cocks are not as big as turkeys.', ['Cocks are not as big as turkeys are.'], { explanation: 'Rewrite using “as ... as”.' }));
  set('32', answer('The bride whose wedding took place last weekend sent us a cake.', [], { explanation: 'Combines the sentences using “whose”.' }));
  set('33', answer('The lesson stopped immediately the rain began.', ['Immediately the rain began, the lesson stopped.'], { explanation: 'Rewrite using “Immediately”.' }));
  set('34', answer('We went to the market after Aunt Sandra had made a shopping list.', ['We went to the market after Aunt Sandra made a shopping list.'], { explanation: 'Rewrite using “after”.' }));
  set('35', answer('The children liked swimming more than jogging.', [
    'The children enjoyed swimming more than jogging.',
    'The children liked swimming better than jogging.',
    'The children were more interested in swimming than in jogging.',
  ], { explanation: 'Rewrite using “than”.' }));
  set('36', answer('We are responsible for keeping our classrooms tidy.', [], { explanation: 'Rewrite using “responsible”.' }));
  set('37', answer('While Nicholas was washing the car, his sister was preparing breakfast.', [], { explanation: 'Combines the actions using “While”.' }));
  set('38', answer('Mbowa will travel neither by bus nor by taxi.', [
    'Mbowa will neither travel by bus nor by taxi.',
  ], { explanation: 'Rewrite using “neither ... nor”.' }));
  set('39', answer('“Why did you miss lessons yesterday?” the teacher asked Nambuya.', [
    '"Why did you miss lessons yesterday?" the teacher asked Nambuya.',
  ], { explanation: 'Direct speech form ending as instructed.' }));
  set('40', answer('The tailor cut the cloth using a pair of scissors.', ['The tailor cut the cloth with a pair of scissors.'], { explanation: 'Rewrite beginning “The tailor cut ...”.' }));
  set('41', answer('The letters were not posted by Shakirah.', [], { explanation: 'Passive voice ending “by Shakirah”.' }));
  set('42', answer('I last went to the market two months ago.', [], { explanation: 'Rewrite ending with “ago”.' }));
  set('43', answer('Our players were too tired to walk back to school.', [], { explanation: 'Rewrite using “too ... to”.' }));
  set('44', answer('Although Kapere is a very rich man, he does not have a car.', [
    'Although Kapere is very rich, he does not have a car.',
  ], { explanation: 'Rewrite beginning with “Although”.' }));
  set('45', answer('Mrs. Odeke spent fifteen thousand shillings on a kilo of meat.', [
    'Mrs Odeke spent fifteen thousand shillings on a kilo of meat.',
  ], { explanation: 'Rewrite using “spent”.' }));
  set('46', answer('In order to save the cyclist’s life, she hooted at him.', [
    'In order to save the cyclist\'s life, she hooted at him.',
    'In order to save his life, she hooted at the cyclist.',
    'In order to save his life she hooted at the cyclist',
  ], { explanation: 'Rewrite beginning “In order to ...”.' }));
  set('47', answer('If you don’t tuck in your shirt, you won’t look smart.', [
    'If you do not tuck in your shirt, you will not look smart.',
    'If you don\'t tuck in your shirt, you won\'t look smart.',
    'If you do not tuck in your shirt, you won’t look smart.',
    'If you don’t tuck in your shirt, you will not look smart.',
  ], { explanation: 'Conditional rewrite beginning “If”.' }));
  set('48', answer('Aida received some money from her guardian, didn’t she?', [
    'Aida received some money from her guardian, did she?',
    'Aida received some money from her guardian didn’t she',
    'Aida received some money from her guardian didnt she',
  ], { explanation: 'Tag-question rewrite. The expected tag is “didn’t she?”.' }));
  set('49', answer('Both a radio and a television are useful sources of information.', [
    'Both a television and a radio are useful sources of information.',
  ], { explanation: 'Rewrite beginning “Both”.' }));
  set('50', answer('The boy who won the race is related to us.', [
    'The boy that won the race is related to us.',
  ], { explanation: 'Rewrite ending “to us”.' }));

  set('51.a', manual('The two great friends went to Mushanga Primary School.', [
    'It was at Mushanga Primary School where the two great friends went.',
  ], 'Teacher guidance: accept a full-sentence answer identifying Mushanga Primary School.'));
  set('51.b', manual('There wasn’t lunch for Lolo and Jemba because their parents had not contributed towards their feeding.', [
    'Their parents had not contributed towards their feeding.',
  ], 'Teacher guidance: accept answers that connect no lunch to parents not contributing for feeding.'));
  set('51.c', manual('Lolo could buy pancakes, buns and some juice to have as lunch with the money his parents gave him.', [
    'With the money, Lolo could buy pancakes, buns and some juice to have as lunch.',
  ], 'Teacher guidance: accept paraphrases mentioning pancakes, buns, juice, or lunch bought with the money.'));
  set('51.d', manual('Jemba rode at a very high speed because he wanted to get back to school in time for the afternoon lessons.', [
    'He was excited about having food or lunch.',
  ], 'Teacher guidance: accept either excitement about lunch/food or wanting to return for afternoon lessons.'));
  set('51.e', manual('Jemba rang the bicycle bell to alert other road users that a bicycle was approaching.', [
    'He rang the bell to signal that there was a bicycle passing and avoid collision.',
  ], 'Teacher guidance: accept answers about alerting/warning/signalling other road users.'));
  set('51.f', manual('According to the passage, speeding led to the accident.', [
    'Speeding led to the accident.',
    'Jemba lost his balance as he sped.',
  ], 'Teacher guidance: accept speeding and/or loss of balance as the cause stated in the passage.'));
  set('51.g', manual('Immediately the head teacher arrived at the clinic, she thanked the nurses for treating Lolo and Jemba.', [
    'The head teacher thanked the nurses for treating Lolo and Jemba immediately she arrived at the clinic.',
  ], 'Teacher guidance: first action was thanking the nurses.'));
  set('51.h', manual('The two boys stayed away from school for three weeks.', [
    'The two boys stayed away from school for 3 weeks.',
  ], 'Teacher guidance: accept three weeks / 3 weeks.'));
  set('51.i', manual('The academic performance of the pupils greatly improved because all pupils started having lunch at school.', [
    'The school started providing lunch to all pupils.',
    'All pupils have lunch at school.',
  ], 'Teacher guidance: accept answers linking improved academic performance to pupils having lunch at school.'));
  set('51.j', manual('Lolo and Jemba', [
    'Two Great Friends',
    'Lolo and Jemba Meet an Accident',
    'Lolo and Jemba Learn a Lesson',
  ], 'Teacher guidance: accept any suitable short title that captures the passage.'));

  set('52.a', manual('The poem is about examination.', [], 'Teacher guidance: accept examination/exams as the central subject.'));
  set('52.b', manual('The speaker spends sleepless nights in order to prepare for examination.', [
    'The speaker spends sleepless nights so that he or she can prepare for examination.',
  ], 'Teacher guidance: answer must connect sleepless nights to preparation for examination.'));
  set('52.c', manual('The speaker is briefed before meeting examination.', [], 'Teacher guidance: before meeting examination, the speaker is briefed.'));
  set('52.d', manual('The speaker should defeat examination in order to get a good grade.', [
    'The speaker should defeat examination so that he or she can get a good grade.',
  ], 'Teacher guidance: answer must mention getting a good grade/succeeding.'));
  set('52.e', manual('The speaker refers to invigilators as strange men and women because they are new or unfamiliar to him or her.', [
    'Because it is the speaker’s first time to meet them.',
  ], 'Teacher guidance: accept unfamiliar/new/unknown invigilators.'));
  set('52.f', manual('The duty of the strange men and women is to give out and collect papers.', [
    'The strange men and women give out and collect papers.',
  ], 'Teacher guidance: accept giving out and collecting papers.'));
  set('52.g', manual('The speaker rejoices when results are out and he or she has passed or succeeded in the examination.', [
    'The speaker rejoices after passing the examination.',
  ], 'Teacher guidance: accept results out plus success/passing.'));
  set('52.h', manual('The speaker forgets the sleepless nights spent preparing for examination.', [
    'The speaker forgets the sleepless nights.',
  ], 'Teacher guidance: accept sleepless nights / hard preparation.'));
  set('52.i.i', manual('horrible', ['dire', 'appalling', 'frightful', 'awful'], 'Teacher guidance: accept valid synonyms of terrible.'));
  set('52.i.ii', manual('responsibility', ['obligation', 'task', 'role'], 'Teacher guidance: accept valid synonyms of duty.'));

  set('53.a', manual('The P.7 class monitor at Divine Junior School, Nalusaga, kept the record.', [], 'Teacher guidance: accept P7 class monitor as the record keeper.'));
  set('53.b', manual('The record was taken in Term Two, 2024.', [
    'The record was taken in Term Two of 2024.',
  ], 'Teacher guidance: accept Term Two, 2024.'));
  set('53.c', manual('Three pupils were in charge of cleaning the classroom each day.', [
    'There were three pupils in charge of cleaning the classroom each day.',
  ], 'Teacher guidance: accept three pupils.'));
  set('53.d', manual('Work was considered incomplete on Tuesday because part of the classroom was not cleaned.', [], 'Teacher guidance: reason is that part of the classroom was not cleaned.'));
  set('53.e', manual('Four people supervised the cleaning of the classroom that week.', [
    'There were four people who supervised the cleaning of the classroom that week.',
  ], 'Teacher guidance: use the answer file’s accepted total of four people.'));
  set('53.f', manual('Excellent work was done on Wednesday.', [
    'It was on Wednesday when excellent work was done.',
  ], 'Teacher guidance: accept Wednesday.'));
  set('53.g', manual('Sidia Sania, Akaslima Noet and Bwambale Tito cleaned the classroom at break time.', [], 'Teacher guidance: accept the three Thursday pupils listed in the answer file.'));
  set('53.h', manual('The classroom wasn’t cleaned on Friday because there were zonal ball games.', [
    'The pupils were participating in the zonal ball games.',
  ], 'Teacher guidance: answer must connect Friday to zonal ball games.'));
  set('53.i', manual('Acen Lisa’s role was to supervise the cleaning of the P.7 classroom on Monday.', [
    'Acen Lisa supervised the pupils who cleaned the P.7 classroom on Monday.',
  ], 'Teacher guidance: accept supervision on Monday.'));
  set('53.j', manual('I would encourage my class monitor to keep such a record because it helps in accountability.', [
    'It helps in conflict resolution.',
    'It helps in recognition.',
    'It helps in responsibility development.',
  ], 'Teacher guidance: accept any sensible reason connected to record keeping.'));

  set('54.a', manual('Two girls are walking along the road.', [
    'The girls are returning home.',
    'The girls are leaving school.',
  ], 'Teacher guidance: accept a sentence describing the visible action in Picture A.'));
  set('54.b', manual('A man or driver is talking to the girls.', [
    'A driver is convincing the girls to sit in his car.',
    'A man is asking the girls to give them a lift.',
  ], 'Teacher guidance: accept visible driver/man talking/requesting/convincing.'));
  set('54.c', manual('Some men are abducting one of the girls.', [
    'Some men are kidnapping one of the girls.',
    'Some men are forcing one of the girls to enter the car.',
    'One of the girls is escaping from the kidnappers.',
  ], 'Teacher guidance: accept abduction/kidnapping/forcing/escape if consistent with the picture.'));
  set('54.d', manual('The girl is reporting the case to police officers.', [
    'The girl is talking to the police.',
  ], 'Teacher guidance: accept reporting/talking to police.'));
  set('54.e', manual('Police officers have stopped the car at a roadblock.', [
    'Police officers have stopped the car at a checkpoint.',
  ], 'Teacher guidance: accept roadblock/checkpoint.'));
  set('54.f', manual('The police officers have arrested the men.', [
    'The girls are hugging each other.',
    'The police officers have handcuffed the kidnappers.',
  ], 'Teacher guidance: accept visible outcomes in Picture F.'));
  set('54.g', manual('The fact that the girls are hugging each other shows that they are happy.', [], 'Teacher guidance: evidence is the girls hugging.'));
  set('54.h', manual('The two men are likely to be taken to prison.', [
    'The two men are likely to be imprisoned.',
  ], 'Teacher guidance: accept likely punishment after arrest.'));
  set('54.i', manual('This story teaches me never to accept lifts from strangers.', [
    'This story teaches me to always move in groups.',
  ], 'Teacher guidance: accept a sensible lesson from the story.'));
  set('54.j', manual('The Police Save a Girl from Kidnappers', [
    'Narrow Escape',
    'Kidnappers Learn Their Lesson',
    'The Police Arrest Kidnappers',
    'Failed Abduction',
  ], 'Teacher guidance: accept any suitable short title for the picture story.'));
  set('55', manual('Manual review required.', [], 'Teacher guidance: mark manually for correct friendly-letter format, thanks to uncle, details of the game park, lessons learnt, language control, and relevance to the prompt.'));

  return updates;
}

function getQuestionNumberFromSourceReference(sourceReference) {
  const match = String(sourceReference || '').match(/Question\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function normalizeLabel(label) {
  if (!label) return '';
  return String(label).toLowerCase().replace(/[()]/g, '').replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
}

function interactionKey(item, interaction) {
  const questionNumber = getQuestionNumberFromSourceReference(item.sourceReference);
  if (!questionNumber) return null;
  if (questionNumber <= 50 || questionNumber === 55) return String(questionNumber);
  if (questionNumber === 52) {
    const prompt = `${interaction.promptMarkdown || ''} ${interaction.promptText || ''}`.toLowerCase();
    if (prompt.includes('terrible')) return '52.i.i';
    if (prompt.includes('duty')) return '52.i.ii';
  }
  const label = normalizeLabel(interaction.label);
  if (!label) return null;
  return `${questionNumber}.${label}`;
}

function desiredMarkingMode(key, update, currentRule) {
  const questionNumber = Number(String(key).split('.')[0]);
  if (update.manual || OPEN_ENDED_QUESTIONS.has(questionNumber) || MANUAL_REWRITE_QUESTIONS.has(questionNumber)) {
    return currentRule.markingMode === 'rubricBasedManualReview'
      ? 'rubricBasedManualReview'
      : 'manualReviewRequired';
  }
  return update.acceptedAnswers.length > 1 ? 'alternativeAnswers' : 'exactMatch';
}

function buildRulePatch(key, update, currentRule) {
  const nextMode = desiredMarkingMode(key, update, currentRule);
  const questionNumber = Number(String(key).split('.')[0]);
  const finalAnswers = buildFinalAutoAnswers(key, update, currentRule);
  const patch = {
    markingMode: nextMode,
    manualReviewRequired: nextMode === 'manualReviewRequired' || nextMode === 'rubricBasedManualReview',
    notes: `Updated from docs/Ple-English-2024-Answers.md. ${update.explanation || ''}`.trim(),
    updatedAt: admin.firestore.Timestamp.now(),
  };

  if (patch.manualReviewRequired) {
    return patch;
  }

  patch.exactAnswer = finalAnswers.exactAnswer;
  patch.acceptedAnswers = finalAnswers.acceptedAnswers;
  patch.alternativeAnswers = finalAnswers.alternativeAnswers;
  patch.normalizedMatchConfig = NORMALIZED_MATCH_CONFIG;
  patch.normalizationProfile = NORMALIZATION_PROFILE;
  if (FULL_SENTENCE_CONTAINING_ANSWER_QUESTIONS.has(questionNumber)) {
    patch.allowFullSentenceContainingAnswer = true;
  }
  return patch;
}

function buildFinalAutoAnswers(key, update, currentRule) {
  const currentAnswers = [
    currentRule.exactAnswer,
    ...(Array.isArray(currentRule.acceptedAnswers) ? currentRule.acceptedAnswers : []),
    ...(Array.isArray(currentRule.alternativeAnswers) ? currentRule.alternativeAnswers : []),
  ].filter(Boolean);
  const acceptedAnswers = REPLACE_AUTO_ANSWER_KEYS.has(String(key))
    ? update.acceptedAnswers
    : unique([...update.acceptedAnswers, ...currentAnswers]);
  return {
    exactAnswer: update.exactAnswer,
    acceptedAnswers,
    alternativeAnswers: acceptedAnswers.filter((answer) => answer.toLowerCase() !== update.exactAnswer.toLowerCase()),
  };
}

function buildInteractionPatch(key, update, currentRule) {
  const nextMode = desiredMarkingMode(key, update, currentRule);
  return {
    manualReviewDefault: nextMode === 'manualReviewRequired' || nextMode === 'rubricBasedManualReview',
    updatedAt: admin.firestore.Timestamp.now(),
  };
}

function buildModelAnswerPatch(update) {
  return {
    approvedAnswer: update.approvedAnswer,
    acceptableAlternatives: update.acceptableAlternatives,
    explanation: update.explanation || '',
    teacherNotes: update.manual ? update.explanation || 'Manual review required.' : '',
    status: 'approved',
    updatedAt: admin.firestore.Timestamp.now(),
  };
}

async function fetchLatestModelAnswer(db, interactionId) {
  const snapshot = await db.collection('model_answer_versions')
    .where('interactionId', '==', interactionId)
    .orderBy('versionNumber', 'desc')
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { modelAnswerVersionId: doc.id, ...doc.data(), ref: doc.ref };
}

function summarizeAnswers(rule) {
  return {
    exactAnswer: rule.exactAnswer || null,
    acceptedAnswers: rule.acceptedAnswers || [],
    alternativeAnswers: rule.alternativeAnswers || [],
  };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const resolvedAnswersPath = path.resolve(process.cwd(), args.answersPath);
  const markdown = fs.readFileSync(resolvedAnswersPath, 'utf8');
  const updates = buildUpdatesFromMarkdown(markdown);
  initializeFirebase(args.projectId);
  const db = admin.firestore();

  console.log('PLE English 2024 answer updater');
  console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY RUN - no writes'}`);
  console.log(`Exam: ${args.examId}`);
  console.log(`Answers: ${resolvedAnswersPath}`);

  const [itemsSnapshot, interactionsSnapshot] = await Promise.all([
    db.collection('items').where('examId', '==', args.examId).get(),
    db.collection('interactions').where('examId', '==', args.examId).get(),
  ]);

  const itemsById = new Map(itemsSnapshot.docs.map((doc) => [doc.id, { itemId: doc.id, ...doc.data() }]));
  const interactions = interactionsSnapshot.docs
    .map((doc) => ({ interactionId: doc.id, ...doc.data() }))
    .sort((left, right) => {
      const leftItem = itemsById.get(left.itemId);
      const rightItem = itemsById.get(right.itemId);
      return Number(leftItem?.orderIndex || 0) - Number(rightItem?.orderIndex || 0) ||
        Number(left.orderIndex || 0) - Number(right.orderIndex || 0);
    });

  let updated = 0;
  let skipped = 0;
  const seenKeys = new Set();
  const ambiguous = [];

  for (const interaction of interactions) {
    const item = itemsById.get(interaction.itemId);
    const key = item ? interactionKey(item, interaction) : null;
    if (!item || !key || !updates.has(key)) {
      skipped += 1;
      if (item && getQuestionNumberFromSourceReference(item.sourceReference) !== null) {
        ambiguous.push(`${item.sourceReference || item.itemId} ${interaction.label || ''} (${interaction.interactionId})`);
      }
      continue;
    }

    seenKeys.add(key);
    if (!interaction.markingRuleId) {
      skipped += 1;
      ambiguous.push(`${key}: missing markingRuleId`);
      continue;
    }

    const ruleDoc = await db.collection('marking_rules').doc(interaction.markingRuleId).get();
    if (!ruleDoc.exists) {
      skipped += 1;
      ambiguous.push(`${key}: missing marking rule ${interaction.markingRuleId}`);
      continue;
    }

    const currentRule = { markingRuleId: ruleDoc.id, ...ruleDoc.data() };
    const update = updates.get(key);
    const nextMode = desiredMarkingMode(key, update, currentRule);
    const modelAnswer = await fetchLatestModelAnswer(db, interaction.interactionId);
    const rulePatch = buildRulePatch(key, update, currentRule);
    const interactionPatch = buildInteractionPatch(key, update, currentRule);
    const modelAnswerPatch = buildModelAnswerPatch(update);

    console.log(`${args.apply ? 'UPDATE' : 'WOULD UPDATE'} Q${key}`);
    console.log(`  interactionId=${interaction.interactionId} markingRuleId=${interaction.markingRuleId} modelAnswerVersionId=${modelAnswer?.modelAnswerVersionId || '(missing)'}`);
    console.log(`  markingMode: ${currentRule.markingMode} -> ${nextMode}`);
    console.log(`  current answers: ${JSON.stringify(summarizeAnswers(currentRule))}`);
    console.log(`  new answers: ${JSON.stringify({ exactAnswer: rulePatch.exactAnswer || update.exactAnswer, acceptedAnswers: rulePatch.acceptedAnswers || update.acceptedAnswers, alternativeAnswers: rulePatch.alternativeAnswers || update.alternativeAnswers })}`);

    if (args.apply) {
      await ruleDoc.ref.update(rulePatch);
      await db.collection('interactions').doc(interaction.interactionId).update(interactionPatch);
      if (modelAnswer) {
        await modelAnswer.ref.update(modelAnswerPatch);
      } else {
        ambiguous.push(`${key}: no model_answer_versions document to update`);
      }
    }

    updated += 1;
  }

  for (const key of updates.keys()) {
    if (!seenKeys.has(key)) {
      ambiguous.push(`${key}: no live interaction matched this answer key`);
    }
  }

  console.log(`Summary: ${args.apply ? 'updated' : 'would update'} ${updated} interaction(s), skipped ${skipped}, ambiguous ${ambiguous.length}.`);
  if (ambiguous.length > 0) {
    console.log('Ambiguous/skipped mappings:');
    ambiguous.slice(0, 80).forEach((entry) => console.log(`  - ${entry}`));
    if (ambiguous.length > 80) console.log(`  ... ${ambiguous.length - 80} more`);
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

/**
 * XamPreps Exam Data Seed Script
 * 
 * This script populates Firestore with sample exam data for testing.
 * It creates exams, questions, and question parts for PLE, UCE, and UACE levels.
 * 
 * Usage:
 *   cd functions
 *   node scripts/seedExams.js
 * 
 * Prerequisites:
 *   - Firebase CLI installed and authenticated
 *   - Service account credentials available (via GOOGLE_APPLICATION_CREDENTIALS or firebase-tools auth)
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, collection, doc, setDoc, writeBatch } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK
function initFirebase() {
  // Try to use service account credentials from environment
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount),
      });
    }
  } else {
    // Try to use application default credentials
    console.log('No service account found. Using Application Default Credentials.');
    console.log('Make sure you have run: gcloud auth application-default login');
    if (getApps().length === 0) {
      initializeApp();
    }
  }
  
  return getFirestore();
}

// Sample exam data for Ugandan curriculum (PLE, UCE, UACE)
const sampleExams = [
  // PLE (Primary Leaving Examination)
  {
    id: 'ple-maths-2024',
    title: 'PLE Mathematics 2024',
    subject: 'Mathematics',
    level: 'PLE',
    year: 2024,
    type: 'Past Paper',
    difficulty: 'Medium',
    timeLimit: 120,
    isFree: true,
    description: 'Uganda National Examinations Board (UNEB) PLE Mathematics 2024',
    topic: null,
    explanationPdfUrl: null,
    questions: [
      {
        question_number: 1,
        text: 'Work out: 45 + 38',
        parts: [
          { order_index: 0, text: 'Calculate the sum', answer: '83', explanation: '45 + 38 = 83', marks: 1, answer_type: 'numeric' }
        ]
      },
      {
        question_number: 2,
        text: 'Simplify: 3/4 + 1/8',
        parts: [
          { order_index: 0, text: 'Find a common denominator and add', answer: '7/8', explanation: '3/4 = 6/8, so 6/8 + 1/8 = 7/8', marks: 2, answer_type: 'text' }
        ]
      },
      {
        question_number: 3,
        text: 'Find the value of x in: 2x + 5 = 15',
        parts: [
          { order_index: 0, text: 'Solve for x', answer: '5', explanation: '2x = 15 - 5 = 10, so x = 10/2 = 5', marks: 2, answer_type: 'numeric' }
        ]
      },
      {
        question_number: 4,
        text: 'Calculate the area of a rectangle with length 8cm and width 5cm.',
        parts: [
          { order_index: 0, text: 'Area = length × width', answer: '40cm²', explanation: 'Area = 8 × 5 = 40 square centimeters', marks: 2, answer_type: 'text' }
        ]
      },
      {
        question_number: 5,
        text: 'Express 0.75 as a fraction in its simplest form.',
        parts: [
          { order_index: 0, text: 'Convert decimal to fraction', answer: '3/4', explanation: '0.75 = 75/100 = 3/4 in simplest form', marks: 2, answer_type: 'text' }
        ]
      }
    ]
  },
  {
    id: 'ple-english-2024',
    title: 'PLE English 2024',
    subject: 'English',
    level: 'PLE',
    year: 2024,
    type: 'Past Paper',
    difficulty: 'Medium',
    timeLimit: 120,
    isFree: true,
    description: 'Uganda National Examinations Board (UNEB) PLE English 2024',
    topic: null,
    explanationPdfUrl: null,
    questions: [
      {
        question_number: 1,
        text: 'Choose the correct word to complete the sentence: She ___ to school every day.',
        parts: [
          { order_index: 0, text: 'Select the correct verb form', answer: 'goes', explanation: '"Goes" is the third person singular present tense of "go"', marks: 1, answer_type: 'text' }
        ]
      },
      {
        question_number: 2,
        text: 'Write the plural form of: child',
        parts: [
          { order_index: 0, text: 'Plural form', answer: 'children', explanation: '"Child" is an irregular noun; its plural is "children"', marks: 1, answer_type: 'text' }
        ]
      },
      {
        question_number: 3,
        text: 'Give the past tense of: run',
        parts: [
          { order_index: 0, text: 'Past tense', answer: 'ran', explanation: '"Run" is an irregular verb; past tense is "ran"', marks: 1, answer_type: 'text' }
        ]
      },
      {
        question_number: 4,
        text: 'What is the opposite of: happy',
        parts: [
          { order_index: 0, text: 'Antonym', answer: 'sad', explanation: '"Sad" is the opposite (antonym) of "happy"', marks: 1, answer_type: 'text' }
        ]
      },
      {
        question_number: 5,
        text: 'Complete the proverb: A stitch in time saves ___',
        parts: [
          { order_index: 0, text: 'Complete the proverb', answer: 'nine', explanation: 'The full proverb is "A stitch in time saves nine"', marks: 1, answer_type: 'text' }
        ]
      }
    ]
  },
  // UCE (Uganda Certificate of Education)
  {
    id: 'uce-maths-2024',
    title: 'UCE Mathematics 2024',
    subject: 'Mathematics',
    level: 'UCE',
    year: 2024,
    type: 'Past Paper',
    difficulty: 'Hard',
    timeLimit: 150,
    isFree: false,
    description: 'Uganda National Examinations Board (UNEB) UCE Mathematics 2024',
    topic: null,
    explanationPdfUrl: null,
    questions: [
      {
        question_number: 1,
        text: 'Solve the simultaneous equations: 2x + y = 7 and x - y = 2',
        parts: [
          { order_index: 0, text: 'Find x', answer: '3', explanation: 'Adding equations: 3x = 9, so x = 3', marks: 2, answer_type: 'numeric' },
          { order_index: 1, text: 'Find y', answer: '1', explanation: 'Substituting x=3 into x-y=2: 3-y=2, so y=1', marks: 2, answer_type: 'numeric' }
        ]
      },
      {
        question_number: 2,
        text: 'Factorize completely: x² - 9',
        parts: [
          { order_index: 0, text: 'Factorize the expression', answer: '(x+3)(x-3)', explanation: 'This is a difference of two squares: a² - b² = (a+b)(a-b)', marks: 3, answer_type: 'text' }
        ]
      },
      {
        question_number: 3,
        text: 'Calculate the volume of a cylinder with radius 7cm and height 10cm. (Take π = 22/7)',
        parts: [
          { order_index: 0, text: 'Volume of cylinder', answer: '1540cm³', explanation: 'V = πr²h = (22/7) × 49 × 10 = 1540 cubic centimeters', marks: 3, answer_type: 'numeric' }
        ]
      },
      {
        question_number: 4,
        text: 'A shirt costs UGX 25,000. If the price is increased by 20%, what is the new price?',
        parts: [
          { order_index: 0, text: 'Calculate new price', answer: '30000', explanation: '20% of 25,000 = 5,000. New price = 25,000 + 5,000 = 30,000 UGX', marks: 3, answer_type: 'numeric' }
        ]
      },
      {
        question_number: 5,
        text: 'Find the gradient of the line passing through points (2, 3) and (6, 11).',
        parts: [
          { order_index: 0, text: 'Calculate gradient', answer: '2', explanation: 'Gradient = (y2-y1)/(x2-x1) = (11-3)/(6-2) = 8/4 = 2', marks: 3, answer_type: 'numeric' }
        ]
      }
    ]
  },
  {
    id: 'uce-physics-2024',
    title: 'UCE Physics 2024',
    subject: 'Physics',
    level: 'UCE',
    year: 2024,
    type: 'Past Paper',
    difficulty: 'Hard',
    timeLimit: 150,
    isFree: false,
    description: 'Uganda National Examinations Board (UNEB) UCE Physics 2024',
    topic: null,
    explanationPdfUrl: null,
    questions: [
      {
        question_number: 1,
        text: 'Define velocity and state its SI unit.',
        parts: [
          { order_index: 0, text: 'Definition of velocity', answer: 'Rate of change of displacement with time', explanation: 'Velocity is a vector quantity defined as the rate of change of displacement', marks: 2, answer_type: 'text' },
          { order_index: 1, text: 'SI unit', answer: 'm/s', explanation: 'The SI unit of velocity is meters per second (m/s)', marks: 1, answer_type: 'text' }
        ]
      },
      {
        question_number: 2,
        text: 'A car accelerates uniformly from rest at 2m/s². Calculate its velocity after 5 seconds.',
        parts: [
          { order_index: 0, text: 'Calculate final velocity', answer: '10m/s', explanation: 'v = u + at = 0 + (2)(5) = 10 m/s', marks: 3, answer_type: 'text' }
        ]
      },
      {
        question_number: 3,
        text: 'State Newton\'s Second Law of Motion.',
        parts: [
          { order_index: 0, text: 'Newton\'s Second Law', answer: 'The rate of change of momentum is proportional to the applied force and takes place in the direction of the force', explanation: 'Often expressed as F = ma for constant mass', marks: 2, answer_type: 'text' }
        ]
      }
    ]
  },
  // UACE (Uganda Advanced Certificate of Education)
  {
    id: 'uace-maths-2024',
    title: 'UACE Mathematics 2024',
    subject: 'Mathematics',
    level: 'UACE',
    year: 2024,
    type: 'Past Paper',
    difficulty: 'Hard',
    timeLimit: 180,
    isFree: false,
    description: 'Uganda National Examinations Board (UNEB) UACE Mathematics 2024',
    topic: null,
    explanationPdfUrl: null,
    questions: [
      {
        question_number: 1,
        text: 'Given that f(x) = x³ - 3x² + 2x, find:',
        parts: [
          { order_index: 0, text: 'f\'(x)', answer: '3x² - 6x + 2', explanation: 'Differentiating: f\'(x) = 3x² - 6x + 2', marks: 3, answer_type: 'text' },
          { order_index: 1, text: 'The values of x for which f\'(x) = 0', answer: 'x = (3±√3)/3', explanation: 'Solving 3x² - 6x + 2 = 0 using quadratic formula', marks: 4, answer_type: 'text' }
        ]
      },
      {
        question_number: 2,
        text: 'Evaluate: ∫(2x + 3)² dx',
        parts: [
          { order_index: 0, text: 'Expand and integrate', answer: '(4x³/3) + 6x² + 9x + C', explanation: 'Expand: (2x+3)² = 4x² + 12x + 9. Integrate term by term.', marks: 5, answer_type: 'text' }
        ]
      },
      {
        question_number: 3,
        text: 'A matrix A = [[2, 1], [3, 4]]. Find:',
        parts: [
          { order_index: 0, text: 'Determinant of A', answer: '5', explanation: 'det(A) = (2)(4) - (1)(3) = 8 - 3 = 5', marks: 2, answer_type: 'numeric' },
          { order_index: 1, text: 'Inverse of A', answer: '[[4/5, -1/5], [-3/5, 2/5]]', explanation: 'A⁻¹ = (1/det(A)) × adj(A)', marks: 4, answer_type: 'text' }
        ]
      }
    ]
  },
  {
    id: 'uace-chemistry-2024',
    title: 'UACE Chemistry 2024',
    subject: 'Chemistry',
    level: 'UACE',
    year: 2024,
    type: 'Past Paper',
    difficulty: 'Hard',
    timeLimit: 180,
    isFree: false,
    description: 'Uganda National Examinations Board (UNEB) UACE Chemistry 2024',
    topic: null,
    explanationPdfUrl: null,
    questions: [
      {
        question_number: 1,
        text: 'Define the term "enthalpy of formation".',
        parts: [
          { order_index: 0, text: 'Definition', answer: 'The enthalpy change when one mole of a compound is formed from its elements in their standard states under standard conditions', explanation: 'Standard enthalpy of formation is measured at 298K and 1 atm', marks: 3, answer_type: 'text' }
        ]
      },
      {
        question_number: 2,
        text: 'State Le Chatelier\'s Principle.',
        parts: [
          { order_index: 0, text: 'Le Chatelier\'s Principle', answer: 'When a system at equilibrium is subjected to a change in conditions, the system shifts in a direction that counteracts the change', explanation: 'This principle predicts how equilibrium position changes with temperature, pressure, or concentration changes', marks: 3, answer_type: 'text' }
        ]
      },
      {
        question_number: 3,
        text: 'Balance the equation: KMnO₄ + HCl → KCl + MnCl₂ + H₂O + Cl₂',
        parts: [
          { order_index: 0, text: 'Balanced equation', answer: '2KMnO₄ + 16HCl → 2KCl + 2MnCl₂ + 8H₂O + 5Cl₂', explanation: 'This is a redox reaction. Balance by oxidation number method or half-reaction method.', marks: 4, answer_type: 'text' }
        ]
      }
    ]
  },
  // Practice Papers
  {
    id: 'ple-science-practice-2024',
    title: 'PLE Science Practice Paper',
    subject: 'Science',
    level: 'PLE',
    year: 2024,
    type: 'Practice Paper',
    difficulty: 'Easy',
    timeLimit: 90,
    isFree: true,
    description: 'Practice paper for PLE Science revision',
    topic: null,
    explanationPdfUrl: null,
    questions: [
      {
        question_number: 1,
        text: 'Name the organ responsible for pumping blood in the human body.',
        parts: [
          { order_index: 0, text: 'Name the organ', answer: 'Heart', explanation: 'The heart is a muscular organ that pumps blood through the circulatory system', marks: 1, answer_type: 'text' }
        ]
      },
      {
        question_number: 2,
        text: 'What is the process by which plants make their own food called?',
        parts: [
          { order_index: 0, text: 'Name the process', answer: 'Photosynthesis', explanation: 'Photosynthesis is the process where plants use sunlight, water, and CO₂ to produce glucose and oxygen', marks: 1, answer_type: 'text' }
        ]
      },
      {
        question_number: 3,
        text: 'State two uses of water in the human body.',
        parts: [
          { order_index: 0, text: 'First use', answer: 'Transport of nutrients and oxygen in blood', explanation: 'Water is the main component of blood plasma which transports substances', marks: 1, answer_type: 'text' },
          { order_index: 1, text: 'Second use', answer: 'Regulation of body temperature through sweating', explanation: 'Water helps regulate temperature through evaporation (sweating)', marks: 1, answer_type: 'text' }
        ]
      },
      {
        question_number: 4,
        text: 'Name the force that pulls objects towards the center of the Earth.',
        parts: [
          { order_index: 0, text: 'Name the force', answer: 'Gravity', explanation: 'Gravity is the force of attraction between objects with mass; Earth\'s gravity pulls objects toward its center', marks: 1, answer_type: 'text' }
        ]
      }
    ]
  },
  {
    id: 'uce-biology-practice-2024',
    title: 'UCE Biology Practice Paper',
    subject: 'Biology',
    level: 'UCE',
    year: 2024,
    type: 'Practice Paper',
    difficulty: 'Medium',
    timeLimit: 120,
    isFree: true,
    description: 'Practice paper for UCE Biology revision',
    topic: null,
    explanationPdfUrl: null,
    questions: [
      {
        question_number: 1,
        text: 'Describe the process of digestion in the human mouth.',
        parts: [
          { order_index: 0, text: 'Mechanical digestion', answer: 'Food is chewed by teeth and mixed with saliva', explanation: 'Teeth break down food physically while tongue mixes it with saliva', marks: 2, answer_type: 'text' },
          { order_index: 1, text: 'Chemical digestion', answer: 'Salivary amylase breaks down starch into maltose', explanation: 'Amylase enzyme in saliva begins carbohydrate digestion', marks: 2, answer_type: 'text' }
        ]
      },
      {
        question_number: 2,
        text: 'What is osmosis?',
        parts: [
          { order_index: 0, text: 'Definition of osmosis', answer: 'The movement of water molecules from a region of higher water potential to a region of lower water potential through a selectively permeable membrane', explanation: 'Osmosis is a special type of diffusion involving water molecules only', marks: 3, answer_type: 'text' }
        ]
      },
      {
        question_number: 3,
        text: 'Name two adaptations of red blood cells to their function.',
        parts: [
          { order_index: 0, text: 'First adaptation', answer: 'Biconcave shape increases surface area for gas exchange', explanation: 'The biconcave disc shape maximizes surface area to volume ratio', marks: 2, answer_type: 'text' },
          { order_index: 1, text: 'Second adaptation', answer: 'Contains hemoglobin to carry oxygen', explanation: 'Hemoglobin is the oxygen-carrying pigment in red blood cells', marks: 2, answer_type: 'text' }
        ]
      }
    ]
  }
];

async function seedExams() {
  console.log('🌱 Starting exam data seeding...\n');
  
  const db = initFirebase();
  const batch = writeBatch(db);
  
  let examCount = 0;
  let questionCount = 0;
  let partCount = 0;
  
  for (const examData of sampleExams) {
    const { id, questions, ...examFields } = examData;
    const examRef = doc(db, 'exams', id);
    
    // Create exam document with dual naming for compatibility
    batch.set(examRef, {
      title: examFields.title,
      subject: examFields.subject,
      level: examFields.level,
      year: examFields.year,
      type: examFields.type,
      difficulty: examFields.difficulty,
      timeLimit: examFields.timeLimit,
      time_limit: examFields.timeLimit,
      isFree: examFields.isFree,
      is_free: examFields.isFree,
      description: examFields.description,
      topic: examFields.topic,
      explanationPdfUrl: examFields.explanationPdfUrl,
      explanation_pdf_url: examFields.explanationPdfUrl,
      questionCount: questions.length,
      question_count: questions.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    examCount++;
    console.log(`📝 Creating exam: ${examFields.title}`);
    
    // Create questions and parts
    for (const q of questions) {
      const questionRef = doc(collection(db, 'questions'));
      const questionId = questionRef.id;
      
      batch.set(questionRef, {
        examId: id,
        exam_id: id,
        questionNumber: q.question_number,
        question_number: q.question_number,
        text: q.text,
        imageUrl: null,
        image_url: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      questionCount++;
      
      // Create question parts
      for (const part of q.parts) {
        const partRef = doc(collection(db, 'question_parts'));
        
        batch.set(partRef, {
          questionId: questionId,
          question_id: questionId,
          orderIndex: part.order_index,
          order_index: part.order_index,
          text: part.text,
          answer: part.answer,
          explanation: part.explanation,
          marks: part.marks,
          answerType: part.answer_type,
          answer_type: part.answer_type,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        
        partCount++;
      }
    }
  }
  
  // Commit all writes
  await batch.commit();
  
  console.log('\n✅ Seeding complete!');
  console.log(`   Exams created: ${examCount}`);
  console.log(`   Questions created: ${questionCount}`);
  console.log(`   Question parts created: ${partCount}`);
  
  // Summary by level
  const byLevel = {};
  for (const exam of sampleExams) {
    if (!byLevel[exam.level]) byLevel[exam.level] = 0;
    byLevel[exam.level]++;
  }
  console.log('\n📊 Exams by level:');
  for (const [level, count] of Object.entries(byLevel)) {
    console.log(`   ${level}: ${count} exam(s)`);
  }
  
  // Summary by type
  const byType = {};
  for (const exam of sampleExams) {
    if (!byType[exam.type]) byType[exam.type] = 0;
    byType[exam.type]++;
  }
  console.log('\n📊 Exams by type:');
  for (const [type, count] of Object.entries(byType)) {
    console.log(`   ${type}: ${count} exam(s)`);
  }
}

// Run the seed script
seedExams()
  .then(() => {
    console.log('\n🎉 Done! Exams are now available in Firestore.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error seeding exams:', error);
    process.exit(1);
  });
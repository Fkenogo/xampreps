import { Exam } from '../types';

export const mockExams: Exam[] = [
  // UGANDA - Past Papers
  {
    id: 'uce-math-2024',
    title: 'UCE Mathematics 2024',
    subject: 'Mathematics',
    year: 2024,
    level: 'UCE',
    timeLimit: 180,
    questionCount: 10,
    avgScore: 72,
    isFree: true,
    type: 'Past Paper',
    difficulty: 'Medium',
    description: 'Uganda Certificate of Education Mathematics Past Paper 2024',
    country: 'UGANDA',
    examAuthority: 'UNEB',
    questions: [
      {
        id: 'uce-m-24-1',
        questionNumber: 1,
        text: `**School Expenses and Distance**\n\nYour guardian has a budget of Shs700,000 for your school expenses. To get to the school, your guardian drove 4 km east from your home to the stage and then 8 km north to reach there.`,
        parts: [
          { id: 'uce-m-24-1-a', text: 'How far is it from your home to school if you travel through the direct route?', marks: 4, answer: '8.94 km', answerType: 'numeric', explanation: 'Using Pythagoras theorem: √(4² + 8²) = √(16 + 64) = √80 ≈ 8.94 km' },
          { id: 'uce-m-24-1-b', text: 'Calculate the total fees after the bursary deduction.', marks: 4, answer: 'Shs 622,500', answerType: 'text', explanation: 'School fees after 60% off: 900,000 × 0.4 = 360,000. Uniform after deduction: 350,000 - 87,500 = 262,500. Total: 360,000 + 262,500 = 622,500' },
        ]
      },
      {
        id: 'uce-m-24-2',
        questionNumber: 2,
        text: `**Algebra Problem**\n\nSolve the following equations and simplify where necessary.`,
        parts: [
          { id: 'uce-m-24-2-a', text: 'Solve for x: 3x + 7 = 22', marks: 3, answer: 'x = 5', answerType: 'text', explanation: '3x + 7 = 22 → 3x = 15 → x = 5' },
          { id: 'uce-m-24-2-b', text: 'Factorize: x² - 9', marks: 3, answer: '(x+3)(x-3)', answerType: 'text', explanation: 'This is a difference of squares: a² - b² = (a+b)(a-b)' },
        ]
      }
    ]
  },
  {
    id: 'ple-english-2023',
    title: 'PLE English 2023',
    subject: 'English',
    year: 2023,
    level: 'PLE',
    timeLimit: 120,
    questionCount: 8,
    avgScore: 68,
    isFree: true,
    type: 'Past Paper',
    difficulty: 'Easy',
    description: 'Primary Leaving Examination English Past Paper 2023',
    country: 'UGANDA',
    examAuthority: 'UNEB',
    questions: [
      {
        id: 'ple-e-23-1',
        questionNumber: 1,
        text: `**Reading Comprehension**\n\nRead the passage below and answer the questions that follow.`,
        parts: [
          { id: 'ple-e-23-1-a', text: 'What is the main idea of the passage?', marks: 2, answer: 'The importance of education', answerType: 'open-ended' },
          { id: 'ple-e-23-1-b', text: 'Give two benefits of reading mentioned in the passage.', marks: 4, answer: 'Improves vocabulary and enhances critical thinking', answerType: 'open-ended' },
        ]
      }
    ]
  },
  {
    id: 'uace-physics-2024',
    title: 'UACE Physics 2024',
    subject: 'Physics',
    year: 2024,
    level: 'UACE',
    timeLimit: 180,
    questionCount: 6,
    avgScore: 65,
    isFree: false,
    type: 'Past Paper',
    difficulty: 'Hard',
    description: 'Uganda Advanced Certificate of Education Physics Past Paper 2024',
    country: 'UGANDA',
    examAuthority: 'UNEB',
    questions: [
      {
        id: 'uace-p-24-1',
        questionNumber: 1,
        text: `**Mechanics**\n\nA ball is thrown vertically upward with an initial velocity of 20 m/s.`,
        parts: [
          { id: 'uace-p-24-1-a', text: 'Calculate the maximum height reached by the ball. (Take g = 10 m/s²)', marks: 5, answer: '20 m', answerType: 'numeric', explanation: 'Using v² = u² - 2gh, at max height v=0: 0 = 400 - 20h → h = 20m' },
          { id: 'uace-p-24-1-b', text: 'How long does it take to reach the maximum height?', marks: 3, answer: '2 s', answerType: 'numeric', explanation: 'Using v = u - gt: 0 = 20 - 10t → t = 2s' },
        ]
      }
    ]
  },
  {
    id: 'uce-chemistry-2023',
    title: 'UCE Chemistry 2023',
    subject: 'Chemistry',
    year: 2023,
    level: 'UCE',
    timeLimit: 150,
    questionCount: 8,
    avgScore: 70,
    isFree: false,
    type: 'Past Paper',
    difficulty: 'Medium',
    description: 'Uganda Certificate of Education Chemistry Past Paper 2023',
    country: 'UGANDA',
    examAuthority: 'UNEB',
    questions: [
      {
        id: 'uce-c-23-1',
        questionNumber: 1,
        text: `**Periodic Table**\n\nUse the periodic table to answer the following questions.`,
        parts: [
          { id: 'uce-c-23-1-a', text: 'What is the atomic number of Sodium?', marks: 2, answer: '11', answerType: 'numeric' },
          { id: 'uce-c-23-1-b', text: 'Name the group to which Chlorine belongs.', marks: 2, answer: 'Halogens', answerType: 'text' },
        ]
      }
    ]
  },

  // KENYA - Past Papers
  {
    id: 'kcpe-math-2023',
    title: 'KCPE Mathematics 2023',
    subject: 'Mathematics',
    year: 2023,
    level: 'KCPE',
    timeLimit: 120,
    questionCount: 12,
    avgScore: 75,
    isFree: true,
    type: 'Past Paper',
    difficulty: 'Medium',
    description: 'Kenya Certificate of Primary Education Mathematics Past Paper 2023',
    country: 'KENYA',
    examAuthority: 'KNEC',
    questions: [
      {
        id: 'kcpe-m-23-1',
        questionNumber: 1,
        text: `**Fractions and Decimals**\n\nA farmer harvested 120 bags of maize. He sold 3/5 of them and kept the rest.`,
        parts: [
          { id: 'kcpe-m-23-1-a', text: 'How many bags did he sell?', marks: 2, answer: '72', answerType: 'numeric', explanation: '3/5 × 120 = 72 bags' },
          { id: 'kcpe-m-23-1-b', text: 'What percentage of the harvest did he keep?', marks: 3, answer: '40%', answerType: 'numeric', explanation: 'He kept 2/5 = 40% of the harvest' },
        ]
      }
    ]
  },
  {
    id: 'kcse-biology-2024',
    title: 'KCSE Biology 2024',
    subject: 'Biology',
    year: 2024,
    level: 'KCSE',
    timeLimit: 180,
    questionCount: 8,
    avgScore: 68,
    isFree: false,
    type: 'Past Paper',
    difficulty: 'Hard',
    description: 'Kenya Certificate of Secondary Education Biology Past Paper 2024',
    country: 'KENYA',
    examAuthority: 'KNEC',
    questions: [
      {
        id: 'kcse-b-24-1',
        questionNumber: 1,
        text: `**Cell Biology**\n\nDescribe the process of photosynthesis in plants.`,
        parts: [
          { id: 'kcse-b-24-1-a', text: 'Write the balanced chemical equation for photosynthesis.', marks: 3, answer: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂', answerType: 'text' },
          { id: 'kcse-b-24-1-b', text: 'Explain the role of chlorophyll in this process.', marks: 4, answer: 'Chlorophyll absorbs light energy and converts it to chemical energy', answerType: 'open-ended' },
        ]
      }
    ]
  },

  // TANZANIA - Past Papers
  {
    id: 'psle-math-2024',
    title: 'PSLE Mathematics 2024',
    subject: 'Mathematics',
    year: 2024,
    level: 'PSLE',
    timeLimit: 120,
    questionCount: 10,
    avgScore: 70,
    isFree: true,
    type: 'Past Paper',
    difficulty: 'Easy',
    description: 'Primary School Leaving Examination Mathematics Past Paper 2024',
    country: 'TANZANIA',
    examAuthority: 'NECTA',
    questions: [
      {
        id: 'psle-m-24-1',
        questionNumber: 1,
        text: `**Basic Operations**\n\nCalculate the following:`,
        parts: [
          { id: 'psle-m-24-1-a', text: '25 × 12', marks: 2, answer: '300', answerType: 'numeric' },
          { id: 'psle-m-24-1-b', text: '144 ÷ 12', marks: 2, answer: '12', answerType: 'numeric' },
        ]
      }
    ]
  },
  {
    id: 'csee-chemistry-2024',
    title: 'CSEE Chemistry 2024',
    subject: 'Chemistry',
    year: 2024,
    level: 'CSEE',
    timeLimit: 180,
    questionCount: 9,
    avgScore: 65,
    isFree: false,
    type: 'Past Paper',
    difficulty: 'Medium',
    description: 'Certificate of Secondary Education Examination Chemistry Past Paper 2024',
    country: 'TANZANIA',
    examAuthority: 'NECTA',
    questions: [
      {
        id: 'csee-c-24-1',
        questionNumber: 1,
        text: `**Chemical Reactions**\n\nBalance the following chemical equation:`,
        parts: [
          { id: 'csee-c-24-1-a', text: 'H₂ + O₂ → H₂O', marks: 3, answer: '2H₂ + O₂ → 2H₂O', answerType: 'text' },
          { id: 'csee-c-24-1-b', text: 'Identify the type of reaction.', marks: 2, answer: 'Combination reaction', answerType: 'text' },
        ]
      }
    ]
  },

  // RWANDA - Past Papers
  {
    id: 'ple-rwanda-english-2023',
    title: 'PLE English 2023',
    subject: 'English',
    year: 2023,
    level: 'PLE',
    timeLimit: 120,
    questionCount: 7,
    avgScore: 72,
    isFree: true,
    type: 'Past Paper',
    difficulty: 'Easy',
    description: 'Primary Leaving Examination English Past Paper 2023',
    country: 'RWANDA',
    examAuthority: 'REB',
    questions: [
      {
        id: 'ple-r-23-1',
        questionNumber: 1,
        text: `**Grammar**\n\nChoose the correct form of the verb:`,
        parts: [
          { id: 'ple-r-23-1-a', text: 'She ___ to school every day.', marks: 2, answer: 'goes', answerType: 'text' },
          { id: 'ple-r-23-1-b', text: 'They ___ playing football.', marks: 2, answer: 'are', answerType: 'text' },
        ]
      }
    ]
  },
  {
    id: 'o-level-science-2024',
    title: 'O-Level Science 2024',
    subject: 'Science',
    year: 2024,
    level: 'O_LEVEL',
    timeLimit: 150,
    questionCount: 10,
    avgScore: 68,
    isFree: false,
    type: 'Past Paper',
    difficulty: 'Medium',
    description: 'Ordinary Level Science Past Paper 2024',
    country: 'RWANDA',
    examAuthority: 'REB',
    questions: [
      {
        id: 'ol-s-24-1',
        questionNumber: 1,
        text: `**Physics**\n\nA car travels 100 km in 2 hours.`,
        parts: [
          { id: 'ol-s-24-1-a', text: 'Calculate its average speed.', marks: 3, answer: '50 km/h', answerType: 'numeric', explanation: 'Speed = Distance/Time = 100/2 = 50 km/h' },
          { id: 'ol-s-24-1-b', text: 'Convert this speed to m/s.', marks: 3, answer: '13.89 m/s', answerType: 'numeric', explanation: '50 km/h = 50 × 1000/3600 = 13.89 m/s' },
        ]
      }
    ]
  },

  // BURUNDI - Past Papers
  {
    id: 'cep-math-2024',
    title: 'CEP Mathematics 2024',
    subject: 'Mathematics',
    year: 2024,
    level: 'CEP',
    timeLimit: 120,
    questionCount: 8,
    avgScore: 70,
    isFree: true,
    type: 'Past Paper',
    difficulty: 'Easy',
    description: 'Certificat d\'Etudes Primaires Mathematics Past Paper 2024',
    country: 'BURUNDI',
    examAuthority: 'MEHE',
    questions: [
      {
        id: 'cep-m-24-1',
        questionNumber: 1,
        text: `**Arithmetic**\n\nSolve the following:`,
        parts: [
          { id: 'cep-m-24-1-a', text: '45 + 37', marks: 2, answer: '82', answerType: 'numeric' },
          { id: 'cep-m-24-1-b', text: '84 - 29', marks: 2, answer: '55', answerType: 'numeric' },
        ]
      }
    ]
  },

  // PRACTICE PAPERS - Various Sources
  {
    id: 'uce-science-practice-1',
    title: 'UCE Science Practice Set 1',
    subject: 'Science',
    year: 2024,
    level: 'UCE',
    timeLimit: 90,
    questionCount: 15,
    avgScore: 75,
    isFree: true,
    type: 'Practice Paper',
    difficulty: 'Medium',
    description: 'Practice questions covering Biology, Chemistry, and Physics topics',
    country: 'UGANDA',
    source: 'Bright Minds Academy',
    sourceType: 'school',
    questions: [
      {
        id: 'uce-s-p1-1',
        questionNumber: 1,
        text: `**Cell Biology**\n\nStudy the diagram of a plant cell and answer the following questions.`,
        parts: [
          { id: 'uce-s-p1-1-a', text: 'Name the organelle responsible for photosynthesis.', marks: 2, answer: 'Chloroplast', answerType: 'text' },
          { id: 'uce-s-p1-1-b', text: 'What is the function of the cell wall?', marks: 3, answer: 'Provides structural support and protection', answerType: 'open-ended' },
        ]
      }
    ]
  },
  {
    id: 'ple-math-practice-1',
    title: 'PLE Mathematics Practice',
    subject: 'Mathematics',
    year: 2024,
    level: 'PLE',
    timeLimit: 60,
    questionCount: 20,
    avgScore: 80,
    isFree: true,
    type: 'Practice Paper',
    difficulty: 'Easy',
    description: 'Comprehensive practice set for PLE Mathematics',
    country: 'UGANDA',
    source: 'National Education Publishers',
    sourceType: 'publisher',
    questions: [
      {
        id: 'ple-m-p1-1',
        questionNumber: 1,
        text: `**Basic Arithmetic**\n\nSolve the following problems.`,
        parts: [
          { id: 'ple-m-p1-1-a', text: 'Calculate: 456 + 789', marks: 2, answer: '1245', answerType: 'numeric' },
          { id: 'ple-m-p1-1-b', text: 'What is 25% of 200?', marks: 2, answer: '50', answerType: 'numeric' },
        ]
      }
    ]
  },
  {
    id: 'kcse-physics-practice',
    title: 'KCSE Physics Practice Questions',
    subject: 'Physics',
    year: 2024,
    level: 'KCSE',
    timeLimit: 120,
    questionCount: 12,
    avgScore: 72,
    isFree: false,
    type: 'Practice Paper',
    difficulty: 'Hard',
    description: 'Advanced physics questions for KCSE preparation',
    country: 'KENYA',
    source: 'Kenyatta High School',
    sourceType: 'school',
    questions: [
      {
        id: 'kcse-p-p1-1',
        questionNumber: 1,
        text: `**Electricity**\n\nA circuit has a resistance of 10 ohms and a current of 2 amperes.`,
        parts: [
          { id: 'kcse-p-p1-1-a', text: 'Calculate the voltage across the circuit.', marks: 3, answer: '20 V', answerType: 'numeric', explanation: 'V = IR = 2 × 10 = 20 V' },
          { id: 'kcse-p-p1-1-b', text: 'Calculate the power dissipated.', marks: 3, answer: '40 W', answerType: 'numeric', explanation: 'P = I²R = 4 × 10 = 40 W' },
        ]
      }
    ]
  },
  {
    id: 'psle-science-practice',
    title: 'PSLE Science Practice',
    subject: 'Science',
    year: 2024,
    level: 'PSLE',
    timeLimit: 90,
    questionCount: 14,
    avgScore: 78,
    isFree: true,
    type: 'Practice Paper',
    difficulty: 'Easy',
    description: 'Basic science concepts for primary level',
    country: 'TANZANIA',
    source: 'Tanzania Institute of Education',
    sourceType: 'institution',
    questions: [
      {
        id: 'psle-s-p1-1',
        questionNumber: 1,
        text: `**Living Things**\n\nIdentify the characteristics of living things.`,
        parts: [
          { id: 'psle-s-p1-1-a', text: 'Name three characteristics of living things.', marks: 3, answer: 'Growth, reproduction, respiration', answerType: 'text' },
          { id: 'psle-s-p1-1-b', text: 'Give an example of a non-living thing.', marks: 2, answer: 'Rock', answerType: 'text' },
        ]
      }
    ]
  },
  {
    id: 'o-level-math-practice',
    title: 'O-Level Mathematics Practice',
    subject: 'Mathematics',
    year: 2024,
    level: 'O_LEVEL',
    timeLimit: 150,
    questionCount: 10,
    avgScore: 70,
    isFree: false,
    type: 'Practice Paper',
    difficulty: 'Medium',
    description: 'Intermediate mathematics problems for O-level',
    country: 'RWANDA',
    source: 'Rwanda Education Board',
    sourceType: 'institution',
    questions: [
      {
        id: 'ol-m-p1-1',
        questionNumber: 1,
        text: `**Algebra**\n\nSolve the quadratic equation: x² - 5x + 6 = 0`,
        parts: [
          { id: 'ol-m-p1-1-a', text: 'Factorize the equation.', marks: 3, answer: '(x-2)(x-3) = 0', answerType: 'text' },
          { id: 'ol-m-p1-1-b', text: 'Find the values of x.', marks: 3, answer: 'x = 2 or x = 3', answerType: 'text' },
        ]
      }
    ]
  },
  {
    id: 'cep-english-practice',
    title: 'CEP English Practice',
    subject: 'English',
    year: 2024,
    level: 'CEP',
    timeLimit: 90,
    questionCount: 12,
    avgScore: 75,
    isFree: true,
    type: 'Practice Paper',
    difficulty: 'Easy',
    description: 'English language practice for primary level',
    country: 'BURUNDI',
    source: 'Burundi Ministry of Education',
    sourceType: 'institution',
    questions: [
      {
        id: 'cep-e-p1-1',
        questionNumber: 1,
        text: `**Vocabulary**\n\nChoose the correct word to complete the sentence:`,
        parts: [
          { id: 'cep-e-p1-1-a', text: 'The cat is ___ the table.', marks: 2, answer: 'on', answerType: 'text' },
          { id: 'cep-e-p1-1-b', text: 'She ___ to school yesterday.', marks: 2, answer: 'went', answerType: 'text' },
        ]
      }
    ]
  }
];

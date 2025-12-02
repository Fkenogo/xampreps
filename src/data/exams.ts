import { Exam } from '../types';

export const mockExams: Exam[] = [
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
  }
];

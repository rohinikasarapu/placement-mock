// Creates ONE small sample test (3 sections, 7 questions), scheduled for TODAY (IST) and already active.
// Run:  node seed/sampleTest.js        (safe to run again: it does nothing if the test already exists)
require('dotenv').config();
const connectDB = require('../config/db');
const Test = require('../models/Test');
const Question = require('../models/Question');
const { normalizeSections } = require('../config/pattern');
const { today } = require('../utils/schedule');

const NAME = 'Sample Mock Test';

// Edit these sections freely: questionCount must match the number of questions you list for that section below.
const sections = normalizeSections([
  { key: 'reasoning', sectionName: 'Reasoning', type: 'objective', questionCount: 3, marksPerQuestion: 1, durationMinutes: 5, displayOrder: 1 },
  { key: 'quant',     sectionName: 'Quantitative', type: 'objective', questionCount: 3, marksPerQuestion: 2, durationMinutes: 5, displayOrder: 2 },
  { key: 'written',   sectionName: 'Written Test', type: 'descriptive', questionCount: 1, marksPerQuestion: 0, durationMinutes: 5, displayOrder: 3 }
]).sections;

// options = 4 choices; answer = index (0-3) of the correct option
const questions = {
  reasoning: [
    { text: 'Find the next number: 2, 4, 8, 16, ?', options: ['24', '32', '30', '20'], answer: 1, difficulty: 'Easy' },
    { text: 'All roses are flowers. Some flowers fade quickly. Which is certain?', options: ['All roses fade quickly', 'Some roses are flowers', 'No rose fades', 'All flowers are roses'], answer: 1, difficulty: 'Medium' },
    { text: 'If A=1, B=2, C=3 and so on, what is the sum of the letters in BAT (B+A+T)?', options: ['23', '25', '21', '27'], answer: 0, difficulty: 'Medium' }
  ],
  quant: [
    { text: 'What is 15% of 200?', options: ['20', '25', '30', '35'], answer: 2, difficulty: 'Easy' },
    { text: 'A train covers 120 km in 2 hours. Its speed in km/h is', options: ['50', '60', '70', '80'], answer: 1, difficulty: 'Easy' },
    { text: 'The average of 10, 20 and 30 is', options: ['15', '20', '25', '30'], answer: 1, difficulty: 'Easy' }
  ],
  written: [
    { text: 'Write a short paragraph (80-100 words) on why you want to work in the technology industry.', difficulty: 'Medium' }
  ]
};

(async () => {
  await connectDB();
  if (await Test.findOne({ testName: NAME })) { console.log(`"${NAME}" already exists - nothing changed.`); return process.exit(0); }
  const test = await Test.create({ testName: NAME, description: 'Small sample test created from code.', scheduledDate: today(), sections, isActive: false });
  for (const s of sections) {
    const list = questions[s.key] || [];
    if (list.length !== s.questionCount) throw new Error(`${s.sectionName}: expected ${s.questionCount} questions, found ${list.length}`);
    await Question.insertMany(list.map((q, i) => ({
      testId: test._id, section: s.key, order: i + 1, text: q.text, difficulty: q.difficulty, questionType: s.type,
      options: s.type === 'objective' ? q.options : [], correctOption: s.type === 'objective' ? q.answer : undefined,
      marks: s.type === 'objective' ? s.marksPerQuestion : 0
    })));
  }
  test.isActive = true; await test.save();   // activate only after every section has its questions
  console.log(`Created "${NAME}" for ${test.scheduledDate}: ${test.totalDuration} min, ${test.totalMarks} marks, active.`);
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
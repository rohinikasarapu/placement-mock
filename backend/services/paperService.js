const { randomInt } = require('crypto');
const Question = require('../models/Question');
const { activeSections } = require('../config/pattern');

const r2 = n => Math.round(n * 100) / 100;

// Question count per section for a test. A test is "ready" when every ENABLED section has at least its configured
// number of questions; `shortages` lists what is missing (used to block activation).
async function sectionCounts(test) {
  const qs = await Question.find({ testId: test._id }).select('section').lean();
  const counts = {};
  qs.forEach(q => { counts[q.section] = (counts[q.section] || 0) + 1; });
  const shortages = activeSections(test.sections)
    .filter(s => (counts[s.key] || 0) < s.questionCount)
    .map(s => ({ key: s.key, sectionName: s.sectionName || s.name, required: s.questionCount, available: counts[s.key] || 0 }));
  return { counts, ready: shortages.length === 0, shortages };
}

async function loadQuestionBank(test) {
  return Question.find({ testId: test._id }).lean();
}

function sampleShuffled(items, count, random = randomInt) {
  const shuffled = items.slice();
  const selected = Math.min(count, shuffled.length);
  for (let i = 0; i < selected; i++) {
    const j = i + random(shuffled.length - i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, selected);
}

// Freeze a randomized paper (with answer key) so admin edits cannot change an attempt in progress.
// Sections stay in display order; questions are sampled and shuffled within each enabled section.
function buildPaper(test, qs, random = randomInt) {
  const paper = [];
  activeSections(test.sections).forEach((sec, sectionIndex) => {
    sampleShuffled(qs.filter(q => q.section === sec.key), sec.questionCount, random).forEach((q, i) => {
      paper.push({
        id: String(q._id), section: sec.key, sectionIndex, number: i + 1,
        type: sec.type, text: q.text, options: q.options || [],
        correctOption: sec.type === 'objective' ? q.correctOption : null,
        marks: sec.type === 'objective' ? r2(sec.marksPerQuestion != null ? sec.marksPerQuestion : sec.totalMarks / sec.questionCount) : 0,
        negativeMarks: q.negativeMarks || 0
      });
    });
  });
  return paper;
}

module.exports = { sectionCounts, loadQuestionBank, buildPaper, r2 };

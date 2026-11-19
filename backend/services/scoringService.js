const { r2 } = require('./paperService');

// All marking happens here, on the server, from the frozen answer key.
function evaluate(attempt) {
  const responses = attempt.responses || {};
  const sections = attempt.sections.map(s => ({
    key: s.key, name: s.name, type: s.type, questions: s.questionCount, maxMarks: s.totalMarks,
    correct: 0, incorrect: 0, unanswered: 0, marks: 0, written: null
  }));
  let written = null;

  for (const q of attempt.paper) {
    const sec = sections[q.sectionIndex];
    const r = responses[q.id] || {};
    if (q.type === 'descriptive') {
      const text = String(r.written || '').trim();
      sec.written = text;
      sec.answered = text.length > 0 ? 1 : 0;
      written = { questionId: q.id, text, wordCount: text ? text.split(/\s+/).length : 0 };
      continue;
    }
    const sel = r.selected;
    if (sel === undefined || sel === null) sec.unanswered++;
    else if (Number(sel) === q.correctOption) { sec.correct++; sec.marks += q.marks; }
    else { sec.incorrect++; sec.marks -= q.negativeMarks; }
  }

  sections.forEach(s => { s.marks = r2(Math.max(0, s.marks)); });
  const objective = sections.filter(s => s.type === 'objective');
  const sum = k => objective.reduce((a, s) => a + s[k], 0);
  const totalMarks = r2(sum('marks'));
  const end = attempt.submittedAt || new Date();
  const totalDuration = attempt.sections.reduce((a, s) => a + s.durationMinutes * 60, 0);
  const timeTakenSeconds = Math.min(totalDuration, Math.max(0, Math.round((end - attempt.startedAt) / 1000)));

  return {
    totalMarks, maxMarks: objective.reduce((a, s) => a + s.maxMarks, 0),
    correct: sum('correct'), incorrect: sum('incorrect'), unanswered: sum('unanswered'),
    timeTakenSeconds, sections, writtenResponse: written
  };
}

module.exports = { evaluate };

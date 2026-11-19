const router = require('express').Router();
const attemptAuth = require('../middleware/attemptAuth');
const { login, requireAdmin } = require('../middleware/adminAuth');
const students = require('../controllers/studentController');
const tests = require('../controllers/testController');
const attempts = require('../controllers/attemptController');
const results = require('../controllers/resultController');
const admin = require('../controllers/adminController');
const reports = require('../controllers/reportController');

// Students
router.post('/students/register', students.register);
router.get('/students/roll/:rollNumber', students.getByRoll);
router.get('/students/:id', students.getById);

// Tests
router.get('/tests', tests.list);
router.get('/tests/today', tests.today);
router.get('/tests/upcoming', tests.upcoming);
router.get('/tests/:id/instructions', tests.instructions);
router.post('/tests/:id/start', tests.start);
router.get('/tests/:id', tests.getById);

// Examination (requires the attempt token header)
router.get('/attempts/:id', attemptAuth, attempts.getAttempt);
router.get('/attempts/:id/questions', attemptAuth, attempts.getQuestions);
router.post('/attempts/:id/answers', attemptAuth, attempts.saveAnswers);
router.post('/attempts/:id/section', attemptAuth, attempts.changeSection);
router.get('/attempts/:id/timer', attemptAuth, attempts.getTimer);
router.post('/attempts/:id/submit', attemptAuth, attempts.submit);
router.post('/attempts/:id/violation', attemptAuth, attempts.violation);

// Results
router.get('/results/student/:studentId', results.byStudent);
router.get('/results/roll/:rollNumber', results.byRoll);
router.get('/results/:id', results.getById);

// Admin
router.post('/admin/login', login);
router.use('/admin', requireAdmin);
router.get('/admin/stats', admin.stats);
router.get('/admin/analytics', reports.analytics);
router.get('/admin/students', admin.students);
router.get('/admin/students/:id/results', admin.studentResults);
router.get('/admin/results', reports.results);
router.get('/admin/results/filter', reports.results);
router.get('/admin/results/options', reports.options);
router.get('/admin/results/export/excel', reports.exportExcel);
router.get('/admin/results/export/csv', reports.exportCsv);
router.get('/admin/tests', admin.listTests);
router.get('/admin/tests/today', admin.todayTests);
router.get('/admin/tests/upcoming', admin.upcomingTests);
router.get('/admin/tests/past', admin.pastTests);
router.get('/admin/section-defaults', admin.defaultSections);
router.post('/admin/tests', admin.createTest);
router.put('/admin/tests/:id', admin.updateTest);
router.delete('/admin/tests/:id', admin.deleteTest);
router.get('/admin/tests/:id/questions', admin.listQuestions);
router.post('/admin/tests/:id/questions', admin.addQuestion);
router.put('/admin/questions/:qid', admin.updateQuestion);
router.delete('/admin/questions/:qid', admin.deleteQuestion);

module.exports = router;

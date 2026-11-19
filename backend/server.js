require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const Student = require('./models/Student');
const Attempt = require('./models/Attempt');
const TestResult = require('./models/TestResult');
const { sweepExpired } = require('./services/attemptService');

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();
    await Promise.all([Student.init(), TestResult.init(), Attempt.init()]); // make sure the unique roll-number index exists
    // Finalize attempts whose time ran out while the student was offline.
    setInterval(() => sweepExpired().catch(e => console.error('sweep failed:', e.message)), 15000).unref();
    app.listen(PORT, () => console.log(`Placement Mock Test running at http://localhost:${PORT}`));
  } catch (err) {
    console.error('Startup failed:', err.message);
    process.exit(1);
  }
})();

# Placement Mock Test Portal – Vignan's Institute of Engineering for Women

HTML/CSS/vanilla JS frontend · Node.js + Express · MongoDB Atlas (Mongoose) · ExcelJS for reports.
Converted from the original EAPCET mock-test project.

## Run locally
```bash
cd backend
npm install
cp .env.example .env     # set MONGO_URI (Atlas), ADMIN_USERNAME, ADMIN_PASSWORD; never commit .env
npm run seed             # creates the sample tests, including the mockTests folder. Safe to re-run
npm start                # http://localhost:5000
```
Pages: `/` register · `/dashboard.html` · `/instructions.html` · `/exam.html` · `/result.html` · `/admin.html`

## College logo (you must add this file)
I could not obtain the official logo from this environment and I did not draw one. Put the logo supplied by the college at
`public/img/college-logo.png` (also accepted for the website: .jpg, .jpeg, .svg, .webp; the **Excel report needs PNG or JPG**).
Every page header, the exam header and the Excel heading pick it up automatically. Until then pages show the full college name without an image.

## Date-wise scheduling (IST)
* Each test has `scheduledDate` (an IST calendar date). Students see and can start a test **only on that date**.
* Enforced on the server: `POST /api/tests/:id/start` and `GET /api/tests/:id/instructions` return 403 `TEST_NOT_AVAILABLE` for future or past tests. The dashboard only reflects this.
* `GET /api/tests/today`, `GET /api/tests/upcoming` (past tests are never listed). An already-running attempt can still be resumed if midnight passes.
* Admin: create / edit / reschedule / activate / deactivate / delete; views for today, upcoming, past (`/api/admin/tests`, `/today`, `/upcoming`, `/past`). Dates in the past are rejected.

## Full-screen and tab monitoring
* "I'm Ready to Begin" is enabled only after the declaration is ticked **and** the browser is in full screen. The exam loads into the same page so full screen is not lost.
* Leaving full screen, switching tab / minimising, or losing window focus = 1 violation. Warnings: 1st "First warning", 2nd "Final warning", 3rd "Last warning before termination". The **4th violation ends the exam**: timers stop, inputs lock, saved answers are submitted, the score is computed on the server, and the result is saved. The attempt cannot be resumed or restarted.
* The server stores `violationCount`, `violations[{type, at}]` and `terminationReason` ("Exceeded maximum tab-switch/full-screen violations") in the `testattempts` collection; refreshing does not reset the count. Several browser events from one action (blur + hidden + fullscreen exit) are counted once (1.5 s window).
* After a refresh the browser leaves full screen, so a blocking "Enter Full Screen" screen appears. The timer keeps running and the refresh itself is not a violation.
* **Limitation:** this uses only the Fullscreen, Page Visibility and focus events. It cannot reliably detect other applications, a second device, or every way of bypassing a browser. It is a deterrent and an audit record, **not foolproof proctoring**. Full-screen is not available in iPhone browsers, so the exam must be taken on a desktop/laptop or Android device.

## Results and exports
Admin → Examination Results: search (name, roll no., test), filters (department, year, test, date, date range, individual student), sorting on every column, pagination; all filters combine.
`GET /api/admin/results` (and `/results/filter`) take query parameters `q, department, year, testName, date, from, to, studentId, sort, order, page, limit`.
`GET /api/admin/results/export/excel` and `/export/csv` accept the same filters and export exactly the matching rows (file names such as `Placement_All_Results.xlsx`, `CSE_Placement_Results.xlsx`, `Placement_Results_18_Nov_2026.xlsx`). The Excel file has the college name, logo (if added), generation date, applied filters, bold headers, borders, widths, real dates (IST) and numeric marks.

## Data
`students`; `tests` (testName, description, scheduledDate, totalDuration, totalMarks, sections, isActive, createdAt, updatedAt); `testresults` (exactly studentId, studentName, rollNumber, department, yearOfStudy, testName, totalMarks, submissionDate); `testattempts` (timer state, answers, violations, termination reason); `attemptpapers` (the frozen question paper of each attempt, kept apart so attempt documents stay small).

## Admin-configurable sections
Each test owns its sections (name, number of questions, marks per question, total marks, time, enabled, order). In **Admin > Tests** you can add, edit, reorder, enable/disable and remove sections and see a live exam preview. Total time and marks are calculated from **enabled** sections only; the exam timer uses each section's own duration and moves to the next enabled section. A test can be **activated only when every enabled section has at least its configured number of questions** (otherwise the API returns 409 `ACTIVATION_BLOCKED` listing the shortfall). A section that is removed or disabled cannot be changed while a student is taking the test; removing a section deletes its questions.

For each new attempt, questions are randomly selected from each enabled section's bank (when it contains more than configured) and shuffled within that section. Section order and answer-option order stay as configured; the resulting paper is frozen for the attempt, including when a student resumes.

## Sample tests (seed)
`npm run seed` runs the main seed and the three scripts in `backend/seed/mockTests` (*Placement Mock Test 1–3*). Run `npm run seed:mocktests` to seed only those three tests. The mock tests are scheduled for today, tomorrow and two days from today by default, and are active once their questions are loaded. Re-running does not duplicate tests that already exist. The main seed creates *Placement Aptitude Mock Test 1 and 2*, *Technical Assessment Mock Test 1 and 2* and *Company Placement Mock Test 1* (7 sections, 60 questions, 75 marks each, original questions with difficulty and type); `npm run seed -- --force` rebuilds only seeded tests nobody has attempted. Open a test in admin to review/edit it.

## Capacity (600 students at once)
Design: attempt secrets and the frozen paper are cached in memory (mutable state is always in the database), an answer save is a single conditional write, timer polls are one read (client polls every 20 s, the countdown runs locally), the auto-submit sweeper uses an indexed query, dashboards use a 5-second shared cache, responses are gzip-compressed, and the MongoDB pool is `DB_POOL_SIZE` (default 50). **Use a dedicated MongoDB Atlas cluster (M10 or larger) for an exam of this size; the free shared tier throttles operations and is not suitable.** Run `npm run loadtest` (BASE, STUDENTS, THINK_MS, POLL_MS, MAX_Q_PER_SECTION) against a staging copy before exam day.
Measured here: 600 simulated students, 0 errors, overall p95 454 ms, answer saves p95 101 ms at roughly 3x real answering pace. This ran on a 2-core sandbox against a FerretDB/PostgreSQL stand-in, **not** real MongoDB Atlas, so treat it as evidence the application layer scales, and repeat it on your own Atlas cluster.

## Security notes
Marks are computed only on the server from a frozen answer key; attempts need a secret token; final submission is atomic and happens once; admin routes need a signed token. Registration has no password/OTP by design, so a roll number is **not** secure identity verification.

## Tests
`cd backend && npm test` needs the server running and uses the database in `MONGO_URI`. **Use a separate test database, not production data**: the tests create students, tests and results.

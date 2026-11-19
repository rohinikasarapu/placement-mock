const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { toIstString, pretty, today, IST_OFFSET_MIN } = require('../utils/schedule');

const COLLEGE = "VIGNAN'S INSTITUTE OF ENGINEERING FOR WOMEN";
const LOGO_DIR = path.join(__dirname, '..', '..', 'public', 'img');
const logoFile = () => ['college-logo.png', 'college-logo.jpg', 'college-logo.jpeg'].map(f => path.join(LOGO_DIR, f)).find(f => fs.existsSync(f));

const COLUMNS = [
  { header: 'Student ID', key: 'studentId', width: 27 },
  { header: 'Student Name', key: 'studentName', width: 28 },
  { header: 'Roll Number', key: 'rollNumber', width: 16 },
  { header: 'Department', key: 'department', width: 14 },
  { header: 'Year of Study', key: 'yearOfStudy', width: 14 },
  { header: 'Test Name', key: 'testName', width: 30 },
  { header: 'Total Marks', key: 'totalMarks', width: 13 },
  { header: 'Submission Date', key: 'submissionDate', width: 22 }
];

const slug = s => String(s).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const dateSlug = d => { const [y, m, day] = d.split('-'); return `${day}_${pretty(d).split('-')[1]}_${y}`; };   // 18_Nov_2026

// Meaningful file names, e.g. Placement_All_Results / CSE_Placement_Results / Aptitude_Mock_Test_1_Results / Placement_Results_18_Nov_2026
function fileBase(q = {}) {
  const segs = [];
  if (q.department) segs.push(slug(q.department));
  if (q.year) segs.push(slug(q.year));
  if (q.testName) segs.push(slug(q.testName));
  const dated = q.date ? dateSlug(q.date) : (q.from || q.to) ? [q.from && dateSlug(q.from), q.to && dateSlug(q.to)].filter(Boolean).join('_to_') : '';
  const stem = q.testName ? segs.join('_') + '_Results' : segs.length ? segs.join('_') + '_Placement_Results' : (dated || q.q || q.studentId) ? 'Placement_Results' : 'Placement_All_Results';
  return [stem, dated, q.q && 'Search_' + slug(q.q).slice(0, 20), q.studentId && 'Student'].filter(Boolean).join('_');
}

function filterSummary(q) {
  const p = [];
  if (q.department) p.push('Department: ' + q.department);
  if (q.year) p.push('Year: ' + q.year);
  if (q.testName) p.push('Test: ' + q.testName);
  if (q.date) p.push('Date: ' + pretty(q.date));
  if (q.from || q.to) p.push(`Date range: ${q.from ? pretty(q.from) : '…'} to ${q.to ? pretty(q.to) : '…'}`);
  if (q.q) p.push('Search: "' + q.q + '"');
  if (q.studentId) p.push('Single student');
  return p.length ? 'Filters applied — ' + p.join(' | ') : 'Filters applied — none (all results)';
}

// Excel stores wall-clock time without a zone; shift by the IST offset so cells show IST.
const istCell = d => new Date(new Date(d).getTime() + IST_OFFSET_MIN * 60000);
const row = r => ({ studentId: String(r.studentId), studentName: r.studentName, rollNumber: r.rollNumber, department: r.department, yearOfStudy: r.yearOfStudy, testName: r.testName, totalMarks: r.totalMarks, submissionDate: r.submissionDate });

async function buildWorkbook(rows, query) {
  const wb = new ExcelJS.Workbook();
  wb.creator = COLLEGE; wb.created = new Date();
  const ws = wb.addWorksheet('Placement Results', { views: [{ state: 'frozen', ySplit: 6 }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws.columns = COLUMNS.map(c => ({ key: c.key, width: c.width }));
  const NAVY = 'FF0B2A5B', last = 'H';

  const logo = logoFile();
  if (logo) {
    const id = wb.addImage({ filename: logo, extension: logo.endsWith('.png') ? 'png' : 'jpeg' });
    ws.addImage(id, { tl: { col: 0.15, row: 0.15 }, ext: { width: 62, height: 62 } });
  }
  ws.mergeCells(`B1:${last}1`); ws.getCell('B1').value = COLLEGE;
  ws.getCell('B1').font = { name: 'Arial', size: 16, bold: true, color: { argb: NAVY } };
  ws.mergeCells(`B2:${last}2`); ws.getCell('B2').value = 'Placement Mock Test Results';
  ws.getCell('B2').font = { name: 'Arial', size: 12, bold: true };
  ws.mergeCells(`B3:${last}3`); ws.getCell('B3').value = `Report generated on ${pretty(today())}, ${toIstString(new Date()).slice(11)} IST  |  Records: ${rows.length}  |  All dates and times are in IST`;
  ws.getCell('B3').font = { name: 'Arial', size: 10, color: { argb: 'FF475569' } };
  ws.mergeCells(`B4:${last}4`); ws.getCell('B4').value = filterSummary(query);
  ws.getCell('B4').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
  [1, 2, 3].forEach(n => { ws.getRow(n).height = 22; ws.getRow(n).alignment = { vertical: 'middle' }; });

  const h = ws.getRow(6);
  COLUMNS.forEach((c, i) => { h.getCell(i + 1).value = c.header; });
  h.height = 24;
  h.eachCell(c => {
    c.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  const thin = { style: 'thin', color: { argb: 'FF94A3B8' } };
  rows.forEach((r, i) => {
    const o = row(r), x = ws.getRow(7 + i);
    COLUMNS.forEach((c, k) => { x.getCell(k + 1).value = c.key === 'submissionDate' ? istCell(o.submissionDate) : o[c.key]; });
    x.getCell(7).numFmt = '0.##'; x.getCell(7).alignment = { horizontal: 'right' };
    x.getCell(8).numFmt = 'dd-mmm-yyyy hh:mm'; x.getCell(8).alignment = { horizontal: 'center' };
    x.eachCell(c => { c.font = { name: 'Arial', size: 10 }; c.border = { top: thin, left: thin, bottom: thin, right: thin }; if (i % 2) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; });
  });
  if (!rows.length) { ws.mergeCells(`A7:${last}7`); ws.getCell('A7').value = 'No results match the selected filters.'; ws.getCell('A7').alignment = { horizontal: 'center' }; }
  else ws.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6 + rows.length, column: 8 } };
  return wb;
}

const csvCell = v => { const s = String(v ?? ''); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? '"' + (/^[=+\-@]/.test(s) ? "'" : '') + s.replace(/"/g, '""') + '"' : s; };   // quotes + spreadsheet-formula guard
function buildCsv(rows) {
  const lines = [COLUMNS.map(c => csvCell(c.header)).join(',')];
  rows.forEach(r => { const o = row(r); lines.push([o.studentId, o.studentName, o.rollNumber, o.department, o.yearOfStudy, o.testName, o.totalMarks, toIstString(o.submissionDate)].map(csvCell).join(',')); });
  return '﻿' + lines.join('\r\n') + '\r\n';
}

module.exports = { buildWorkbook, buildCsv, fileBase, COLUMNS, COLLEGE };

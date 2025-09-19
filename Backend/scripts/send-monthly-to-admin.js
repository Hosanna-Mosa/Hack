require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const { sendMail } = require('../utils/mailer');
const User = require('../models/User');
const { renderMonthlyAttendanceTemplate } = require('../utils/emailTemplates');
const { buildMonthlyAttendanceWorkbook } = require('../utils/xlsx');
const AttendanceRecord = require('../models/AttendanceRecord');

function formatMonthRange(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

async function aggregateMonthlyAttendance(targetDate = new Date()) {
  const { start, end } = formatMonthRange(targetDate);
  const pipeline = [
    { $match: { date: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ];
  const results = await AttendanceRecord.aggregate(pipeline);
  const summary = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
  for (const row of results) {
    summary[row._id] = row.count;
    summary.total += row.count;
  }
  // Per-class breakdown
  const classPipeline = [
    { $match: { date: { $gte: start, $lte: end } } },
    { $lookup: { from: 'classes', localField: 'classId', foreignField: '_id', as: 'cls' } },
    { $unwind: '$cls' },
    { $group: { _id: { classId: '$cls._id', className: '$cls.name', status: '$status' }, count: { $sum: 1 } } }
  ];
  const classRows = await AttendanceRecord.aggregate(classPipeline);
  const byClass = new Map();
  for (const row of classRows) {
    const cid = String(row._id.classId);
    const cname = row._id.className;
    const status = row._id.status;
    if (!byClass.has(cid)) byClass.set(cid, { name: cname, present: 0, absent: 0, late: 0, excused: 0, total: 0, students: [] });
    const csum = byClass.get(cid);
    csum[status] = (csum[status] || 0) + row.count;
    csum.total += row.count;
  }
  // Per-student breakdown within each class
  const studentPipeline = [
    { $match: { date: { $gte: start, $lte: end } } },
    { $lookup: { from: 'classes', localField: 'classId', foreignField: '_id', as: 'cls' } },
    { $unwind: '$cls' },
    { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'stu' } },
    { $unwind: { path: '$stu', preserveNullAndEmptyArrays: true } },
    { $group: { _id: { classId: '$cls._id', studentMongoId: '$studentId', studentCode: '$stu.studentId', studentName: '$stu.name', status: '$status' }, count: { $sum: 1 } } }
  ];
  const sRows = await AttendanceRecord.aggregate(studentPipeline);
  for (const row of sRows) {
    const classId = String(row._id.classId);
    const studentMongoId = String(row._id.studentMongoId || 'unknown');
    const studentCode = row._id.studentCode || '';
    const studentName = row._id.studentName || 'Unknown';
    const status = row._id.status;
    const c = byClass.get(classId);
    if (!c) continue;
    let stu = c.students.find(s => s.id === studentMongoId);
    if (!stu) {
      stu = { id: studentMongoId, code: studentCode, name: studentName, present: 0, absent: 0, late: 0, excused: 0, total: 0 };
      c.students.push(stu);
    }
    stu[status] = (stu[status] || 0) + row.count;
    stu.total += row.count;
  }
  const classes = Array.from(byClass.values());
  return { start, end, summary, classes };
}

function renderEmail({ start, end, summary }) {
  const monthName = start.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const subject = `Monthly Attendance Summary - ${monthName}`;
  const lines = [
    `Attendance summary for ${monthName}:`,
    `Total records: ${summary.total}`,
    `Present: ${summary.present}`,
    `Absent: ${summary.absent}`,
    `Late: ${summary.late}`,
    `Excused: ${summary.excused}`
  ];
  const text = lines.join('\n');
  const html = `<h3>Attendance summary for ${monthName}</h3>
  <ul>
    <li><b>Total records:</b> ${summary.total}</li>
    <li><b>Present:</b> ${summary.present}</li>
    <li><b>Absent:</b> ${summary.absent}</li>
    <li><b>Late:</b> ${summary.late}</li>
    <li><b>Excused:</b> ${summary.excused}</li>
  </ul>`;
  return { subject, text, html };
}

async function main() {
  const adminId = process.argv[2];
  if (!adminId) throw new Error('Usage: node scripts/send-monthly-to-admin.js <adminId>');

  await connectDB();
  const admin = await User.findOne({ _id: adminId, role: 'admin', isActive: true }).select('profile.contact.email');
  if (!admin) throw new Error('Admin not found or inactive');
  const to = admin.profile?.contact?.email;
  if (!to) throw new Error('Admin has no email');

  const data = await aggregateMonthlyAttendance(new Date());
  const monthName = data.start.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const subject = `Monthly Attendance Summary - ${monthName}`;
  const html = renderMonthlyAttendanceTemplate({ schoolName: 'School', monthName, summary: data.summary, classes: data.classes });
  const text = `Attendance summary for ${monthName}:\nTotal: ${data.summary.total}\nPresent: ${data.summary.present}\nAbsent: ${data.summary.absent}\nLate: ${data.summary.late}\nExcused: ${data.summary.excused}`;
  const xlsx = await buildMonthlyAttendanceWorkbook({ schoolName: 'School', monthName, summary: data.summary, classes: data.classes });
  await sendMail({ to, subject, text, html, attachments: [{ filename: `Attendance-School-${monthName}.xlsx`, content: xlsx }] });
  console.log('Monthly statement sent to', to);
  await mongoose.connection.close();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  try { await mongoose.connection.close(); } catch {}
  process.exit(1);
});



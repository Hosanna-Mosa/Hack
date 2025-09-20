const cron = require('node-cron');
const AttendanceRecord = require('../models/AttendanceRecord');
const School = require('../models/School');
const User = require('../models/User');
const { sendMail } = require('../utils/mailer');
const { renderMonthlyAttendanceTemplate } = require('../utils/emailTemplates');
const { buildMonthlyAttendanceWorkbook } = require('../utils/xlsx');

function isLastDayOfMonth(date) {
  const test = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return test.getDate() === 1;
}

function formatMonthRange(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

async function aggregateMonthlyAttendancePerSchool(targetDate = new Date()) {
  const { start, end } = formatMonthRange(targetDate);
  const pipeline = [
    { $match: { date: { $gte: start, $lte: end } } },
    {
      $lookup: {
        from: 'classes',
        localField: 'classId',
        foreignField: '_id',
        as: 'cls'
      }
    },
    { $unwind: '$cls' },
    {
      $group: {
        _id: { schoolId: '$cls.schoolId', classId: '$cls._id', className: '$cls.name', status: '$status' },
        count: { $sum: 1 }
      }
    }
  ];
  const rows = await AttendanceRecord.aggregate(pipeline);
  const bySchool = new Map();
  const classesBySchool = new Map();
  for (const row of rows) {
    const schoolId = String(row._id.schoolId);
    const classId = String(row._id.classId);
    const className = row._id.className;
    const status = row._id.status;
    if (!bySchool.has(schoolId)) bySchool.set(schoolId, { present: 0, absent: 0, late: 0, excused: 0, total: 0 });
    const summary = bySchool.get(schoolId);
    summary[status] = (summary[status] || 0) + row.count;
    summary.total += row.count;
    if (!classesBySchool.has(schoolId)) classesBySchool.set(schoolId, new Map());
    const byClass = classesBySchool.get(schoolId);
    if (!byClass.has(classId)) byClass.set(classId, { name: className, present: 0, absent: 0, late: 0, excused: 0, total: 0, students: [] });
    const csum = byClass.get(classId);
    csum[status] = (csum[status] || 0) + row.count;
    csum.total += row.count;
  }
  // Add per-student breakdown
  const studentPipeline = [
    { $match: { date: { $gte: start, $lte: end } } },
    { $lookup: { from: 'classes', localField: 'classId', foreignField: '_id', as: 'cls' } },
    { $unwind: '$cls' },
    { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'stu' } },
    { $unwind: { path: '$stu', preserveNullAndEmptyArrays: true } },
    { $group: { _id: { schoolId: '$cls.schoolId', classId: '$cls._id', studentMongoId: '$studentId', studentCode: '$stu.studentId', studentName: '$stu.name', status: '$status' }, count: { $sum: 1 } } }
  ];
  const sRows = await AttendanceRecord.aggregate(studentPipeline);
  for (const row of sRows) {
    const schoolId = String(row._id.schoolId);
    const classId = String(row._id.classId);
    const studentMongoId = String(row._id.studentMongoId || 'unknown');
    const studentCode = row._id.studentCode || '';
    const studentName = row._id.studentName || 'Unknown';
    const status = row._id.status;
    const byClass = classesBySchool.get(schoolId);
    if (!byClass) continue;
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
  return { start, end, bySchool, classesBySchool };
}

function renderEmail({ start, end, summary, schoolName, classes }) {
  const monthName = start.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const subject = `Monthly Attendance Summary - ${schoolName} - ${monthName}`;
  const html = renderMonthlyAttendanceTemplate({ schoolName, monthName, summary, classes });
  const text = `Attendance summary for ${schoolName} - ${monthName}:\n` +
    `Total: ${summary.total}\nPresent: ${summary.present}\nAbsent: ${summary.absent}\nLate: ${summary.late}\nExcused: ${summary.excused}`;
  return { subject, text, html };
}

async function getSchoolAdminEmails(schoolId) {
  const school = await School.findById(schoolId).select('adminIds contactInfo name');
  if (!school) return [];
  const admins = school.adminIds && school.adminIds.length
    ? await User.find({ _id: { $in: school.adminIds }, isActive: true }).select('profile.contact.email')
    : [];
  const adminEmails = admins.map(a => a?.profile?.contact?.email).filter(Boolean);
  const schoolEmails = Array.isArray(school.contactInfo?.email) ? school.contactInfo.email.filter(Boolean) : [];
  const emails = [...adminEmails, ...schoolEmails];
  const unique = emails.filter((v, i, arr) => arr.indexOf(v) === i);
  return unique;
}

async function sendMonthlyEmail(now = new Date()) {
  const { start, end, bySchool, classesBySchool } = await aggregateMonthlyAttendancePerSchool(now);
  const schoolIds = Array.from(bySchool.keys());
  if (schoolIds.length === 0) return; // nothing to send
  const schools = await School.find({ _id: { $in: schoolIds } }).select('name');
  const schoolNameById = new Map(schools.map(s => [String(s._id), s.name]));
  for (const schoolId of schoolIds) {
    const recipients = await getSchoolAdminEmails(schoolId);
    if (!recipients.length) continue;
    const summary = bySchool.get(schoolId) || { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    const classesMap = classesBySchool.get(schoolId) || new Map();
    const classes = Array.from(classesMap.values());
    const schoolName = schoolNameById.get(schoolId) || 'School';
    const { subject, text, html } = renderEmail({ start, end, summary, schoolName, classes });
    const monthName = start.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const xlsx = await buildMonthlyAttendanceWorkbook({ schoolName, monthName, summary, classes });
    const attachments = [{ filename: `Attendance-${schoolName}-${monthName}.xlsx`, content: xlsx }];
    await Promise.all(recipients.map(to => sendMail({ to, subject, text, html, attachments })));
  }
}

function registerMonthlyAttendanceEmailJob() {
  // Run daily at 23:59 server time; only send on last day of month
  cron.schedule('59 23 * * *', async () => {
    try {
      const now = new Date();
      if (isLastDayOfMonth(now)) {
        await sendMonthlyEmail(now);
        if (process.env.NODE_ENV !== 'test') console.log('Monthly attendance email sent');
      }
    } catch (err) {
      console.error('Failed to send monthly attendance email:', err.message);
    }
  });
}

module.exports = { registerMonthlyAttendanceEmailJob, sendMonthlyEmail };



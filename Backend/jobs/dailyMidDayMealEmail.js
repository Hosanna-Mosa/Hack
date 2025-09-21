const cron = require('node-cron');
const AttendanceRecord = require('../models/AttendanceRecord');
const School = require('../models/School');
const User = require('../models/User');
const { sendMail } = require('../utils/mailer');
const { renderDailyMidDayMealTemplate } = require('../utils/emailTemplates');
const { buildDailyMidDayMealWorkbook } = require('../utils/xlsx');

function formatDayRange(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const start = new Date(year, month, day, 0, 0, 0, 0);
  const end = new Date(year, month, day, 23, 59, 59, 999);
  return { start, end };
}

async function aggregateDailyMidDayMealPerSchool(targetDate = new Date()) {
  const { start, end } = formatDayRange(targetDate);
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
    
    if (!bySchool.has(schoolId)) {
      bySchool.set(schoolId, { present: 0, absent: 0, late: 0, excused: 0, total: 0 });
    }
    const summary = bySchool.get(schoolId);
    summary[status] = (summary[status] || 0) + row.count;
    summary.total += row.count;
    
    if (!classesBySchool.has(schoolId)) classesBySchool.set(schoolId, new Map());
    const byClass = classesBySchool.get(schoolId);
    if (!byClass.has(classId)) {
      byClass.set(classId, { 
        name: className, 
        present: 0, 
        absent: 0, 
        late: 0, 
        excused: 0, 
        total: 0, 
        students: [],
        midDayMealCount: 0 // Students eligible for mid-day meal (present + late)
      });
    }
    const csum = byClass.get(classId);
    csum[status] = (csum[status] || 0) + row.count;
    csum.total += row.count;
    
    // Count students eligible for mid-day meal (present + late)
    if (status === 'present' || status === 'late') {
      csum.midDayMealCount += row.count;
    }
  }
  
  // Add per-student breakdown
  const studentPipeline = [
    { $match: { date: { $gte: start, $lte: end } } },
    { $lookup: { from: 'classes', localField: 'classId', foreignField: '_id', as: 'cls' } },
    { $unwind: '$cls' },
    { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'stu' } },
    { $unwind: { path: '$stu', preserveNullAndEmptyArrays: true } },
    { $group: { 
      _id: { 
        schoolId: '$cls.schoolId', 
        classId: '$cls._id', 
        studentMongoId: '$studentId', 
        studentCode: '$stu.studentId', 
        studentName: '$stu.name', 
        status: '$status' 
      }, 
      count: { $sum: 1 } 
    } }
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
      stu = { 
        id: studentMongoId, 
        code: studentCode, 
        name: studentName, 
        present: 0, 
        absent: 0, 
        late: 0, 
        excused: 0, 
        total: 0,
        midDayMealEligible: false
      };
      c.students.push(stu);
    }
    stu[status] = (stu[status] || 0) + row.count;
    stu.total += row.count;
    
    // Mark student as eligible for mid-day meal if present or late
    if (status === 'present' || status === 'late') {
      stu.midDayMealEligible = true;
    }
  }
  
  return { start, end, bySchool, classesBySchool };
}

function renderEmail({ start, end, summary, schoolName, classes }) {
  const dateStr = start.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const subject = `Daily Mid-Day Meal Report - ${schoolName} - ${dateStr}`;
  const html = renderDailyMidDayMealTemplate({ schoolName, dateStr, summary, classes });
  const text = `Daily Mid-Day Meal Report for ${schoolName} - ${dateStr}:\n` +
    `Total Students: ${summary.total}\n` +
    `Present: ${summary.present}\n` +
    `Late: ${summary.late}\n` +
    `Mid-Day Meal Eligible: ${summary.present + summary.late}\n` +
    `Absent: ${summary.absent}\n` +
    `Excused: ${summary.excused}`;
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

async function sendDailyMidDayMealEmail(now = new Date()) {
  const { start, end, bySchool, classesBySchool } = await aggregateDailyMidDayMealPerSchool(now);
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
    
    // Calculate mid-day meal eligible count
    const midDayMealEligible = summary.present + summary.late;
    const enhancedSummary = { ...summary, midDayMealEligible };
    
    const { subject, text, html } = renderEmail({ start, end, summary: enhancedSummary, schoolName, classes });
    const dateStr = start.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const xlsx = await buildDailyMidDayMealWorkbook({ schoolName, dateStr, summary: enhancedSummary, classes });
    const attachments = [{ filename: `MidDayMeal-${schoolName}-${dateStr.replace(/[^a-zA-Z0-9]/g, '-')}.xlsx`, content: xlsx }];
    
    await Promise.all(recipients.map(to => sendMail({ to, subject, text, html, attachments })));
  }
}

function registerDailyMidDayMealEmailJob() {
  // Run daily at 10:00 AM server time
  cron.schedule('0 10 * * *', async () => {
    try {
      const now = new Date();
      await sendDailyMidDayMealEmail(now);
      if (process.env.NODE_ENV !== 'test') console.log('Daily mid-day meal email sent');
    } catch (err) {
      console.error('Failed to send daily mid-day meal email:', err.message);
    }
  });
}

module.exports = { registerDailyMidDayMealEmailJob, sendDailyMidDayMealEmail };

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const { sendMail } = require('../utils/mailer');
const User = require('../models/User');
const { renderDailyMidDayMealTemplate } = require('../utils/emailTemplates');
const { buildDailyMidDayMealWorkbook } = require('../utils/xlsx');
const AttendanceRecord = require('../models/AttendanceRecord');

function formatDayRange(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const start = new Date(year, month, day, 0, 0, 0, 0);
  const end = new Date(year, month, day, 23, 59, 59, 999);
  return { start, end };
}

async function aggregateDailyMidDayMeal(targetDate = new Date()) {
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
        _id: { classId: '$cls._id', className: '$cls.name', status: '$status' },
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
    if (!byClass.has(cid)) {
      byClass.set(cid, { 
        name: cname, 
        present: 0, 
        absent: 0, 
        late: 0, 
        excused: 0, 
        total: 0, 
        students: [],
        midDayMealCount: 0
      });
    }
    const csum = byClass.get(cid);
    csum[status] = (csum[status] || 0) + row.count;
    csum.total += row.count;
    
    // Count students eligible for mid-day meal (present + late)
    if (status === 'present' || status === 'late') {
      csum.midDayMealCount += row.count;
    }
  }
  
  // Per-student breakdown within each class
  const studentPipeline = [
    { $match: { date: { $gte: start, $lte: end } } },
    { $lookup: { from: 'classes', localField: 'classId', foreignField: '_id', as: 'cls' } },
    { $unwind: '$cls' },
    { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'stu' } },
    { $unwind: { path: '$stu', preserveNullAndEmptyArrays: true } },
    { $group: { 
      _id: { 
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
    const classId = String(row._id.classId);
    const studentMongoId = String(row._id.studentMongoId || 'unknown');
    const studentCode = row._id.studentCode || '';
    const studentName = row._id.studentName || 'Unknown';
    const status = row._id.status;
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
  
  const classes = Array.from(byClass.values());
  const midDayMealEligible = summary.present + summary.late;
  const enhancedSummary = { ...summary, midDayMealEligible };
  
  return { start, end, summary: enhancedSummary, classes };
}

function renderEmail({ start, end, summary }) {
  const dateStr = start.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const subject = `Daily Mid-Day Meal Report - ${dateStr}`;
  const lines = [
    `Daily Mid-Day Meal Report for ${dateStr}:`,
    `Total Students: ${summary.total}`,
    `Present: ${summary.present}`,
    `Late: ${summary.late}`,
    `Mid-Day Meal Eligible: ${summary.midDayMealEligible}`,
    `Absent: ${summary.absent}`,
    `Excused: ${summary.excused}`
  ];
  const text = lines.join('\n');
  const html = renderDailyMidDayMealTemplate({ schoolName: 'School', dateStr, summary, classes: [] });
  return { subject, text, html };
}

async function main() {
  const adminId = process.argv[2];
  if (!adminId) throw new Error('Usage: node scripts/send-daily-midday-meal.js <adminId>');

  await connectDB();
  const admin = await User.findOne({ _id: adminId, role: 'admin', isActive: true }).select('profile.contact.email');
  if (!admin) throw new Error('Admin not found or inactive');
  const to = admin.profile?.contact?.email;
  if (!to) throw new Error('Admin has no email');

  const data = await aggregateDailyMidDayMeal(new Date());
  const dateStr = data.start.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const subject = `Daily Mid-Day Meal Report - ${dateStr}`;
  const html = renderDailyMidDayMealTemplate({ schoolName: 'School', dateStr, summary: data.summary, classes: data.classes });
  const text = `Daily Mid-Day Meal Report for ${dateStr}:\n` +
    `Total Students: ${data.summary.total}\n` +
    `Present: ${data.summary.present}\n` +
    `Late: ${data.summary.late}\n` +
    `Mid-Day Meal Eligible: ${data.summary.midDayMealEligible}\n` +
    `Absent: ${data.summary.absent}\n` +
    `Excused: ${data.summary.excused}`;
  const xlsx = await buildDailyMidDayMealWorkbook({ schoolName: 'School', dateStr, summary: data.summary, classes: data.classes });
  await sendMail({ 
    to, 
    subject, 
    text, 
    html, 
    attachments: [{ 
      filename: `MidDayMeal-School-${dateStr.replace(/[^a-zA-Z0-9]/g, '-')}.xlsx`, 
      content: xlsx 
    }] 
  });
  console.log('Daily mid-day meal report sent to', to);
  await mongoose.connection.close();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  try { await mongoose.connection.close(); } catch {}
  process.exit(1);
});

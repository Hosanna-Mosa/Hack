// Check student IDs in the database
require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./models/Student');
const Parent = require('./models/Parent');

async function checkStudentIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all students
    const students = await Student.find({}).select('_id name studentId classId');
    console.log('\n📚 All Students:');
    students.forEach(student => {
      console.log(`ID: ${student._id}, Name: ${student.name}, StudentId: ${student.studentId}`);
    });

    // Get all parents
    const parents = await Parent.find({}).select('_id name mobile studentIds');
    console.log('\n👨‍👩‍👧‍👦 All Parents:');
    parents.forEach(parent => {
      console.log(`ID: ${parent._id}, Name: ${parent.name}, Mobile: ${parent.mobile}`);
      console.log(`  Student IDs: ${parent.studentIds}`);
    });

    // Get attendance records
    const AttendanceRecord = require('./models/AttendanceRecord');
    const attendanceRecords = await AttendanceRecord.find({}).select('_id studentId date status');
    console.log('\n📅 Attendance Records:');
    attendanceRecords.forEach(record => {
      console.log(`Student ID: ${record.studentId}, Date: ${record.date}, Status: ${record.status}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkStudentIds();

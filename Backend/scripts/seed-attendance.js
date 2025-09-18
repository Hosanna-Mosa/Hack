const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const connectDB = require('../config/database');
const AttendanceRecord = require('../models/AttendanceRecord');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const User = require('../models/User');

async function createSampleAttendanceData() {
  try {
    await connectDB();
    
    // Find a student and parent
    const student = await Student.findOne().lean();
    if (!student) {
      console.log('❌ No students found. Please create a student first using seed-parent.js');
      return;
    }
    
    console.log(`✓ Found student: ${student.name} (${student.studentId})`);
    
    // Find a teacher to mark attendance
    const teacher = await User.findOne({ role: 'teacher' }).lean();
    if (!teacher) {
      console.log('❌ No teachers found. Please create a teacher first using seed-teachers.js');
      return;
    }
    
    console.log(`✓ Found teacher: ${teacher.profile.name}`);
    
    // Create sample attendance records for the last 10 days
    const today = new Date();
    const attendanceRecords = [];
    
    for (let i = 0; i < 10; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) {
        continue;
      }
      
      // Random attendance status
      const statuses = ['present', 'present', 'present', 'late', 'absent'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      const record = {
        date: date,
        studentId: student._id,
        classId: student.classId || new (require('mongoose').Types.ObjectId)(), // Use student's class or create a dummy one
        status: status,
        markedBy: teacher._id,
        method: 'manual',
        synced: true,
        timestamp: new Date(),
        notes: status === 'late' ? 'Traffic delay' : status === 'absent' ? 'Sick' : undefined
      };
      
      attendanceRecords.push(record);
    }
    
    // Insert attendance records
    const insertedRecords = await AttendanceRecord.insertMany(attendanceRecords);
    console.log(`✓ Created ${insertedRecords.length} attendance records`);
    
    // Calculate and display stats
    const totalDays = insertedRecords.length;
    const presentDays = insertedRecords.filter(r => r.status === 'present').length;
    const absentDays = insertedRecords.filter(r => r.status === 'absent').length;
    const lateDays = insertedRecords.filter(r => r.status === 'late').length;
    const attendanceRate = totalDays > 0 ? ((presentDays + lateDays) / totalDays * 100).toFixed(1) : 0;
    
    console.log('\n📊 Sample Attendance Statistics:');
    console.log(`Total Days: ${totalDays}`);
    console.log(`Present: ${presentDays}`);
    console.log(`Absent: ${absentDays}`);
    console.log(`Late: ${lateDays}`);
    console.log(`Attendance Rate: ${attendanceRate}%`);
    
    console.log('\n✅ Sample attendance data created successfully!');
    console.log(`Student: ${student.name} (${student.studentId})`);
    console.log('You can now test the parent portal to see the attendance data.');
    
  } catch (error) {
    console.error('❌ Error creating sample attendance data:', error.message);
  } finally {
    const mongoose = require('mongoose');
    await mongoose.connection.close().catch(() => {});
  }
}

// Run the script
createSampleAttendanceData();

const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const connectDB = require('../config/database');
const Parent = require('../models/Parent');
const Student = require('../models/Student');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const part = argv[i];
    if (part.startsWith('--')) {
      const [key, ...rest] = part.replace(/^--/, '').split('=');
      const value = rest.length ? rest.join('=') : argv[i + 1];
      if (!rest.length) i++;
      args[key] = value;
    }
  }
  return args;
}

async function ensureStudent(studentId) {
  if (studentId) {
    const exists = await Student.findById(studentId).lean();
    if (exists) return exists._id;
    console.warn(`Provided studentId ${studentId} not found. A new student will be created.`);
  }

  // Create a minimal student record
  const now = new Date();
  const admissionNumber = `ADM-${now.getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const studentIdStr = `STU-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  const student = await Student.create({
    studentId: studentIdStr,
    name: 'Demo Student',
    dateOfBirth: new Date(now.getFullYear() - 10, 0, 1),
    academicInfo: {
      admissionDate: now,
      admissionNumber,
    },
  });
  console.log(`✓ Created student: ${student.name} (${student.studentId}) _id=${student._id}`);
  return student._id;
}

async function main() {
  const args = parseArgs(process.argv);
  const mobile = args.mobile || args.phone || args.m;
  const password = args.password || args.pass || args.p || 'parent123';
  const name = args.name || 'Demo Parent';
  const email = args.email || undefined;
  const studentId = args.studentId || args.sid || undefined;

  if (!mobile) {
    console.error('Usage: node scripts/seed-parent.js --mobile "+919999999999" [--password "pass123"] [--name "Parent Name"] [--email a@b.com] [--studentId <id>]');
    process.exit(1);
  }

  await connectDB();

  try {
    // Validate uniqueness by mobile
    const existing = await Parent.findOne({ mobile }).lean();
    if (existing) {
      console.log('Parent already exists with this mobile. Skipping create.');
      console.log({ parentId: existing._id, mobile: existing.mobile });
      process.exit(0);
    }

    const sid = await ensureStudent(studentId);

    const parent = await Parent.create({
      name,
      email,
      mobile,
      password,
      isDefaultPassword: true,
      studentIds: [sid],
    });

    console.log('✓ Parent created');
    console.log({
      parentId: parent._id.toString(),
      mobile: parent.mobile,
      password,
      linkedStudentId: sid.toString(),
    });
  } catch (err) {
    console.error('Failed to seed parent:', err.message || err);
    process.exitCode = 1;
  } finally {
    const mongoose = require('mongoose');
    await mongoose.connection.close().catch(() => {});
  }
}

main();



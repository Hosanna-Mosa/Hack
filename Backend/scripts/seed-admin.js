const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const connectDB = require('../config/database');
const User = require('../models/User');
const School = require('../models/School');
const bcrypt = require('bcryptjs');

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

async function ensureSchool(maybeName, schoolArgs) {
  if (!maybeName) return null;
  const name = String(maybeName).trim();
  const existing = await School.findOne({ name: new RegExp(`^${name}$`, 'i') }).lean();
  if (existing) return existing._id;

  const school = await School.create({
    name,
    address: {
      street: schoolArgs.street || '',
      city: schoolArgs.city || 'City',
      state: schoolArgs.state || 'State',
      zipCode: schoolArgs.zip || schoolArgs.zipCode || '',
      country: schoolArgs.country || 'India'
    },
    contactInfo: {
      phone: schoolArgs.phone ? [schoolArgs.phone] : [],
      email: schoolArgs.email ? [schoolArgs.email] : [],
      website: schoolArgs.website || undefined
    },
    adminIds: [],
  });
  console.log(`✓ Created school '${school.name}' (_id=${school._id})`);
  return school._id;
}

async function main() {
  const args = parseArgs(process.argv);
  const email = (args.email || args.username || 'admin@school.edu').toLowerCase();
  const password = args.password || 'admin123';
  const name = args.name || 'System Admin';
  const schoolName = args.school || args.schoolName || '';

  await connectDB();

  try {
    const existing = await User.findOne({ username: email }).lean();
    if (existing) {
      console.log('Admin already exists. Skipping create.');
      console.log({ userId: existing._id, username: existing.username });
      process.exit(0);
    }

    const schoolId = await ensureSchool(schoolName, args);

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      username: email,
      passwordHash,
      role: 'admin',
      profile: {
        name,
        contact: { email }
      }
    });

    if (schoolId) {
      await School.updateOne({ _id: schoolId }, { $addToSet: { adminIds: user._id } });
    }

    console.log('✓ Admin created');
    console.log({
      userId: user._id.toString(),
      username: user.username,
      password,
      role: user.role,
      schoolId: schoolId ? String(schoolId) : null,
    });
  } catch (err) {
    console.error('Failed to seed admin:', err.message || err);
    process.exitCode = 1;
  } finally {
    const mongoose = require('mongoose');
    await mongoose.connection.close().catch(() => {});
  }
}

main();



const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const connectDB = require('../config/database');
const User = require('../models/User');

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

async function main() {
  const args = parseArgs(process.argv);
  const username = args.username || args.email || undefined;
  const role = args.role || undefined;
  const limit = Number(args.limit || 20);

  await connectDB();

  try {
    const filter = {};
    if (username) filter.username = username.toLowerCase();
    if (role) filter.role = role;

    const users = await User.find(filter).select('_id username role isActive createdAt').limit(limit).lean();
    console.log(JSON.stringify({ count: users.length, users }, null, 2));
  } catch (err) {
    console.error('Failed to list users:', err.message || err);
    process.exitCode = 1;
  } finally {
    const mongoose = require('mongoose');
    await mongoose.connection.close().catch(() => {});
  }
}

main();



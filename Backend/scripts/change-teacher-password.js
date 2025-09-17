const mongoose = require("mongoose");
require("dotenv").config();

const Teacher = require("../models/Teacher");

const connectDB = async () => {
  const mongoURI =
    process.env.MONGODB_URI ||
    "mongodb+srv://sunandvemavarapu_db_user:wqr25yDcKahqsueS@attedence.mlkqvap.mongodb.net/";
  await mongoose.connect(mongoURI);
};

const usage = () => {
  console.log("Usage:");
  console.log(
    "  node scripts/change-teacher-password.js <teacherId> <newPassword>"
  );
};

const main = async () => {
  try {
    const [, , teacherId, newPassword] = process.argv;

    if (!teacherId || !newPassword) {
      usage();
      process.exit(1);
    }

    if (newPassword.length < 6) {
      console.error("❌ New password must be at least 6 characters long");
      process.exit(1);
    }

    await connectDB();
    console.log("✅ Connected to MongoDB");

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      console.error("❌ Teacher not found:", teacherId);
      process.exit(1);
    }

    // Prefer virtual to ensure hashing via pre-save hook
    teacher.plainPassword = newPassword;
    await teacher.save();

    console.log("✅ Password updated successfully for teacher:", teacherId);
  } catch (err) {
    console.error("❌ Error updating password:", err.message || err);
    process.exit(1);
  } finally {
    try {
      await mongoose.connection.close();
      console.log("🔌 Database connection closed");
    } catch (_) {}
  }
};

if (require.main === module) {
  main();
}

module.exports = { main };


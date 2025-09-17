const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Import the Teacher model
const Teacher = require("../models/Teacher");

// Database connection
const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI ||
      "mongodb+srv://sunandvemavarapu_db_user:wqr25yDcKahqsueS@attedence.mlkqvap.mongodb.net/";
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ Database connection error:", error);
    process.exit(1);
  }
};

// Function to generate a default password
const generateDefaultPassword = (phoneNumber) => {
  // Use last 6 digits of phone number + "123" as default password
  if (!phoneNumber || phoneNumber.length < 6) {
    // Fallback to a simple password if phone number is invalid
    return "teacher123";
  }
  const lastSixDigits = phoneNumber.slice(-6);
  return `${lastSixDigits}123`;
};

// Function to add passwords to teachers
const addPasswordsToTeachers = async () => {
  try {
    console.log("🔍 Finding teachers without passwords...");

    // Find all teachers that don't have a password field or have empty password
    const teachersWithoutPasswords = await Teacher.find({
      $or: [
        { password: { $exists: false } },
        { password: { $eq: "" } },
        { password: null },
      ],
    });

    console.log(
      `📊 Found ${teachersWithoutPasswords.length} teachers without passwords`
    );

    if (teachersWithoutPasswords.length === 0) {
      console.log("✅ All teachers already have passwords!");
      return;
    }

    console.log("🔐 Adding passwords to teachers...");

    let successCount = 0;
    let errorCount = 0;

    for (const teacher of teachersWithoutPasswords) {
      try {
        // Generate a default password based on phone number
        const defaultPassword = generateDefaultPassword(teacher.phoneNumber);

        // Hash the password
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);

        // Update the teacher with the hashed password
        await Teacher.findByIdAndUpdate(teacher._id, {
          password: hashedPassword,
        });

        console.log(
          `✅ Added password for teacher: ${teacher.phoneNumber} (ID: ${teacher._id})`
        );
        console.log(`   Default password: ${defaultPassword}`);
        successCount++;
      } catch (error) {
        console.error(
          `❌ Error adding password for teacher ${teacher._id}:`,
          error.message
        );
        errorCount++;
      }
    }

    console.log("\n📈 Migration Summary:");
    console.log(`✅ Successfully updated: ${successCount} teachers`);
    console.log(`❌ Errors: ${errorCount} teachers`);

    if (successCount > 0) {
      console.log(
        "\n🔑 Default Password Format: Last 6 digits of phone number + '123'"
      );
      console.log("📝 Example: If phone is +1234567890, password is 456789123");
      console.log(
        "⚠️  Please inform teachers to change their passwords after first login!"
      );
    }
  } catch (error) {
    console.error("❌ Error during password migration:", error);
  }
};

// Function to verify password addition
const verifyPasswordAddition = async () => {
  try {
    console.log("\n🔍 Verifying password addition...");

    const totalTeachers = await Teacher.countDocuments();
    const teachersWithPasswords = await Teacher.countDocuments({
      password: { $exists: true, $ne: "" },
    });

    console.log(`📊 Total teachers: ${totalTeachers}`);
    console.log(`🔐 Teachers with passwords: ${teachersWithPasswords}`);
    console.log(
      `❌ Teachers without passwords: ${totalTeachers - teachersWithPasswords}`
    );

    if (totalTeachers === teachersWithPasswords) {
      console.log("✅ All teachers now have passwords!");
    } else {
      console.log(
        "⚠️  Some teachers still don't have passwords. Please check the migration."
      );
    }
  } catch (error) {
    console.error("❌ Error during verification:", error);
  }
};

// Main execution function
const main = async () => {
  try {
    console.log("🚀 Starting Teacher Password Migration Script");
    console.log("=".repeat(50));

    await connectDB();
    await addPasswordsToTeachers();
    await verifyPasswordAddition();

    console.log("\n✅ Migration completed successfully!");
    console.log("=".repeat(50));
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  addPasswordsToTeachers,
  verifyPasswordAddition,
  generateDefaultPassword,
};

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

// Test password verification
const testPasswordVerification = async () => {
  try {
    console.log("🔍 Testing password verification...");

    // Find a teacher with a password
    const teacher = await Teacher.findOne({ password: { $exists: true } });

    if (!teacher) {
      console.log("❌ No teacher found with password");
      return;
    }

    console.log(`📋 Testing with teacher: ${teacher._id}`);
    console.log(`📞 Phone: ${teacher.phoneNumber}`);
    console.log(`🔐 Has password: ${!!teacher.password}`);

    // Test with correct password (assuming it's "teacher123" for teachers without phone)
    const testPassword = "teacher123";
    console.log(`🧪 Testing password: ${testPassword}`);

    const isMatch = await bcrypt.compare(testPassword, teacher.password);
    console.log(`✅ Password match result: ${isMatch}`);

    if (isMatch) {
      console.log("🎉 Password verification working correctly!");
    } else {
      console.log("❌ Password verification failed!");

      // Let's check what the actual password should be
      if (teacher.phoneNumber && teacher.phoneNumber.length >= 6) {
        const expectedPassword = teacher.phoneNumber.slice(-6) + "123";
        console.log(`🔍 Expected password based on phone: ${expectedPassword}`);

        const phoneMatch = await bcrypt.compare(
          expectedPassword,
          teacher.password
        );
        console.log(`📞 Phone-based password match: ${phoneMatch}`);
      }
    }
  } catch (error) {
    console.error("❌ Error testing password verification:", error);
  }
};

// Test login simulation
const testLoginSimulation = async () => {
  try {
    console.log("\n🔍 Testing login simulation...");

    // Find a teacher
    const teacher = await Teacher.findOne({
      password: { $exists: true },
    }).populate("userId", "firstName lastName email");

    if (!teacher) {
      console.log("❌ No teacher found");
      return;
    }

    console.log(
      `👤 Teacher: ${teacher.userId?.firstName} ${teacher.userId?.lastName}`
    );
    console.log(`📞 Phone: ${teacher.phoneNumber}`);

    // Simulate login with different passwords
    const testPasswords = ["teacher123", "wrongpassword"];

    for (const testPassword of testPasswords) {
      console.log(`\n🧪 Testing password: "${testPassword}"`);

      const isMatch = await bcrypt.compare(testPassword, teacher.password);
      console.log(`   Result: ${isMatch ? "✅ MATCH" : "❌ NO MATCH"}`);
    }
  } catch (error) {
    console.error("❌ Error in login simulation:", error);
  }
};

// Main execution
const main = async () => {
  try {
    console.log("🚀 Starting Teacher Login Test");
    console.log("=".repeat(40));

    await connectDB();
    await testPasswordVerification();
    await testLoginSimulation();

    console.log("\n✅ Test completed!");
    console.log("=".repeat(40));
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
};

// Run the test
if (require.main === module) {
  main();
}

module.exports = {
  testPasswordVerification,
  testLoginSimulation,
};


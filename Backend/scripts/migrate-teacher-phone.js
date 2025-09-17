#!/usr/bin/env node

/**
 * Migration script to add phone numbers to Teacher records
 * This script will:
 * 1. Find all Teacher records without phoneNumber
 * 2. Get the phone number from the associated User record
 * 3. Update the Teacher record with the phone number
 * 4. Handle cases where phone number is not available
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Teacher = require("../models/Teacher");
const User = require("../models/User");

// Database connection
const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI ||
      "mongodb+srv://sunandvemavarapu_db_user:wqr25yDcKahqsueS@attedence.mlkqvap.mongodb.net/";
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Normalize phone number (remove spaces, dashes, etc.)
const normalizePhoneNumber = (phone) => {
  if (!phone) return null;
  return phone.replace(/[\s\-\(\)]/g, "");
};

// Main migration function
const migrateTeacherPhoneNumbers = async () => {
  try {
    console.log("🚀 Starting Teacher phone number migration...\n");

    // Find all teachers without phoneNumber field or with empty phoneNumber
    const teachersWithoutPhone = await Teacher.find({
      $or: [
        { phoneNumber: { $exists: false } },
        { phoneNumber: null },
        { phoneNumber: "" },
      ],
    }).populate(
      "userId",
      "profile.contact.phone username profile.contact.email"
    );

    console.log(
      `📊 Found ${teachersWithoutPhone.length} teachers without phone numbers\n`
    );

    if (teachersWithoutPhone.length === 0) {
      console.log(
        "✅ All teachers already have phone numbers. Migration complete!"
      );
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const teacher of teachersWithoutPhone) {
      try {
        let phoneNumber = null;

        // Try to get phone number from user profile
        if (
          teacher.userId &&
          teacher.userId.profile &&
          teacher.userId.profile.contact
        ) {
          phoneNumber = teacher.userId.profile.contact.phone;
        }

        // If no phone in profile, try username (in case phone was stored as username)
        if (!phoneNumber && teacher.userId && teacher.userId.username) {
          // Check if username looks like a phone number
          const normalizedUsername = normalizePhoneNumber(
            teacher.userId.username
          );
          if (normalizedUsername && /^\d{10,15}$/.test(normalizedUsername)) {
            phoneNumber = normalizedUsername;
          }
        }

        // If still no phone, try email (in case phone was stored as email)
        if (
          !phoneNumber &&
          teacher.userId &&
          teacher.userId.profile &&
          teacher.userId.profile.contact
        ) {
          const email = teacher.userId.profile.contact.email;
          if (email) {
            const normalizedEmail = normalizePhoneNumber(email);
            if (normalizedEmail && /^\d{10,15}$/.test(normalizedEmail)) {
              phoneNumber = normalizedEmail;
            }
          }
        }

        if (phoneNumber) {
          const normalizedPhone = normalizePhoneNumber(phoneNumber);

          // Validate phone number format
          if (
            normalizedPhone &&
            /^[\+]?[1-9][\d]{0,15}$/.test(normalizedPhone)
          ) {
            // Check if this phone number is already used by another teacher
            const existingTeacher = await Teacher.findOne({
              phoneNumber: normalizedPhone,
              _id: { $ne: teacher._id },
            });

            if (existingTeacher) {
              console.log(
                `⚠️  Phone number ${normalizedPhone} already exists for another teacher. Skipping teacher ${teacher._id}`
              );
              errors.push({
                teacherId: teacher._id,
                error: `Phone number ${normalizedPhone} already exists for another teacher`,
              });
              errorCount++;
              continue;
            }

            // Update teacher with phone number
            await Teacher.findByIdAndUpdate(teacher._id, {
              phoneNumber: normalizedPhone,
            });

            console.log(
              `✅ Updated teacher ${teacher._id} with phone number: ${normalizedPhone}`
            );
            successCount++;
          } else {
            console.log(
              `⚠️  Invalid phone number format for teacher ${teacher._id}: ${phoneNumber}`
            );
            errors.push({
              teacherId: teacher._id,
              error: `Invalid phone number format: ${phoneNumber}`,
            });
            errorCount++;
          }
        } else {
          console.log(
            `⚠️  No phone number found for teacher ${teacher._id}. User: ${
              teacher.userId?.username || "Unknown"
            }`
          );
          errors.push({
            teacherId: teacher._id,
            error: "No phone number found in user profile, username, or email",
          });
          errorCount++;
        }
      } catch (error) {
        console.error(
          `❌ Error processing teacher ${teacher._id}:`,
          error.message
        );
        errors.push({
          teacherId: teacher._id,
          error: error.message,
        });
        errorCount++;
      }
    }

    // Print summary
    console.log("\n📈 Migration Summary:");
    console.log(`✅ Successfully updated: ${successCount} teachers`);
    console.log(`❌ Errors: ${errorCount} teachers`);
    console.log(`📊 Total processed: ${teachersWithoutPhone.length} teachers`);

    if (errors.length > 0) {
      console.log("\n❌ Errors details:");
      errors.forEach((error, index) => {
        console.log(`${index + 1}. Teacher ${error.teacherId}: ${error.error}`);
      });
    }

    if (errorCount > 0) {
      console.log(
        "\n💡 For teachers with errors, you may need to manually update their phone numbers."
      );
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
};

// Create sample teachers with phone numbers (for testing)
const createSampleTeachers = async () => {
  try {
    console.log("🧪 Creating sample teachers for testing...\n");

    // Check if we have any users with teacher role
    let teacherUsers = await User.find({ role: "teacher" }).limit(3);

    if (teacherUsers.length === 0) {
      console.log("⚠️  No teacher users found. Creating sample data...");

      // Create sample users
      const sampleUsers = [
        {
          username: "teacher1@school.com",
          password: "password123",
          role: "teacher",
          profile: {
            name: "John Doe",
            contact: {
              email: "teacher1@school.com",
              phone: "1234567890",
            },
          },
        },
        {
          username: "teacher2@school.com",
          password: "password123",
          role: "teacher",
          profile: {
            name: "Jane Smith",
            contact: {
              email: "teacher2@school.com",
              phone: "9876543210",
            },
          },
        },
      ];

      for (const userData of sampleUsers) {
        const user = new User(userData);
        await user.save();
        console.log(`✅ Created user: ${user.username}`);
      }
    }

    // Get or create a school
    let school = await require("../models/School").findOne();
    if (!school) {
      const School = require("../models/School");
      school = new School({
        name: "Sample School",
        address: "123 School Street",
        contactInfo: {
          email: "admin@school.com",
          phone: "555-0123",
        },
      });
      await school.save();
      console.log("✅ Created sample school");
    }

    // Create sample teachers
    teacherUsers = await User.find({ role: "teacher" });
    for (const user of teacherUsers) {
      const existingTeacher = await Teacher.findOne({ userId: user._id });
      if (!existingTeacher) {
        const teacher = new Teacher({
          userId: user._id,
          phoneNumber: user.profile.contact.phone || "1234567890",
          schoolId: school._id,
          metadata: {
            employeeId: `EMP${Date.now()}`,
            department: "Mathematics",
            subjects: ["Math", "Algebra"],
            joiningDate: new Date(),
          },
        });
        await teacher.save();
        console.log(`✅ Created teacher for user: ${user.username}`);
      }
    }
  } catch (error) {
    console.error("❌ Error creating sample teachers:", error);
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();

    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
      case "migrate":
        await migrateTeacherPhoneNumbers();
        break;
      case "sample":
        await createSampleTeachers();
        break;
      case "both":
        await createSampleTeachers();
        await migrateTeacherPhoneNumbers();
        break;
      default:
        console.log("📖 Usage:");
        console.log(
          "  node migrate-teacher-phone.js migrate  - Migrate existing teachers"
        );
        console.log(
          "  node migrate-teacher-phone.js sample   - Create sample teachers"
        );
        console.log(
          "  node migrate-teacher-phone.js both     - Create samples and migrate"
        );
        break;
    }
  } catch (error) {
    console.error("❌ Script failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n👋 Database connection closed");
    process.exit(0);
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  migrateTeacherPhoneNumbers,
  createSampleTeachers,
  normalizePhoneNumber,
};

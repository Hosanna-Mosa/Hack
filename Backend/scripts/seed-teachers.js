const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Import models
const Teacher = require("../models/Teacher");
const User = require("../models/User");
const School = require("../models/School");

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

// Sample test teachers data
const testTeachers = [
  {
    user: {
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@school.com",
      username: "johnsmith",
      role: "teacher",
      isActive: true,
    },
    teacher: {
      phoneNumber: "1234567890",
      password: "123456123", // last 6 digits + 123
      metadata: {
        qualifications: [
          {
            degree: "Master of Education",
            institution: "University of Education",
            year: 2018,
            subject: "Mathematics",
          },
        ],
        experience: {
          years: 5,
          previousSchools: ["ABC Elementary", "XYZ High School"],
        },
        subjects: ["Mathematics", "Physics"],
        department: "Science",
        employeeId: "T001",
        joiningDate: new Date("2020-01-15"),
        salary: 50000,
      },
    },
  },
  {
    user: {
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.johnson@school.com",
      username: "sarahjohnson",
      role: "teacher",
      isActive: true,
    },
    teacher: {
      phoneNumber: "1987654321",
      password: "654321123", // last 6 digits + 123
      metadata: {
        qualifications: [
          {
            degree: "Bachelor of Arts",
            institution: "Liberal Arts College",
            year: 2015,
            subject: "English Literature",
          },
        ],
        experience: {
          years: 8,
          previousSchools: ["City High School"],
        },
        subjects: ["English", "Literature"],
        department: "Language Arts",
        employeeId: "T002",
        joiningDate: new Date("2019-08-20"),
        salary: 48000,
      },
    },
  },
  {
    user: {
      firstName: "Michael",
      lastName: "Brown",
      email: "michael.brown@school.com",
      username: "michaelbrown",
      role: "teacher",
      isActive: true,
    },
    teacher: {
      phoneNumber: "1555123456",
      password: "123456123", // last 6 digits + 123
      metadata: {
        qualifications: [
          {
            degree: "Master of Science",
            institution: "Tech University",
            year: 2017,
            subject: "Computer Science",
          },
        ],
        experience: {
          years: 6,
          previousSchools: ["Tech High School"],
        },
        subjects: ["Computer Science", "Programming"],
        department: "Technology",
        employeeId: "T003",
        joiningDate: new Date("2021-02-01"),
        salary: 55000,
      },
    },
  },
  {
    user: {
      firstName: "Emily",
      lastName: "Davis",
      email: "emily.davis@school.com",
      username: "emilydavis",
      role: "teacher",
      isActive: true,
    },
    teacher: {
      phoneNumber: "1444333222",
      password: "332222123", // last 6 digits + 123
      metadata: {
        qualifications: [
          {
            degree: "Bachelor of Science",
            institution: "State University",
            year: 2016,
            subject: "Biology",
          },
        ],
        experience: {
          years: 7,
          previousSchools: ["Nature School"],
        },
        subjects: ["Biology", "Chemistry"],
        department: "Science",
        employeeId: "T004",
        joiningDate: new Date("2018-09-10"),
        salary: 47000,
      },
    },
  },
  {
    user: {
      firstName: "David",
      lastName: "Wilson",
      email: "david.wilson@school.com",
      username: "davidwilson",
      role: "teacher",
      isActive: true,
    },
    teacher: {
      phoneNumber: "+1777888999",
      password: "888999123", // last 6 digits + 123
      metadata: {
        qualifications: [
          {
            degree: "Master of Arts",
            institution: "History University",
            year: 2014,
            subject: "History",
          },
        ],
        experience: {
          years: 9,
          previousSchools: ["Heritage School", "Classic Academy"],
        },
        subjects: ["History", "Social Studies"],
        department: "Social Sciences",
        employeeId: "T005",
        joiningDate: new Date("2017-01-05"),
        salary: 52000,
      },
    },
  },
];

// Function to create or find a school
const createOrFindSchool = async () => {
  try {
    let school = await School.findOne({ name: "Test School" });

    if (!school) {
      school = new School({
        name: "Test School",
        address: {
          street: "123 Education Street",
          city: "Test City",
          state: "Test State",
          zipCode: "12345",
          country: "Test Country",
        },
        contact: {
          phone: "+1111111111",
          email: "admin@testschool.com",
        },
        principal: {
          name: "Dr. Test Principal",
          email: "principal@testschool.com",
        },
        isActive: true,
      });

      await school.save();
      console.log("✅ Created test school");
    } else {
      console.log("✅ Found existing test school");
    }

    return school;
  } catch (error) {
    console.error("❌ Error creating/finding school:", error);
    throw error;
  }
};

// Function to create test teachers
const createTestTeachers = async () => {
  try {
    console.log("🏫 Creating or finding test school...");
    const school = await createOrFindSchool();

    console.log("👥 Creating test teachers...");

    let createdCount = 0;
    let skippedCount = 0;

    for (const teacherData of testTeachers) {
      try {
        // Check if user already exists
        let user = await User.findOne({
          $or: [
            { email: teacherData.user.email },
            { username: teacherData.user.username },
          ],
        });

        if (!user) {
          // Create user
          user = new User({
            ...teacherData.user,
            passwordHash: await bcrypt.hash("password123", 12), // Default password for user
          });
          await user.save();
          console.log(`✅ Created user: ${user.firstName} ${user.lastName}`);
        } else {
          console.log(
            `⚠️  User already exists: ${user.firstName} ${user.lastName}`
          );
        }

        // Check if teacher already exists
        let teacher = await Teacher.findOne({ userId: user._id });

        if (!teacher) {
          // Hash the teacher password
          const hashedPassword = await bcrypt.hash(
            teacherData.teacher.password,
            12
          );

          // Create teacher
          teacher = new Teacher({
            userId: user._id,
            phoneNumber: teacherData.teacher.phoneNumber,
            password: hashedPassword,
            schoolId: school._id,
            metadata: teacherData.teacher.metadata,
            isActive: true,
          });

          await teacher.save();
          console.log(`✅ Created teacher: ${user.firstName} ${user.lastName}`);
          console.log(`   Phone: ${teacher.phoneNumber}`);
          console.log(`   Password: ${teacherData.teacher.password}`);
          createdCount++;
        } else {
          console.log(
            `⚠️  Teacher already exists: ${user.firstName} ${user.lastName}`
          );
          skippedCount++;
        }
      } catch (error) {
        console.error(
          `❌ Error creating teacher ${teacherData.user.firstName}:`,
          error.message
        );
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`✅ Created: ${createdCount} teachers`);
    console.log(`⚠️  Skipped: ${skippedCount} teachers`);
  } catch (error) {
    console.error("❌ Error creating test teachers:", error);
    throw error;
  }
};

// Function to display test credentials
const displayTestCredentials = async () => {
  try {
    console.log("\n🔑 Test Teacher Credentials:");
    console.log("=".repeat(50));

    const teachers = await Teacher.find({})
      .populate("userId", "firstName lastName email")
      .populate("schoolId", "name");

    teachers.forEach((teacher, index) => {
      console.log(
        `${index + 1}. ${teacher.userId?.firstName} ${teacher.userId?.lastName}`
      );
      console.log(`   Email: ${teacher.userId?.email}`);
      console.log(`   Phone: ${teacher.phoneNumber}`);
      console.log(
        `   Password: ${
          teacher.phoneNumber
            ? teacher.phoneNumber.slice(-6) + "123"
            : "teacher123"
        }`
      );
      console.log(`   School: ${teacher.schoolId?.name}`);
      console.log(`   Employee ID: ${teacher.metadata?.employeeId || "N/A"}`);
      console.log("-".repeat(30));
    });
  } catch (error) {
    console.error("❌ Error displaying credentials:", error);
  }
};

// Function to clean up test data
const cleanupTestData = async () => {
  try {
    console.log("🧹 Cleaning up test data...");

    // Find test school
    const school = await School.findOne({ name: "Test School" });

    if (school) {
      // Find all teachers in test school
      const teachers = await Teacher.find({ schoolId: school._id });
      const userIds = teachers.map((t) => t.userId);

      // Delete teachers
      await Teacher.deleteMany({ schoolId: school._id });
      console.log(`✅ Deleted ${teachers.length} teachers`);

      // Delete users
      await User.deleteMany({ _id: { $in: userIds } });
      console.log(`✅ Deleted ${userIds.length} users`);

      // Delete school
      await School.findByIdAndDelete(school._id);
      console.log("✅ Deleted test school");
    }

    console.log("✅ Cleanup completed");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  }
};

// Main execution function
const main = async () => {
  try {
    const args = process.argv.slice(2);
    const command = args[0];

    console.log("🌱 Teacher Seeding Script");
    console.log("=".repeat(40));

    await connectDB();

    switch (command) {
      case "create":
        await createTestTeachers();
        await displayTestCredentials();
        break;
      case "cleanup":
        await cleanupTestData();
        break;
      case "show":
        await displayTestCredentials();
        break;
      default:
        console.log("Usage:");
        console.log("  node seed-teachers.js create   - Create test teachers");
        console.log("  node seed-teachers.js cleanup  - Remove test data");
        console.log(
          "  node seed-teachers.js show     - Show existing teachers"
        );
        break;
    }

    console.log("\n✅ Operation completed!");
    console.log("=".repeat(40));
  } catch (error) {
    console.error("❌ Operation failed:", error);
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
  createTestTeachers,
  displayTestCredentials,
  cleanupTestData,
  testTeachers,
};

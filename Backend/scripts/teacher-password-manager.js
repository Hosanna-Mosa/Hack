const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const readline = require("readline");
require("dotenv").config();

// Import the Teacher model
const Teacher = require("../models/Teacher");

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/school-attendance", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ Database connection error:", error);
    process.exit(1);
  }
};

// Function to ask user for input
const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

// Password generation strategies
const passwordStrategies = {
  phoneBased: (phoneNumber) => {
    const lastSixDigits = phoneNumber.slice(-6);
    return `${lastSixDigits}123`;
  },
  
  random: () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  },
  
  simple: () => {
    return 'password123';
  },
  
  custom: async () => {
    return await askQuestion("Enter custom password: ");
  }
};

// Function to display menu
const displayMenu = () => {
  console.log("\n🔐 Teacher Password Manager");
  console.log("=" .repeat(40));
  console.log("1. Add passwords to teachers without passwords");
  console.log("2. Reset all teacher passwords");
  console.log("3. Update specific teacher password");
  console.log("4. List teachers without passwords");
  console.log("5. Verify password status");
  console.log("6. Export teacher credentials");
  console.log("0. Exit");
  console.log("=" .repeat(40));
};

// Function to add passwords to teachers without passwords
const addPasswordsToTeachers = async () => {
  try {
    console.log("\n🔍 Finding teachers without passwords...");
    
    const teachersWithoutPasswords = await Teacher.find({
      $or: [
        { password: { $exists: false } },
        { password: { $eq: "" } },
        { password: null }
      ]
    }).populate('userId', 'firstName lastName email');

    console.log(`📊 Found ${teachersWithoutPasswords.length} teachers without passwords`);

    if (teachersWithoutPasswords.length === 0) {
      console.log("✅ All teachers already have passwords!");
      return;
    }

    // Display teachers without passwords
    console.log("\n📋 Teachers without passwords:");
    teachersWithoutPasswords.forEach((teacher, index) => {
      console.log(`${index + 1}. ${teacher.userId?.firstName} ${teacher.userId?.lastName} (${teacher.phoneNumber})`);
    });

    console.log("\n🔑 Password generation strategies:");
    console.log("1. Phone-based (last 6 digits + '123')");
    console.log("2. Random 8-character");
    console.log("3. Simple ('password123')");
    console.log("4. Custom password");

    const strategyChoice = await askQuestion("\nChoose password strategy (1-4): ");
    const strategies = ['phoneBased', 'random', 'simple', 'custom'];
    const selectedStrategy = strategies[parseInt(strategyChoice) - 1];

    if (!selectedStrategy) {
      console.log("❌ Invalid choice!");
      return;
    }

    console.log(`\n🔐 Adding passwords using ${selectedStrategy} strategy...`);
    
    let successCount = 0;
    let errorCount = 0;
    const credentials = [];

    for (const teacher of teachersWithoutPasswords) {
      try {
        let password;
        
        if (selectedStrategy === 'phoneBased') {
          password = passwordStrategies.phoneBased(teacher.phoneNumber);
        } else if (selectedStrategy === 'random') {
          password = passwordStrategies.random();
        } else if (selectedStrategy === 'simple') {
          password = passwordStrategies.simple();
        } else if (selectedStrategy === 'custom') {
          password = await passwordStrategies.custom();
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Update the teacher with the hashed password
        await Teacher.findByIdAndUpdate(teacher._id, {
          password: hashedPassword
        });

        console.log(`✅ Added password for: ${teacher.userId?.firstName} ${teacher.userId?.lastName}`);
        credentials.push({
          name: `${teacher.userId?.firstName} ${teacher.userId?.lastName}`,
          phone: teacher.phoneNumber,
          password: password
        });
        
        successCount++;
      } catch (error) {
        console.error(`❌ Error adding password for teacher ${teacher._id}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n📈 Migration Summary:");
    console.log(`✅ Successfully updated: ${successCount} teachers`);
    console.log(`❌ Errors: ${errorCount} teachers`);

    // Display credentials if user wants to see them
    const showCredentials = await askQuestion("\nShow generated credentials? (y/n): ");
    if (showCredentials.toLowerCase() === 'y') {
      console.log("\n🔑 Generated Credentials:");
      console.log("=" .repeat(50));
      credentials.forEach(cred => {
        console.log(`Name: ${cred.name}`);
        console.log(`Phone: ${cred.phone}`);
        console.log(`Password: ${cred.password}`);
        console.log("-" .repeat(30));
      });
    }

  } catch (error) {
    console.error("❌ Error during password migration:", error);
  }
};

// Function to reset all teacher passwords
const resetAllPasswords = async () => {
  try {
    const confirm = await askQuestion("⚠️  This will reset ALL teacher passwords. Are you sure? (yes/no): ");
    if (confirm.toLowerCase() !== 'yes') {
      console.log("❌ Operation cancelled.");
      return;
    }

    console.log("\n🔍 Finding all teachers...");
    const allTeachers = await Teacher.find().populate('userId', 'firstName lastName');
    
    console.log(`📊 Found ${allTeachers.length} teachers`);

    const strategyChoice = await askQuestion("\nChoose password strategy (1-4): ");
    const strategies = ['phoneBased', 'random', 'simple', 'custom'];
    const selectedStrategy = strategies[parseInt(strategyChoice) - 1];

    if (!selectedStrategy) {
      console.log("❌ Invalid choice!");
      return;
    }

    console.log(`\n🔐 Resetting passwords using ${selectedStrategy} strategy...`);
    
    let successCount = 0;
    let errorCount = 0;

    for (const teacher of allTeachers) {
      try {
        let password;
        
        if (selectedStrategy === 'phoneBased') {
          password = passwordStrategies.phoneBased(teacher.phoneNumber);
        } else if (selectedStrategy === 'random') {
          password = passwordStrategies.random();
        } else if (selectedStrategy === 'simple') {
          password = passwordStrategies.simple();
        } else if (selectedStrategy === 'custom') {
          password = await passwordStrategies.custom();
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        
        await Teacher.findByIdAndUpdate(teacher._id, {
          password: hashedPassword
        });

        console.log(`✅ Reset password for: ${teacher.userId?.firstName} ${teacher.userId?.lastName}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error resetting password for teacher ${teacher._id}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n📈 Reset Summary:");
    console.log(`✅ Successfully reset: ${successCount} teachers`);
    console.log(`❌ Errors: ${errorCount} teachers`);

  } catch (error) {
    console.error("❌ Error during password reset:", error);
  }
};

// Function to update specific teacher password
const updateSpecificTeacher = async () => {
  try {
    const phoneNumber = await askQuestion("Enter teacher phone number: ");
    
    const teacher = await Teacher.findOne({ phoneNumber }).populate('userId', 'firstName lastName');
    
    if (!teacher) {
      console.log("❌ Teacher not found!");
      return;
    }

    console.log(`\n📋 Found teacher: ${teacher.userId?.firstName} ${teacher.userId?.lastName}`);
    
    const newPassword = await askQuestion("Enter new password: ");
    const confirmPassword = await askQuestion("Confirm password: ");
    
    if (newPassword !== confirmPassword) {
      console.log("❌ Passwords don't match!");
      return;
    }

    if (newPassword.length < 6) {
      console.log("❌ Password must be at least 6 characters long!");
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await Teacher.findByIdAndUpdate(teacher._id, {
      password: hashedPassword
    });

    console.log("✅ Password updated successfully!");

  } catch (error) {
    console.error("❌ Error updating password:", error);
  }
};

// Function to list teachers without passwords
const listTeachersWithoutPasswords = async () => {
  try {
    console.log("\n🔍 Finding teachers without passwords...");
    
    const teachersWithoutPasswords = await Teacher.find({
      $or: [
        { password: { $exists: false } },
        { password: { $eq: "" } },
        { password: null }
      ]
    }).populate('userId', 'firstName lastName email');

    console.log(`\n📊 Found ${teachersWithoutPasswords.length} teachers without passwords:`);
    console.log("=" .repeat(60));
    
    teachersWithoutPasswords.forEach((teacher, index) => {
      console.log(`${index + 1}. ${teacher.userId?.firstName} ${teacher.userId?.lastName}`);
      console.log(`   Phone: ${teacher.phoneNumber}`);
      console.log(`   Email: ${teacher.userId?.email || 'N/A'}`);
      console.log(`   ID: ${teacher._id}`);
      console.log("-" .repeat(40));
    });

  } catch (error) {
    console.error("❌ Error listing teachers:", error);
  }
};

// Function to verify password status
const verifyPasswordStatus = async () => {
  try {
    console.log("\n🔍 Verifying password status...");
    
    const totalTeachers = await Teacher.countDocuments();
    const teachersWithPasswords = await Teacher.countDocuments({
      password: { $exists: true, $ne: "" }
    });

    console.log("\n📊 Password Status Summary:");
    console.log("=" .repeat(30));
    console.log(`Total teachers: ${totalTeachers}`);
    console.log(`Teachers with passwords: ${teachersWithPasswords}`);
    console.log(`Teachers without passwords: ${totalTeachers - teachersWithPasswords}`);
    
    const percentage = totalTeachers > 0 ? ((teachersWithPasswords / totalTeachers) * 100).toFixed(1) : 0;
    console.log(`Password coverage: ${percentage}%`);

    if (totalTeachers === teachersWithPasswords) {
      console.log("\n✅ All teachers have passwords!");
    } else {
      console.log("\n⚠️  Some teachers still need passwords.");
    }

  } catch (error) {
    console.error("❌ Error during verification:", error);
  }
};

// Main menu loop
const main = async () => {
  try {
    await connectDB();
    
    while (true) {
      displayMenu();
      const choice = await askQuestion("\nEnter your choice (0-6): ");
      
      switch (choice) {
        case '1':
          await addPasswordsToTeachers();
          break;
        case '2':
          await resetAllPasswords();
          break;
        case '3':
          await updateSpecificTeacher();
          break;
        case '4':
          await listTeachersWithoutPasswords();
          break;
        case '5':
          await verifyPasswordStatus();
          break;
        case '6':
          console.log("📤 Export functionality coming soon!");
          break;
        case '0':
          console.log("👋 Goodbye!");
          rl.close();
          await mongoose.connection.close();
          process.exit(0);
        default:
          console.log("❌ Invalid choice! Please try again.");
      }
      
      await askQuestion("\nPress Enter to continue...");
    }
  } catch (error) {
    console.error("❌ Application error:", error);
  } finally {
    rl.close();
    await mongoose.connection.close();
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
  resetAllPasswords,
  updateSpecificTeacher,
  listTeachersWithoutPasswords,
  verifyPasswordStatus
};


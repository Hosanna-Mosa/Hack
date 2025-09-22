const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://sunandvemavarapu_db_user:wqr25yDcKahqsueS@attedence.mlkqvap.mongodb.net/" || 'mongodb://localhost:27017/your-database-name', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Function to update parent passwords
const updateParentPasswords = async () => {
  try {
    console.log('Starting password update process...');
    
    // Find all parents with default passwords
    const parentsWithDefaultPasswords = await Parent.find({ 
      isDefaultPassword: true,
      isActive: true 
    });
    
    console.log(`Found ${parentsWithDefaultPasswords.length} parents with default passwords`);
    
    if (parentsWithDefaultPasswords.length === 0) {
      console.log('No parents found with default passwords');
      return;
    }
    
    // Function to generate a unique password for each parent
    const generateUniquePassword = (parentName, mobile) => {
      // Create a unique password based on parent's name and mobile
      const namePart = parentName.replace(/\s+/g, '').toLowerCase().substring(0, 4);
      const mobilePart = mobile.slice(-4); // Last 4 digits of mobile
      const randomPart = Math.random().toString(36).substring(2, 6); // Random 4 characters
      return `${namePart}${mobilePart}${randomPart}@123`;
    };
    
    console.log('Generating unique passwords for each parent...');
    
    // Update each parent with a unique password
    let updatedCount = 0;
    const passwordLog = []; // To log the passwords for reference
    
    for (const parent of parentsWithDefaultPasswords) {
      try {
        // Generate unique password for this parent
        const newPassword = generateUniquePassword(parent.name, parent.mobile);
        
        // Hash the new password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // Update the parent with new password and set isDefaultPassword to false
        await Parent.findByIdAndUpdate(
          parent._id,
          {
            password: hashedPassword,
            isDefaultPassword: false
          },
          { new: true }
        );
        
        updatedCount++;
        passwordLog.push({
          name: parent.name,
          mobile: parent.mobile,
          newPassword: newPassword
        });
        
        console.log(`Updated parent: ${parent.name} (${parent.mobile}) - New password: ${newPassword}`);
        
      } catch (error) {
        console.error(`Error updating parent ${parent.name}:`, error.message);
      }
    }
    
    console.log(`\nPassword update completed successfully!`);
    console.log(`Total parents updated: ${updatedCount}`);
    console.log('Each parent now has a unique password');
    console.log('All updated parents now have isDefaultPassword: false');
    
    // Display password summary
    console.log('\n=== PASSWORD SUMMARY ===');
    passwordLog.forEach((log, index) => {
      console.log(`${index + 1}. ${log.name} (${log.mobile}) - Password: ${log.newPassword}`);
    });
    console.log('========================');
    
  } catch (error) {
    console.error('Error during password update process:', error);
  }
};

// Function to verify the updates
const verifyUpdates = async () => {
  try {
    console.log('\nVerifying updates...');
    
    const parentsWithDefaultPasswords = await Parent.countDocuments({ 
      isDefaultPassword: true,
      isActive: true 
    });
    
    const totalActiveParents = await Parent.countDocuments({ isActive: true });
    
    console.log(`Parents still with default passwords: ${parentsWithDefaultPasswords}`);
    console.log(`Total active parents: ${totalActiveParents}`);
    
    if (parentsWithDefaultPasswords === 0) {
      console.log('✅ All parents have been updated successfully!');
    } else {
      console.log('⚠️  Some parents still have default passwords');
    }
    
  } catch (error) {
    console.error('Error during verification:', error);
  }
};

// Main execution function
const main = async () => {
  try {
    await connectDB();
    await updateParentPasswords();
    await verifyUpdates();
  } catch (error) {
    console.error('Script execution failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
};

// Run the script
if (require.main === module) {
  console.log('Parent Password Update Script');
  console.log('============================');
  main();
}

module.exports = {
  updateParentPasswords,
  verifyUpdates,
  connectDB
};

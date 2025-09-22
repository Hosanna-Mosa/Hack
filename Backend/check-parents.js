const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = "mongodb+srv://sunandvemavarapu_db_user:wqr25yDcKahqsueS@attedence.mlkqvap.mongodb.net/";

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Parent = require('./Backend/models/Parent');
const Student = require('./Backend/models/Student');

async function checkParents() {
  try {
    console.log('=== CHECKING PARENTS ===');
    const parents = await Parent.find({}).select('name mobile phoneNumber');
    console.log(`Found ${parents.length} parents:`);
    parents.forEach((parent, index) => {
      console.log(`${index + 1}. Name: ${parent.name}, Mobile: ${parent.mobile || parent.phoneNumber}`);
    });

    console.log('\n=== CHECKING STUDENTS ===');
    const students = await Student.find({}).select('name studentId parentId');
    console.log(`Found ${students.length} students:`);
    students.forEach((student, index) => {
      console.log(`${index + 1}. Name: ${student.name}, Student ID: ${student.studentId}, Parent ID: ${student.parentId}`);
    });

    // Find the specific student we're testing
    const targetStudent = await Student.findById('68ca81f24ef9f0af1ca33d56');
    if (targetStudent) {
      console.log('\n=== TARGET STUDENT ===');
      console.log('Name:', targetStudent.name);
      console.log('Student ID:', targetStudent.studentId);
      console.log('Parent ID:', targetStudent.parentId);
      
      // Find the parent of this student
      const parent = await Parent.findById(targetStudent.parentId);
      if (parent) {
        console.log('\n=== TARGET STUDENT PARENT ===');
        console.log('Name:', parent.name);
        console.log('Mobile:', parent.mobile || parent.phoneNumber);
        console.log('Password:', parent.password ? 'Set' : 'Not set');
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

checkParents();

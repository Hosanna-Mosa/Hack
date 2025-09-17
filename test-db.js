const mongoose = require('mongoose');

async function testDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/SIH');
    console.log('Connected to MongoDB');
    
    const Parent = require('./models/Parent');
    
    // Test finding parent
    const parent = await Parent.findOne({ mobile: '8956239856' });
    console.log('Parent found:', !!parent);
    if (parent) {
      console.log('Parent details:', {
        id: parent._id,
        name: parent.name,
        mobile: parent.mobile,
        isActive: parent.isActive,
        password: parent.password.substring(0, 10) + '...'
      });
      
      // Test password comparison
      const isMatch = await parent.comparePassword('parent123');
      console.log('Password match:', isMatch);
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDB();

const mongoose = require('mongoose');

// Prefer env var, fallback to current hardcoded URI for now
const MONGODB_URI = "mongodb+srv://sunandvemavarapu_db_user:6RfYz41QXJl1fRm2@empty4.wwtfxjx.mongodb.net/";



// Reduce Mongoose internal debug noise
mongoose.set('debug', false);

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(MONGODB_URI);
    const host = connection.connection.host;
    console.log(`MongoDB connected (${host})`);
  } catch (error) {
    console.error('MongoDB connection failed');
    process.exit(1);
  }
};

module.exports = connectDB;

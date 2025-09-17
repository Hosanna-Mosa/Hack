const mongoose = require('mongoose');

// Prefer env var, fallback to current hardcoded URI for now
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://sunandvemavarapu_db_user:wqr25yDcKahqsueS@attedence.mlkqvap.mongodb.net/";
// Optional explicit DB name to ensure all models use the same existing database
const MONGODB_DB_NAME = process.env.MONGODB_DB || process.env.DB_NAME;

// Reduce Mongoose internal debug noise
mongoose.set('debug', false);

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(MONGODB_URI, MONGODB_DB_NAME ? { dbName: MONGODB_DB_NAME } : undefined);
    const host = connection.connection.host;
    console.log(`MongoDB connected (${host})`);
  } catch (error) {
    console.error('MongoDB connection failed');
    process.exit(1);
  }
};

module.exports = connectDB;

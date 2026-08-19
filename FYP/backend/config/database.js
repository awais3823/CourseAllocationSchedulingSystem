const mongoose = require('mongoose');

const connectDB = async (retries = 5, delay = 5000) => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error(`Retrying in ${delay}ms... (${retries} retries left)`);
    if (retries <= 0) {
      console.error('Max retries reached. Application will continue without database.');
      return;
    }
    setTimeout(() => connectDB(retries - 1, delay * 2), delay);
  }
};

module.exports = connectDB;


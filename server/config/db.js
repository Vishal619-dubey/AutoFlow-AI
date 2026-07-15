const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB Connected");
    console.log("Database:", mongoose.connection.name);
    console.log("Collections:", await mongoose.connection.db.listCollections().toArray());

  } catch (error) {
    console.log("❌ MongoDB Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
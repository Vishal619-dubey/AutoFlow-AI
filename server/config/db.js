const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is missing");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "autoflow_ai",
    });

    console.log("MongoDB Connected");
    console.log("Database:", mongoose.connection.name);

    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();

    console.log(
      "Collections:",
      collections.map((collection) => collection.name)
    );
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
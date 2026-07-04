import mongoose from "mongoose";
import config from "./config.js";

console.log("Connecting to MongoDB...");

const connectDB = async () => {
  try {
    const db = await mongoose.connect(config.MONGO_URI,{
        dbName: config.DB_NAME,
    });

    console.log("✅ MongoDB Connected");
    console.table({
      Host: db.connection.host,
      Port: db.connection.port,
      Database: db.connection.name,
      ReadyState: db.connection.readyState,
    });

  } catch (error) {
    console.error("❌ MongoDB Connection Failed");
    console.error(error.message);
    process.exit(1);
  }
}

export default connectDB;

import app from "./apps/app.js";
import config from "./config/config.js";
import connectDB from "./config/db.js";
import mongoose from "mongoose";
import os from "os";
import {v2 as cloudinary} from "cloudinary"

const startServer = async () => {
  try {
    await connectDB();

  app.listen(config.PORT, () => {
  console.log("\n🚀 APPLICATION STARTED\n");

  console.table({
    App: "Kraviona API",
    Environment: process.env.NODE_ENV || "development",
    Port: config.PORT,
    URL: `http://localhost:${config.PORT}`,
    Database: mongoose.connection.name || "Not Connected",
    DBHost: mongoose.connection.host || "N/A",
    Node: process.version,
    Platform: `${os.platform()} (${os.arch()})`,
    CPUs: os.cpus().length,
    Memory: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
    PID: process.pid,
    StartedAt: new Date().toISOString(),
  });
});

  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

// cloudinary config
cloudinary.config({ 
  cloud_name: config.CLOUDINARY_CLOUD_NAME, 
  api_key: config.CLOUDINARY_API_KEY, 
  api_secret: config.CLOUDINARY_API_SECRET
});

startServer();
import { Router } from "express";
import os from "os";
import mongoose from "mongoose";
import config from "../config/config.js";

const healthRouter = Router();

const APP_START_TIME = Date.now();

healthRouter.get("/health", async (req, res) => {
  const start = process.hrtime();

  try {
    // MongoDB Status
    const mongoStates = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    const dbState = mongoose.connection.readyState;

    const database = {
      status: mongoStates[dbState],
      name: mongoose.connection.name || null,
      host: mongoose.connection.host || null,
      port: mongoose.connection.port || null,
    };

    // Response Time
    const hrtime = process.hrtime(start);
    const responseTimeMs = hrtime[0] * 1000 + hrtime[1] / 1e6;

    const memory = process.memoryUsage();

    const healthData = {
      status: dbState === 1 ? "healthy" : "degraded",

      timestamp: new Date().toISOString(),

      application: {
        name: config.APP_NAME || "My API",
        version: config.APP_VERSION || "1.0.0",
        environment: config.NODE_ENV || "development",
        uptimeSeconds: Math.floor(process.uptime()),
        uptimeHuman: `${Math.floor(process.uptime() / 60)} minutes`,
        pid: process.pid,
        nodeVersion: process.version,
        startedAt: new Date(APP_START_TIME).toISOString(),
      },

      server: {
        hostname: os.hostname(),
        platform: os.platform(),
        architecture: os.arch(),
      },

      system: {
        cpus: os.cpus().length,
        cpuModel: os.cpus()[0]?.model,
        loadAverage: os.loadavg(),
        totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
        freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
      },

      process: {
        rssMB: Math.round(memory.rss / 1024 / 1024),
        heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024),
        heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
        externalMB: Math.round(memory.external / 1024 / 1024),
        cpuUsage: process.cpuUsage(),
      },

      database,

      network: {
        ip: req.ip,
        protocol: req.protocol,
      },

      services: {
        api: "healthy",
        mongodb: database.status,
      },

      performance: {
        responseTimeMs: Number(responseTimeMs.toFixed(2)),
      },
    };

    return res.status(200).json(healthData);

  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

export default healthRouter;
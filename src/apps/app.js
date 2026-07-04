import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import healthRouter from '../routes/health.routes.js';
import Router from '../routes/router.routes.js';
import cookieParser from "cookie-parser";
import cors from "cors";

import { v2 as cloudinary } from 'cloudinary'

const app = express();

app.use(cookieParser());
// cors 
app.use(
  cors({
    origin: ["http://localhost:3000", "https://kraviona.com", "https://superadmin.kraviona.com","http://localhost:3001"],
    credentials: true,
  })
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({extended:true}))
// home page send routea
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// api docs route
app.get('/api-docs', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/docsapi.html'));
});

// health check route
app.get('/health', healthRouter);

// DB connection route

// Cloudinary Config



// All routing
app.use('/api/v1', Router)
export default app;
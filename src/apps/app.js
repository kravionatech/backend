import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import healthRouter from '../routes/health.routes.js';
import Router from '../routes/router.routes.js';
import cookieParser from "cookie-parser";
import cors from "cors";
import { v2 as cloudinary } from 'cloudinary';

const app = express();

app.use(cookieParser());

app.use(
  cors({
    origin: ["http://localhost:3000", "https://kraviona.com", "https://superadmin.kraviona.com", "http://localhost:3001"],
    credentials: true,
  })
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Sirf yeh ek — null body handle karta hai, duplicate nahi
app.use((req, res, next) => {
  express.json()(req, res, (err) => {
    if (err) return next();
    next();
  });
});

app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

app.get('/api-docs', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/docsapi.html'));
});

app.get('/health', healthRouter);

app.use('/api/v1', Router);

export default app;
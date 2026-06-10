import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import env from './config/env.js';
import corsOptions from './config/cors.js';
import securityMiddleware from './middlewares/security.js';
import { globalLimiter } from './middlewares/rateLimiter.js';
import errorHandler from './middlewares/errorHandler.js';
import ApiError from './utils/ApiError.js';
import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ── 1. Security & Core Middleware ──────────────────────────────
app.use(securityMiddleware);
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(globalLimiter);

// ── 2. Static Files ────────────────────────────────────────────
// Serve uploaded files statically (ensure /uploads exists)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── 2.5 Health Check ───────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({ status: 'success', message: 'CipherChat API is running!' });
});

// ── 3. API Routes ──────────────────────────────────────────────
app.use('/api/v1', routes);

// ── 4. 404 Not Found Handler ───────────────────────────────────
app.use((req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.originalUrl}`));
});

// ── 5. Global Error Handler ────────────────────────────────────
app.use(errorHandler);

export default app;

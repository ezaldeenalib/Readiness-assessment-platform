import express from 'express';
import cors from 'cors';
import helmet from 'helmet';            // V-14
import rateLimit from 'express-rate-limit'; // V-10
import cookieParser from 'cookie-parser';   // V-09
import { doubleCsrf } from 'csrf-csrf';     // V-06
import crypto from 'crypto';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import entitiesRoutes from './routes/entities.js';
import usersRoutes from './routes/users.js';
import rolesRoutes from './routes/roles.js';
import assessmentsRoutes from './routes/assessments.js';
import analyticsRoutes from './routes/analytics.js';
import exportsRoutes from './routes/exports.js';
import statisticsRoutes from './routes/statistics.js';
import questionsRoutes from './routes/questions.js';
import templatesRoutes from './routes/templates.js';
import templateAssessmentsRoutes from './routes/templateAssessments.js';
import questionsNewRoutes from './routes/questions_new.js';
import answersRoutes from './routes/answers.js';
import categoriesRoutes from './routes/categories.js';
import referencesRoutes from './routes/references.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// ── V-14: Helmet security headers ────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
    }
  },
  hsts: isProd
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
}));

// ── V-07: Fixed CORS — reject disallowed origins with an error ────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (!isProd && /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return cb(null, true);
    // V-07: reject with error — NOT a truthy allowed value
    return cb(new Error('CORS: origin not permitted'), false);
  },
  credentials: true
}));

// ── V-09: cookie-parser for httpOnly JWT cookies ──────────────────────────────
app.use(cookieParser());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── V-06: CSRF double-submit cookie protection (csrf-csrf v4) ─────────────────
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'csrf-dev-secret-change-in-prod',
  // V4 required: tie the CSRF token to the current session/JWT
  getSessionIdentifier: (req) => req.cookies?.access_token || 'anonymous',
  // Use a plain cookie name in dev (Host prefix requires HTTPS)
  cookieName: isProd ? '__Host-psifi.x-csrf-token' : 'x-csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    path: '/',
    secure: isProd,
    httpOnly: true,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

// Expose CSRF token to the frontend (GET — not state-changing)
app.get('/api/csrf-token', (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({ token });
});

// Apply CSRF protection to all state-changing API routes
app.use('/api', doubleCsrfProtection);

// ── V-10: Rate limiting on auth endpoints ────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 attempts per window per IP
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// V-07: Health check — no uptime, restricted to allowed IPs
app.get('/health', (req, res) => {
  const allowedIPs = (process.env.HEALTH_ALLOWED_IPS || '127.0.0.1,::1').split(',').map(s => s.trim());
  const clientIP = req.ip || req.connection?.remoteAddress || '';
  if (!allowedIPs.includes(clientIP)) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json({ status: 'ok' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/entities', entitiesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/assessments', assessmentsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/exports', exportsRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/template-assessments', templateAssessmentsRoutes);
app.use('/api/questions-new', questionsNewRoutes);
app.use('/api/answers', answersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/references', referencesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── V-17: No stack traces in responses ───────────────────────────────────────
app.use((err, req, res, next) => {
  const errorId = crypto.randomUUID();
  // Log internally with full details; respond with only a safe message
  console.error(`[${errorId}]`, err);
  res.status(err.status || 500).json({
    error: isProd ? 'Internal server error' : (err.message || 'Internal server error'),
    errorId,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

export default app;

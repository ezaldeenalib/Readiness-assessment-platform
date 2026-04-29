  import express from 'express';
  import cors from 'cors';
  import helmet from 'helmet';
  import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
  import cookieParser from 'cookie-parser';
  import { doubleCsrf } from 'csrf-csrf';
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

  // ✅ FIX: always bind to all interfaces for production & VPS
  const LISTEN_HOST = '0.0.0.0';

  const isProd = process.env.NODE_ENV === 'production';

  // ── Trust proxy ──
  app.set('trust proxy', 1);

  // ── Security checks ──
  if (isProd) {
    const WEAK_PATTERNS = ['change_in_production', 'dev-secret', 'development', 'changeme', 'example'];

    const secretsToCheck = {
      JWT_SECRET: process.env.JWT_SECRET,
      REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
      CSRF_SECRET: process.env.CSRF_SECRET,
    };

    for (const [name, value] of Object.entries(secretsToCheck)) {
      if (!value || WEAK_PATTERNS.some(p => value.toLowerCase().includes(p)) || value.length < 32) {
        throw new Error(`[FATAL] ${name} is missing or too weak for production.`);
      }
    }

    if (process.env.JWT_SECRET === process.env.REFRESH_TOKEN_SECRET) {
      throw new Error('[FATAL] JWT_SECRET and REFRESH_TOKEN_SECRET must be different.');
    }
  }

  // ── Helmet ──
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
        fontSrc: ["'self'", 'fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
      }
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    crossOriginEmbedderPolicy: { policy: 'require-corp' },
  }));

  app.use((_req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()'
    );
    next();
  });

  // ── CORS ──
  const normalizeOrigin = (value) => {
    if (!value) return '';
    return String(value).trim().replace(/\/+$/, '').toLowerCase();
  };

  const allowedOrigins = (process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173'])
    .map(normalizeOrigin)
    .filter(Boolean);

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const normalizedOrigin = normalizeOrigin(origin);
      if (allowedOrigins.includes(normalizedOrigin)) return cb(null, true);
      console.warn('[CORS] Blocked origin:', origin);
      return cb(new Error('CORS: origin not permitted'), false);
    },
    credentials: true
  }));

  // ── Middlewares ──
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── CSRF ──
  const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET || 'csrf-dev-secret',
    getSessionIdentifier: (req) => req.cookies?.access_token || 'anonymous',
    cookieName: isProd ? '__Host-x-csrf-token' : 'x-csrf-token',
    cookieOptions: {
      sameSite: 'lax',
      path: '/',
      secure: isProd,
      httpOnly: true,
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
  });

  app.get('/api/csrf-token', (req, res) => {
    const token = generateCsrfToken(req, res);
    res.json({ token });
  });

  // ── CSRF bypass routes ──
  const csrfExcludedPaths = new Set([
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/logout',
  ]);

  app.use('/api', (req, res, next) => {
    if (csrfExcludedPaths.has(req.path)) return next();
    return doubleCsrfProtection(req, res, next);
  });

  // ── Rate limit ──
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: 'Too many login attempts. Try later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
      const email = (req.body?.email && String(req.body.email).toLowerCase().trim()) || 'unknown';
      const ip = ipKeyGenerator(req);
      return `login:${ip}:${email}`;
    },
  });

  const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
  });

  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth/register', registerLimiter);

  // ── Routes ──
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

  // ── 404 ──
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // ── Error handler ──
  app.use((err, _req, res, _next) => {
    if (err?.code === 'EBADCSRFTOKEN') {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    const errorId = crypto.randomUUID();
    console.error(`[ERROR ${errorId}]`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  // ── START (FIXED FINAL) ──
  app.listen(PORT, LISTEN_HOST, () => {
    console.log(`🚀 Server running on ${LISTEN_HOST}:${PORT}`);
  });

  export default app;

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import entitiesRoutes from './routes/entities.js';
import usersRoutes from './routes/users.js';
import assessmentsRoutes from './routes/assessments.js';
import analyticsRoutes from './routes/analytics.js';
import exportsRoutes from './routes/exports.js';
import statisticsRoutes from './routes/statistics.js';
// Template-based Evaluation Engine Routes
import questionsRoutes from './routes/questions.js';
import templatesRoutes from './routes/templates.js';
import templateAssessmentsRoutes from './routes/templateAssessments.js';

// New System Routes
import questionsNewRoutes from './routes/questions_new.js';
import answersRoutes from './routes/answers.js';

// Central Category System Routes
import categoriesRoutes from './routes/categories.js';

// Reference Dictionary (Composite/MultiSelect)
import referencesRoutes from './routes/references.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - allow multiple dev origins (5173, 5174, etc.)
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // same-origin or non-browser
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // allow any localhost:5xxx during dev
    if (/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return cb(null, true);
    cb(null, allowedOrigins[0]);
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/entities', entitiesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/assessments', assessmentsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/exports', exportsRoutes);
app.use('/api/statistics', statisticsRoutes);

// Template-based Evaluation Engine Routes
app.use('/api/questions', questionsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/template-assessments', templateAssessmentsRoutes);

// New System Routes
app.use('/api/questions-new', questionsNewRoutes);
app.use('/api/answers', answersRoutes);

// Central Category System Routes
app.use('/api/categories', categoriesRoutes);

// Reference Dictionary API
app.use('/api/references', referencesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Digital Maturity Assessment System API Server           ║
║  + Template-based Evaluation Engine 🚀                    ║
║  Status: Running ✓                                        ║
║  Port: ${PORT}                                           ║
║  Environment: ${process.env.NODE_ENV || 'development'}                                  ║
║  CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}              ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;

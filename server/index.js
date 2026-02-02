import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { triageRouter } from './routes/triage.js';
import { healthRouter } from './routes/health.js';

// Load environment variables from .env.local (development) or process.env (production)
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Health check endpoint
app.use('/api/health', healthRouter);

// Triage API routes
app.use('/api/triage', triageRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.message);
  
  const statusCode = err.statusCode || 500;
  const errorResponse = {
    success: false,
    error: err.message || 'Internal Server Error',
    errorType: err.errorType || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  };

  res.status(statusCode).json(errorResponse);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    errorType: 'NOT_FOUND',
    path: req.path,
    method: req.method
  });
});

app.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT}`);
  console.log(`[SERVER] CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`[SERVER] API Key configured: ${process.env.GEMINI_API_KEY ? '✓' : '✗'}`);
});

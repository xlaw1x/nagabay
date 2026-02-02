import express from 'express';
import { validateApiKey } from '../services/geminiService.js';

const router = express.Router();

/**
 * GET /api/health
 * Health check endpoint that verifies API key configuration
 */
router.get('/', (req, res) => {
  const apiKeyConfigured = !!process.env.GEMINI_API_KEY;
  
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    configuration: {
      geminiApiKeyConfigured: apiKeyConfigured,
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  });
});

/**
 * GET /api/health/validate-key
 * Validates that the Gemini API key is properly configured (development only)
 */
router.get('/validate-key', (req, res) => {
  // Only expose this in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'This endpoint is not available in production',
      errorType: 'FORBIDDEN'
    });
  }

  const validation = validateApiKey();
  
  res.status(validation.isValid ? 200 : 400).json({
    success: validation.isValid,
    message: validation.message,
    timestamp: new Date().toISOString()
  });
});

export { router as healthRouter };

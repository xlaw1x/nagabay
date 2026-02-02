import express from 'express';
import { getTriageAnalysis, GeminiError } from '../services/geminiService.js';

const router = express.Router();

/**
 * POST /api/triage/analyze
 * 
 * Analyzes patient intake data and returns triage recommendation
 * 
 * Request Body:
 * {
 *   "firstName": string,
 *   "lastName": string,
 *   "birthDate": string (YYYY-MM-DD),
 *   "sex": string,
 *   "barangay": string,
 *   "primaryConcern": string,
 *   "symptoms": string[],
 *   "isFollowUp": boolean,
 *   ... other IntakeData fields
 * }
 * 
 * Response (success):
 * {
 *   "success": true,
 *   "data": {
 *     "triageLevel": "EMERGENCY" | "URGENT" | "ROUTINE",
 *     "urgencyScore": number,
 *     "explanation": string,
 *     "recommendedFacilityIds": string[],
 *     "institutionalWin": string,
 *     "actionPlan": string,
 *     "bookingContact": {
 *       "name": string,
 *       "phone": string,
 *       "scheduleNotes": string
 *     }
 *   },
 *   "timestamp": string
 * }
 * 
 * Response (error):
 * {
 *   "success": false,
 *   "error": string,
 *   "errorType": "MISSING_API_KEY" | "QUOTA_EXCEEDED" | "MODEL_ERROR" | "INVALID_REQUEST" | etc,
 *   "timestamp": string
 * }
 */
router.post('/analyze', async (req, res, next) => {
  try {
    // Validate that request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Request body is required',
        errorType: 'INVALID_REQUEST',
        timestamp: new Date().toISOString()
      });
    }

    // Log the request (sanitized - no API key logging)
    console.log('[TRIAGE] Analyzing patient intake:', {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      primaryConcern: req.body.primaryConcern,
      timestamp: new Date().toISOString()
    });

    // Convert request body to JSON string for Gemini
    const userInput = JSON.stringify(req.body);

    // Call Gemini service
    const triageResult = await getTriageAnalysis(userInput);

    // Return success response
    return res.status(200).json({
      success: true,
      data: triageResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Handle GeminiError with specific error types
    if (error instanceof GeminiError) {
      console.error(`[TRIAGE] ${error.errorType}:`, error.message);
      
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        errorType: error.errorType,
        timestamp: new Date().toISOString()
      });
    }

    // Handle unexpected errors
    console.error('[TRIAGE] Unexpected error:', error.message);
    
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while processing your request',
      errorType: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

export { router as triageRouter };

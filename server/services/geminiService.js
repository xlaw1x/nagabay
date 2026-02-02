import { GoogleGenAI, Type } from '@google/genai';

/**
 * Lazy initialization of Gemini client
 * This prevents the app from crashing if API key is missing at startup
 */
let geminiClient = null;
let initializationError = null;

/**
 * Validates that the GEMINI_API_KEY environment variable is set
 * @returns {Object} Validation result with isValid flag and message
 */
export function validateApiKey() {
  if (!process.env.GEMINI_API_KEY) {
    return {
      isValid: false,
      message: 'GEMINI_API_KEY is not configured in environment variables'
    };
  }
  
  if (process.env.GEMINI_API_KEY.trim().length === 0) {
    return {
      isValid: false,
      message: 'GEMINI_API_KEY is empty'
    };
  }

  return {
    isValid: true,
    message: 'GEMINI_API_KEY is properly configured'
  };
}

/**
 * Initializes the Gemini client lazily on first use
 * @returns {Object} { client, error }
 */
function initializeClient() {
  if (geminiClient) {
    return { client: geminiClient, error: null };
  }

  if (initializationError) {
    return { client: null, error: initializationError };
  }

  try {
    const validation = validateApiKey();
    if (!validation.isValid) {
      initializationError = new Error(validation.message);
      throw initializationError;
    }

    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    console.log('[GEMINI] Client initialized successfully');
    return { client: geminiClient, error: null };
  } catch (error) {
    initializationError = error;
    console.error('[GEMINI] Initialization error:', error.message);
    return { client: null, error };
  }
}

/**
 * Custom error class for Gemini API errors
 */
class GeminiError extends Error {
  constructor(message, errorType, statusCode = 500) {
    super(message);
    this.errorType = errorType;
    this.statusCode = statusCode;
    this.name = 'GeminiError';
  }
}

/**
 * Determines the error type and appropriate status code based on error message
 * @param {Error} error - The error from Gemini API
 * @returns {Object} { errorType, statusCode, message }
 */
function categorizeError(error) {
  const errorMessage = error.message || '';
  const errorStatus = error.status || 500;

  // Missing API Key
  if (errorMessage.includes('API key') || errorMessage.includes('GEMINI_API_KEY')) {
    return {
      errorType: 'MISSING_API_KEY',
      statusCode: 503,
      message: 'API key is not configured. Please contact the administrator.'
    };
  }

  // Quota Exceeded
  if (
    errorMessage.includes('quota') ||
    errorMessage.includes('limit exceeded') ||
    errorMessage.includes('429') ||
    errorStatus === 429
  ) {
    return {
      errorType: 'QUOTA_EXCEEDED',
      statusCode: 429,
      message: 'API quota has been exceeded. Please try again later.'
    };
  }

  // Authentication Error
  if (
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('authentication') ||
    errorStatus === 401 ||
    errorStatus === 403
  ) {
    return {
      errorType: 'AUTHENTICATION_ERROR',
      statusCode: 503,
      message: 'Failed to authenticate with AI service. Please contact support.'
    };
  }

  // Model Error
  if (
    errorMessage.includes('model') ||
    errorMessage.includes('not found') ||
    errorStatus === 404
  ) {
    return {
      errorType: 'MODEL_ERROR',
      statusCode: 503,
      message: 'AI model is temporarily unavailable. Please try again later.'
    };
  }

  // Invalid Request
  if (errorStatus === 400 || errorMessage.includes('invalid')) {
    return {
      errorType: 'INVALID_REQUEST',
      statusCode: 400,
      message: 'Invalid request. Please check your input and try again.'
    };
  }

  // Rate Limiting
  if (errorMessage.includes('rate limit') || errorStatus === 429) {
    return {
      errorType: 'RATE_LIMITED',
      statusCode: 429,
      message: 'Too many requests. Please wait before trying again.'
    };
  }

  // Default to internal server error
  return {
    errorType: 'MODEL_ERROR',
    statusCode: 500,
    message: 'An error occurred while processing your request. Please try again.'
  };
}

/**
 * System instruction for the Gemini model
 */
const SYSTEM_INSTRUCTION = `
You are the "Naga City Smart Health Navigator." Your primary mission is to implement the "BHS-First" policy to ensure Barangay Health Stations are the first line of health care for Nagueños.

STRICT TRIAGE & ROUTING RULES:

1. LEVEL 1 (EMERGENCY) -> Naga City General Hospital (ncgh-1)
   - Use ONLY for life-threatening conditions (unconscious, severe trauma, active heart attack).

2. LEVEL 2 (TARGETED CARE) -> City Health Office I or II (cho-1, cho-2)
   - Use ONLY for specialized needs: Animal bites (Rabies), TB-DOTS (if confirmed), or when BHS lacks specific labs.

3. LEVEL 3 (ROUTINE / FIRST LINE) -> MANDATORY Barangay Health Station (BHS)
   - For ALL general check-ups, cough/cold/fever, immunization, prenatal, dental check-up, and PhilHealth YAKAP profiling.
   - YOU MUST match the patient's "barangay" to their specific BHS. 
   - If you recommend a CHO for a routine cough/cold/fever, you are failing the "Institutional Win" of decongestion.

MAPPING (Barangay to Facility ID):
- Abella -> bhs-abella
- Bagumbayan Norte -> bhs-bagumbayan-norte
- Bagumbayan Sur -> bhs-bagumbayan-sur
- Balatas -> bhs-balatas
- Calauag -> bhs-calauag
- Cararayan -> bhs-cararayan
- Carolina -> bhs-carolina
- Concepcion Grande -> bhs-concepcion-grande
- Concepcion Pequeña -> bhs-concepcion-pequena
- Del Rosario -> bhs-del-rosario
- Pacol -> bhs-pacol
- Sabang -> bhs-sabang
- Tinago -> bhs-tinago
- San Isidro -> bhs-san-isidro

If the patient's barangay does not have a specific BHS in the list above, route them to the nearest CHO, but explicitly state in the "actionPlan" that they should check their local health center first for future routine needs.

You must return a valid JSON object with the exact schema specified. Do not deviate from the schema.
`;

/**
 * Calls the Gemini API with triage data
 * @param {string} userInput - JSON string of patient intake data
 * @returns {Promise<Object>} Parsed triage result
 * @throws {GeminiError} With specific error type and status code
 */
export async function getTriageAnalysis(userInput) {
  // Initialize client
  const { client, error } = initializeClient();
  
  if (error) {
    const errorCategory = categorizeError(error);
    throw new GeminiError(
      errorCategory.message,
      errorCategory.errorType,
      errorCategory.statusCode
    );
  }

  try {
    console.log('[GEMINI] Sending triage request...');
    
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: userInput,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            triageLevel: {
              type: Type.STRING,
              enum: ['EMERGENCY', 'URGENT', 'ROUTINE'],
              description: 'Severity level of the patient\'s condition'
            },
            urgencyScore: {
              type: Type.NUMBER,
              description: 'Numeric score from 1-10 indicating urgency'
            },
            explanation: {
              type: Type.STRING,
              description: 'Clinical reasoning for triage decision'
            },
            recommendedFacilityIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of recommended facility IDs for patient referral'
            },
            institutionalWin: {
              type: Type.STRING,
              description: 'Description of how this routing achieves institutional goals'
            },
            actionPlan: {
              type: Type.STRING,
              description: 'Step-by-step action plan for the patient'
            },
            bookingContact: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                phone: { type: Type.STRING },
                scheduleNotes: { type: Type.STRING }
              },
              required: ['name', 'phone', 'scheduleNotes']
            }
          },
          required: [
            'triageLevel',
            'urgencyScore',
            'explanation',
            'recommendedFacilityIds',
            'institutionalWin',
            'actionPlan',
            'bookingContact'
          ]
        }
      }
    });

    // Parse the response
    const text = response.text.trim();
    const triageResult = JSON.parse(text);

    console.log('[GEMINI] Response parsed successfully');
    return triageResult;

  } catch (error) {
    console.error('[GEMINI] API Error:', error.message);
    
    // Check if it's a parsing error
    if (error instanceof SyntaxError) {
      throw new GeminiError(
        'Failed to parse AI response. The response format was invalid.',
        'PARSE_ERROR',
        500
      );
    }

    // Categorize the error
    const errorCategory = categorizeError(error);
    throw new GeminiError(
      errorCategory.message,
      errorCategory.errorType,
      errorCategory.statusCode
    );
  }
}

export { GeminiError };

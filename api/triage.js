import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';

// System instruction for the triage AI
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

// Define the schema for the triage response
const triageSchema = {
  type: 'object',
  properties: {
    triageLevel: {
      type: 'string',
      enum: ['LEVEL_1_EMERGENCY', 'LEVEL_2_TARGETED_CARE', 'LEVEL_3_ROUTINE']
    },
    recommendedFacility: {
      type: 'string',
      description: 'The facility ID to route the patient to'
    },
    facilityName: {
      type: 'string'
    },
    reasoning: {
      type: 'string',
      description: 'Explanation for the triage decision'
    },
    actionPlan: {
      type: 'string',
      description: 'Recommended next steps for the patient'
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
      description: 'Any important warnings or notes'
    }
  },
  required: ['triageLevel', 'recommendedFacility', 'facilityName', 'reasoning', 'actionPlan']
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      errorType: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    // Validate API key is configured
    if (!process.env.GOOGLE_API_KEY) {
      console.error('[TRIAGE API] GOOGLE_API_KEY environment variable is not set');
      return res.status(503).json({
        success: false,
        error: 'AI service not configured. Please set GOOGLE_API_KEY environment variable.',
        errorType: 'MISSING_API_KEY'
      });
    }

    // Parse request body
    let bodyData = req.body;
    if (typeof bodyData === 'string') {
      bodyData = JSON.parse(bodyData);
    }

    if (!bodyData || Object.keys(bodyData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Request body is required',
        errorType: 'INVALID_REQUEST'
      });
    }

    // Use Google API with explicit API key (AI SDK v6 syntax)
    // gemini-2.0-flash is a v2 model - use simple google() call
    const model = google('gemini-2.0-flash');

    // Call the AI model
    const result = await generateObject({
      model: model,
      system: SYSTEM_INSTRUCTION,
      prompt: JSON.stringify(bodyData),
      schema: triageSchema
    });

    // Return success
    return res.status(200).json({
      success: true,
      data: result.object
    });
  } catch (error) {
    console.error('[TRIAGE API] Error:', error.message);
    console.error('[TRIAGE API] Full error:', error);

    // Determine error type
    let errorType = 'MODEL_ERROR';
    let message = 'AI service error. Try again.';
    let statusCode = 503;

    if (error.message.includes('API key') || error.message.includes('authentication') || error.message.includes('GOOGLE_API_KEY')) {
      errorType = 'MISSING_API_KEY';
      message = 'AI service not configured. Contact support.';
      statusCode = 503;
    } else if (error.message.includes('quota') || error.message.includes('rate') || error.message.includes('429')) {
      errorType = 'QUOTA_EXCEEDED';
      message = 'Service overloaded. Try again in moments.';
      statusCode = 429;
    }

    return res.status(statusCode).json({
      success: false,
      error: message,
      errorType: errorType
    });
  }
}

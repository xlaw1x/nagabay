/**
 * Frontend API client for triage analysis
 * This service communicates with the backend API instead of directly calling Gemini
 * The backend securely handles all Gemini API interactions
 */

export interface TriageError {
  error: string;
  errorType: 'MISSING_API_KEY' | 'QUOTA_EXCEEDED' | 'MODEL_ERROR' | 'INVALID_REQUEST' | 'PARSE_ERROR' | 'INTERNAL_ERROR';
  timestamp: string;
}

export interface TriageResponse {
  success: boolean;
  data?: any;
  error?: string;
  errorType?: string;
  timestamp: string;
}

/**
 * User-friendly error messages based on error type
 */
const ERROR_MESSAGES: Record<string, string> = {
  MISSING_API_KEY: 'The AI service is not properly configured. Please contact support.',
  QUOTA_EXCEEDED: 'The AI service is temporarily overloaded. Please try again in a few moments.',
  MODEL_ERROR: 'The AI service encountered an error. Please try again.',
  INVALID_REQUEST: 'Your input could not be processed. Please check and try again.',
  PARSE_ERROR: 'The response format was invalid. Please try again.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  AUTHENTICATION_ERROR: 'Authentication with the AI service failed. Please try again later.'
};

/**
 * Analyzes patient intake data via the backend API
 * @param intakeData - Patient intake information
 * @returns Promise with triage result or error
 */
export async function analyzeTriageViaAPI(intakeData: any): Promise<TriageResponse> {
  // In production on Vercel: use /api/triage (serverless function)
  // In development: use http://localhost:3001/api/triage/analyze (Express server)
  let endpoint: string;
  
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // Production: use relative /api path
    endpoint = '/api/triage';
  } else {
    // Development: use localhost
    const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    endpoint = `${BACKEND_URL}/api/triage/analyze`;
  }

  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[TRIAGE CLIENT] Sending request to:', endpoint);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(intakeData),
      credentials: 'omit' // Don't send cookies for this public API
    });

    const data: TriageResponse = await response.json();

    // Log response (sanitized - development only)
    if (process.env.NODE_ENV !== 'production') {
      if (data.success) {
        console.log('[TRIAGE CLIENT] Triage analysis completed successfully');
      } else {
        console.log('[TRIAGE CLIENT] API returned error:', data.errorType);
      }
    }

    // Check if response indicates success
    if (!response.ok) {
      // Server returned an error response
      if (process.env.NODE_ENV !== 'production') {
        console.error('[TRIAGE CLIENT] HTTP Error:', response.status, data.errorType);
      }
      
      return {
        success: false,
        error: data.error || 'Request failed',
        errorType: data.errorType,
        timestamp: data.timestamp || new Date().toISOString()
      };
    }

    // Return the API response as-is
    return data;

  } catch (error) {
    // Network error or parsing error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (process.env.NODE_ENV !== 'production') {
      console.error('[TRIAGE CLIENT] Network error:', errorMessage);
    }

    return {
      success: false,
      error: 'Unable to connect to the service. Please check your internet connection.',
      errorType: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Gets a user-friendly error message for a given error type
 * @param errorType - The error type from the API response
 * @returns User-friendly error message
 */
export function getUserFriendlyErrorMessage(errorType?: string): string {
  if (!errorType) {
    return 'An error occurred. Please try again.';
  }

  return ERROR_MESSAGES[errorType] || ERROR_MESSAGES.INTERNAL_ERROR;
}

/**
 * Validates the backend connection (for health checks)
 * @returns Promise with health status information
 */
export async function validateBackendConnection(): Promise<{
  isHealthy: boolean;
  status: any;
  error?: string;
}> {
  let healthEndpoint: string;

  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // Production: use relative /api path
    healthEndpoint = '/api/health';
  } else {
    // Development: use localhost
    const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    healthEndpoint = `${BACKEND_URL}/api/health`;
  }

  try {
    const response = await fetch(healthEndpoint);
    const data = await response.json();

    if (process.env.NODE_ENV !== 'production') {
      console.log('[TRIAGE CLIENT] Health check response:', data);
    }

    return {
      isHealthy: response.ok,
      status: data,
      error: !response.ok ? data.error : undefined
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[TRIAGE CLIENT] Backend health check failed:', errorMessage);
    }
    return {
      isHealthy: false,
      status: null,
      error: errorMessage
    };
  }
}

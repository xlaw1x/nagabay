import { TriageResult } from "../types";

/**
 * DEPRECATED: Frontend Gemini Service
 * 
 * This file is DEPRECATED and should not be used anymore.
 * 
 * SECURITY NOTICE:
 * ===============
 * All Gemini API calls have been moved to the backend server.
 * The API key is now secure and only accessible server-side.
 * 
 * Frontend should use: /services/triageClient.ts
 * Backend implementation: /server/services/geminiService.js
 * 
 * If you see an error about this file, it means the migration is incomplete.
 * Import triageClient.ts instead for all triage analysis.
 * 
 * @deprecated Use triageClient.analyzeTriageViaAPI() instead
 */

/**
 * @deprecated - Do NOT use this function
 * Calling this throws an error to prevent accidental API key exposure
 */
export async function getTriageAnalysis(userInput: string): Promise<TriageResult> {
  throw new Error(
    'SECURITY ERROR: Attempted to call Gemini directly from the frontend. ' +
    'This is not allowed. Use triageClient.analyzeTriageViaAPI() instead, which calls the secure backend API.'
  );
}

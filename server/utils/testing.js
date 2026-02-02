/**
 * Testing utilities for verifying the Gemini API integration
 * Use these functions to test the backend API during development
 */

/**
 * Test data for triage analysis
 */
export const mockIntakeData = {
  firstName: 'John',
  lastName: 'Doe',
  birthDate: '1990-05-15',
  sex: 'Male',
  barangay: 'Abella',
  primaryConcern: 'Persistent cough',
  symptoms: ['cough', 'fever', 'fatigue'],
  isFollowUp: false,
  consultationMode: 'In-Person',
  preferredDate: new Date().toISOString().split('T')[0],
  preferredTimeSlot: '09:00 AM',
  additionalDetails: 'Cough started 3 days ago. No recent travel.'
};

/**
 * Validates that a triage response has the correct structure
 * @param {Object} response - The API response
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export function validateTriageResponse(response) {
  const errors = [];

  if (!response.data) {
    errors.push('Missing "data" field in response');
  } else {
    const data = response.data;

    // Required fields
    const requiredFields = [
      'triageLevel',
      'urgencyScore',
      'explanation',
      'recommendedFacilityIds',
      'institutionalWin',
      'actionPlan',
      'bookingContact'
    ];

    requiredFields.forEach(field => {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Type validation
    if (data.triageLevel && !['EMERGENCY', 'URGENT', 'ROUTINE'].includes(data.triageLevel)) {
      errors.push(`Invalid triageLevel: ${data.triageLevel}`);
    }

    if (data.urgencyScore && (typeof data.urgencyScore !== 'number' || data.urgencyScore < 1 || data.urgencyScore > 10)) {
      errors.push(`Invalid urgencyScore: ${data.urgencyScore} (should be 1-10)`);
    }

    if (!Array.isArray(data.recommendedFacilityIds)) {
      errors.push('recommendedFacilityIds should be an array');
    }

    if (data.bookingContact) {
      if (!data.bookingContact.name) errors.push('bookingContact.name is required');
      if (!data.bookingContact.phone) errors.push('bookingContact.phone is required');
      if (!data.bookingContact.scheduleNotes) errors.push('bookingContact.scheduleNotes is required');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Test the health endpoint
 * Usage: node -e "import('./server/utils/testing.js').then(m => m.testHealthEndpoint())"
 */
export async function testHealthEndpoint() {
  const baseUrl = process.env.TEST_URL || 'http://localhost:3001';
  
  console.log('\n📋 Testing Health Endpoint');
  console.log(`URL: ${baseUrl}/api/health`);
  
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json();
    
    console.log('✓ Status:', response.status);
    console.log('✓ Response:', JSON.stringify(data, null, 2));
    
    if (data.configuration?.geminiApiKeyConfigured) {
      console.log('✓ API Key is configured');
    } else {
      console.log('✗ API Key is NOT configured - add GEMINI_API_KEY to .env.local');
    }
    
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error('Is the backend server running? Try: npm run server');
  }
}

/**
 * Test the triage analysis endpoint with mock data
 * Usage: node -e "import('./server/utils/testing.js').then(m => m.testTriageEndpoint())"
 */
export async function testTriageEndpoint() {
  const baseUrl = process.env.TEST_URL || 'http://localhost:3001';
  
  console.log('\n📋 Testing Triage Analysis Endpoint');
  console.log(`URL: ${baseUrl}/api/triage/analyze`);
  console.log('Test Data:', JSON.stringify(mockIntakeData, null, 2));
  
  try {
    const response = await fetch(`${baseUrl}/api/triage/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockIntakeData)
    });
    
    const data = await response.json();
    
    console.log('\n✓ Status:', response.status);
    
    if (data.success) {
      console.log('✓ Analysis successful');
      const validation = validateTriageResponse(data);
      
      if (validation.isValid) {
        console.log('✓ Response structure is valid');
        console.log('✓ Triage Level:', data.data.triageLevel);
        console.log('✓ Urgency Score:', data.data.urgencyScore);
        console.log('✓ Recommended Facilities:', data.data.recommendedFacilityIds);
      } else {
        console.log('✗ Response structure is invalid:');
        validation.errors.forEach(e => console.log(`  - ${e}`));
      }
    } else {
      console.log('✗ Analysis failed');
      console.log('✗ Error Type:', data.errorType);
      console.log('✗ Message:', data.error);
      
      if (data.errorType === 'MISSING_API_KEY') {
        console.log('\nℹ️  Solution: Add GEMINI_API_KEY to .env.local');
      }
    }
    
  } catch (error) {
    console.error('✗ Network Error:', error.message);
    console.error('Is the backend server running? Try: npm run server');
  }
}

/**
 * Run all tests
 * Usage: node -e "import('./server/utils/testing.js').then(m => m.runAllTests())"
 */
export async function runAllTests() {
  console.log('========================================');
  console.log('🧪 Running Integration Tests');
  console.log('========================================');
  
  await testHealthEndpoint();
  
  // Wait 1 second before next test
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testTriageEndpoint();
  
  console.log('\n========================================');
  console.log('✓ Test Suite Complete');
  console.log('========================================\n');
}

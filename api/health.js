export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Check if API key is configured
    const apiKeyExists = !!process.env.GEMINI_API_KEY;
    const apiKeyLength = process.env.GEMINI_API_KEY?.length || 0;

    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      apiKeyConfigured: apiKeyExists,
      apiKeyLength: apiKeyLength,
      message: apiKeyExists ? 'System is operational' : 'API key is missing'
    };

    if (!apiKeyExists) {
      return res.status(503).json({
        ...status,
        status: 'degraded',
        error: 'GEMINI_API_KEY environment variable is not set'
      });
    }

    return res.status(200).json(status);
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}

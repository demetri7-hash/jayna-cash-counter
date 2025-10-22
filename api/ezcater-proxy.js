/**
 * Vercel Serverless Function: EZCater API Proxy
 * Securely proxies GraphQL requests to EZCater API
 * Prevents exposing API tokens to frontend
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📦 EZCater API Proxy: Request received');

    // Get API credentials from environment variables
    const apiToken = process.env.EZCATER_API_TOKEN;
    const apiUrl = process.env.EZCATER_API_URL || 'https://api.ezcater.com/graphql';

    if (!apiToken) {
      console.error('❌ EZCATER_API_TOKEN not configured');
      return res.status(500).json({
        error: 'EZCater API not configured',
        details: 'API token missing. Please configure EZCATER_API_TOKEN in Vercel environment variables.'
      });
    }

    // Extract GraphQL query and variables from request
    const { query, variables } = req.body;

    if (!query) {
      return res.status(400).json({
        error: 'Bad request',
        details: 'GraphQL query is required'
      });
    }

    console.log('📤 Forwarding GraphQL request to EZCater API');
    console.log('Variables:', JSON.stringify(variables));

    // Forward request to EZCater GraphQL API
    // NOTE: EZCater auth format is just the token, NOT "Bearer <token>"
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken,  // Direct token, no "Bearer" prefix
        'Apollographql-client-name': 'jayna-catering-system',
        'Apollographql-client-version': '1.0.0'
      },
      body: JSON.stringify({
        query,
        variables: variables || {}
      })
    });

    // Get response data
    const data = await response.json();

    // Check if EZCater returned an error
    if (!response.ok) {
      console.error('❌ EZCater API error:', response.status, response.statusText);
      console.error('Response:', JSON.stringify(data));

      // Return sanitized error to frontend
      return res.status(response.status).json({
        error: 'EZCater API error',
        details: data.message || data.error || 'Unknown error from EZCater API',
        status: response.status
      });
    }

    // Check for GraphQL errors
    if (data.errors && data.errors.length > 0) {
      console.error('❌ GraphQL errors:', JSON.stringify(data.errors));

      // Return GraphQL errors to frontend
      return res.status(200).json({
        data: data.data || null,
        errors: data.errors.map(err => ({
          message: err.message,
          path: err.path
        }))
      });
    }

    console.log('✅ EZCater API request successful');

    // Return successful response
    return res.status(200).json({
      data: data.data,
      errors: []
    });

  } catch (error) {
    console.error('❌ EZCater Proxy error:', error);

    // Return sanitized error to frontend
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

/**
 * Vercel Serverless Function: Discover EZCater Caterer ID
 * Uses GraphQL introspection and various query attempts to find caterer ID
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const apiToken = process.env.EZCATER_API_TOKEN;
    const apiUrl = 'https://api.ezcater.com/graphql';

    if (!apiToken) {
      return res.status(500).json({
        success: false,
        error: 'EZCATER_API_TOKEN not configured'
      });
    }

    console.log('🔍 Step 1: Trying GraphQL introspection to find available queries...');

    // Step 1: Introspection query to find all root queries
    const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          queryType {
            fields {
              name
              description
              args {
                name
                type {
                  name
                  kind
                }
              }
              type {
                name
                kind
              }
            }
          }
        }
      }
    `;

    const introspectionResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken,
        'Apollographql-client-name': 'jayna-discovery',
        'Apollographql-client-version': '1.0.0'
      },
      body: JSON.stringify({ query: introspectionQuery })
    });

    const introspectionData = await introspectionResponse.json();

    if (introspectionData.errors) {
      console.error('❌ Introspection errors:', introspectionData.errors);
      return res.status(200).json({
        success: false,
        error: 'GraphQL introspection failed',
        details: introspectionData.errors
      });
    }

    const availableQueries = introspectionData.data.__schema.queryType.fields;
    console.log(`✅ Found ${availableQueries.length} available queries`);

    // Look for caterer-related queries
    const catererQueries = availableQueries.filter(q =>
      q.name.toLowerCase().includes('caterer') ||
      q.name.toLowerCase().includes('viewer') ||
      q.name.toLowerCase().includes('me') ||
      q.name.toLowerCase().includes('current') ||
      q.name.toLowerCase().includes('restaurant') ||
      q.name.toLowerCase().includes('location')
    );

    console.log('🎯 Found potential caterer queries:', catererQueries.map(q => q.name));

    // Step 2: Try common patterns to get authenticated caterer info
    const attemptResults = [];

    // Attempt 1: Try "viewer" query (common GraphQL pattern)
    console.log('🔍 Attempt 1: Trying viewer query...');
    try {
      const viewerQuery = `
        query GetViewer {
          viewer {
            id
            __typename
          }
        }
      `;

      const viewerResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiToken,
          'Apollographql-client-name': 'jayna-discovery',
          'Apollographql-client-version': '1.0.0'
        },
        body: JSON.stringify({ query: viewerQuery })
      });

      const viewerData = await viewerResponse.json();

      if (viewerData.data && viewerData.data.viewer) {
        attemptResults.push({
          method: 'viewer query',
          success: true,
          data: viewerData.data.viewer
        });
        console.log('✅ Viewer query succeeded!', viewerData.data.viewer);
      } else if (viewerData.errors) {
        attemptResults.push({
          method: 'viewer query',
          success: false,
          error: viewerData.errors[0]?.message
        });
      }
    } catch (err) {
      attemptResults.push({
        method: 'viewer query',
        success: false,
        error: err.message
      });
    }

    // Attempt 2: Try "me" query
    console.log('🔍 Attempt 2: Trying me query...');
    try {
      const meQuery = `
        query GetMe {
          me {
            id
            __typename
          }
        }
      `;

      const meResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiToken,
          'Apollographql-client-name': 'jayna-discovery',
          'Apollographql-client-version': '1.0.0'
        },
        body: JSON.stringify({ query: meQuery })
      });

      const meData = await meResponse.json();

      if (meData.data && meData.data.me) {
        attemptResults.push({
          method: 'me query',
          success: true,
          data: meData.data.me
        });
        console.log('✅ Me query succeeded!', meData.data.me);
      } else if (meData.errors) {
        attemptResults.push({
          method: 'me query',
          success: false,
          error: meData.errors[0]?.message
        });
      }
    } catch (err) {
      attemptResults.push({
        method: 'me query',
        success: false,
        error: err.message
      });
    }

    // Attempt 3: Try each discovered caterer query
    for (const query of catererQueries) {
      console.log(`🔍 Attempt: Trying ${query.name} query...`);

      try {
        // Build a simple query with just id and __typename
        const testQuery = `
          query Test${query.name} {
            ${query.name} {
              id
              __typename
            }
          }
        `;

        const testResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': apiToken,
            'Apollographql-client-name': 'jayna-discovery',
            'Apollographql-client-version': '1.0.0'
          },
          body: JSON.stringify({ query: testQuery })
        });

        const testData = await testResponse.json();

        if (testData.data && testData.data[query.name]) {
          attemptResults.push({
            method: `${query.name} query`,
            success: true,
            data: testData.data[query.name]
          });
          console.log(`✅ ${query.name} query succeeded!`, testData.data[query.name]);
        } else if (testData.errors) {
          attemptResults.push({
            method: `${query.name} query`,
            success: false,
            error: testData.errors[0]?.message
          });
        }
      } catch (err) {
        attemptResults.push({
          method: `${query.name} query`,
          success: false,
          error: err.message
        });
      }
    }

    // Find successful attempts
    const successfulAttempts = attemptResults.filter(a => a.success);

    return res.status(200).json({
      success: true,
      message: `Tested ${attemptResults.length} query patterns`,
      availableQueries: availableQueries.map(q => ({
        name: q.name,
        description: q.description,
        args: q.args.map(a => a.name)
      })),
      catererQueries: catererQueries.map(q => q.name),
      attemptResults,
      catererId: successfulAttempts.length > 0 ? successfulAttempts[0].data.id : null,
      recommendation: successfulAttempts.length > 0
        ? `Found caterer ID using ${successfulAttempts[0].method}`
        : 'No caterer ID found. Contact EZCater support at api_support@ezcater.com'
    });

  } catch (error) {
    console.error('❌ Discovery error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to discover caterer ID',
      details: error.message
    });
  }
}

/**
 * EZCater Schema Introspection Tool
 * Uses GraphQL introspection to discover the REAL API schema
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
    const EZCATER_API_TOKEN = process.env.EZCATER_API_TOKEN;

    if (!EZCATER_API_TOKEN) {
      throw new Error('EZCATER_API_TOKEN not configured');
    }

    console.log('🔍 Running EZCater schema introspection...');

    // Introspection query to find ALL available queries
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
                  ofType {
                    name
                    kind
                  }
                }
              }
              type {
                name
                kind
                fields {
                  name
                  type {
                    name
                    kind
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch('https://api.ezcater.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': EZCATER_API_TOKEN,
        'Apollographql-client-name': 'Jayna-Gyro-Sacramento',
        'Apollographql-client-version': '1.0.0'
      },
      body: JSON.stringify({
        query: introspectionQuery
      })
    });

    const data = await response.json();

    if (data.errors) {
      console.error('❌ GraphQL errors:', data.errors);
      return res.status(500).json({
        success: false,
        error: 'Failed to introspect schema',
        details: data.errors
      });
    }

    const queryFields = data.data?.__schema?.queryType?.fields || [];

    // Filter for subscription-related queries
    const subscriptionQueries = queryFields.filter(field =>
      field.name.toLowerCase().includes('subscription') ||
      field.name.toLowerCase().includes('event') ||
      field.name.toLowerCase().includes('caterer')
    );

    console.log(`✅ Found ${queryFields.length} total queries`);
    console.log(`📋 Found ${subscriptionQueries.length} subscription-related queries:`);
    subscriptionQueries.forEach(q => console.log(`  - ${q.name}`));

    return res.status(200).json({
      success: true,
      totalQueries: queryFields.length,
      allQueries: queryFields.map(f => ({
        name: f.name,
        description: f.description,
        args: f.args.map(a => ({
          name: a.name,
          type: a.type.name || a.type.kind
        }))
      })),
      subscriptionQueries: subscriptionQueries,
      fullSchema: data.data.__schema,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Introspection error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

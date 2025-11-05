// functions/api/enterprise-daily.js
// Updated Pythia API for Enterprise Daily best performer (reads KV)

export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (context.request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Only GET allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const KV = context.env.PYTHIA_TOP50_KV;
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `enterprise_${today}`;
    
    // Try cached today's data
    let cached = await KV.get(cacheKey, 'json');
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: corsHeaders
      });
    }
    
    // Fallback to latest (from cron Worker)
    const latest = await KV.get('latest-enterprise', 'json');
    if (!latest) {
      return new Response(JSON.stringify({
        error: true,
        message: 'No enterprise daily data available yet. Daily scan runs at 12:01 AM PT.'
      }), {
        status: 503,
        headers: corsHeaders
      });
    }
    
    // Cache for today (no history/averages needed for single best)
    const dataToCache = {
      timestamp: Date.now(),
      result: latest
    };
    await KV.put(cacheKey, JSON.stringify(dataToCache), {
      expirationTtl: 60 * 60 * 24  // 1 day
    });
    
    return new Response(JSON.stringify(dataToCache), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Enterprise daily error:', error);
    return new Response(JSON.stringify({
      error: true,
      message: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

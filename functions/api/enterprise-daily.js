// functions/api/enterprise-daily.js
// Updated Pythia API for Enterprise Daily best performer + last 2 days' winners (reads KV)

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
    
    // Try cached today's full response
    let cached = await KV.get(cacheKey, 'json');
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: corsHeaders
      });
    }
    
    // Fetch current winner
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
    
    const current = {
      website: latest.bestUrl,
      pscore: latest.pscore,
      date: latest.scanDate
    };
    
    // Fetch last 2 days' winners (calculate dates)
    const previous = [];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date(yesterday);
    dayBefore.setDate(dayBefore.getDate() - 1);
    
    const dates = [
      yesterday.toISOString().split('T')[0],
      dayBefore.toISOString().split('T')[0]
    ];
    
    for (const date of dates) {
      const dateKey = `enterprise-${date}`;
      const data = await KV.get(dateKey, 'json');
      if (data) {
        previous.push({
          website: data.bestUrl,
          pscore: data.pscore,
          date: data.scanDate
        });
      }
    }
    
    const responseData = {
      timestamp: Date.now(),
      current,
      previous  // Array of 0-2 winners
    };
    
    // Cache full response for today
    await KV.put(cacheKey, JSON.stringify(responseData), {
      expirationTtl: 60 * 60 * 24  // 1 day
    });
    
    return new Response(JSON.stringify(responseData), {
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

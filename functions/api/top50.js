// functions/api/top50.js
// Updated Pythia API for Top 50 rankings (reads KV, with 5-day averages)

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
    const cacheKey = `top50_${today}`;
    
    // Try cached today's data
    let cached = await KV.get(cacheKey, 'json');
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: corsHeaders
      });
    }
    
    // Fallback to latest (from cron Worker)
    const latest = await KV.get('latest-top50', 'json');
    if (!latest || latest.length === 0) {
      return new Response(JSON.stringify({
        error: true,
        message: 'No results available yet. Daily scan runs at 12:01 AM PT.'
      }), {
        status: 503,
        headers: corsHeaders
      });
    }
    
    // Add 5-day running averages (from your logic, using KV history)
    const resultsWithAvg = await Promise.all(latest.map(async (result) => {
      const historyKey = `history_${result.url}`;
      let history = await KV.get(historyKey, 'json') || [];
      
      // Append today's score (from latest scan)
      history.push({ date: today, pscore: result.pscore });
      
      if (history.length > 30) {
        history = history.slice(-30);  // Keep last 30 days
      }
      
      let fiveDayAvg = null;
      if (history.length >= 5) {
        const last5 = history.slice(-5);
        const sum = last5.reduce((acc, item) => acc + item.pscore, 0);
        fiveDayAvg = Math.round(sum / 5);
      }
      
      // Store updated history (expire in 31 days)
      await KV.put(historyKey, JSON.stringify(history), {
        expirationTtl: 60 * 60 * 24 * 31
      });
      
      return { ...result, fiveDayAvg };
    }));
    
    // Cache for today
    const dataToCache = {
      timestamp: Date.now(),
      results: resultsWithAvg
    };
    await KV.put(cacheKey, JSON.stringify(dataToCache), {
      expirationTtl: 60 * 60 * 24  // 1 day
    });
    
    return new Response(JSON.stringify(dataToCache), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Top50 error:', error);
    return new Response(JSON.stringify({
      error: true,
      message: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// functions/api/enterprise-daily.js
// Cloudflare Function for daily random enterprise website showcase

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
    const KV = context.env.PYTHIA_TOP50_KV; // Reuse same KV namespace
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `enterprise_daily_${today}`;
    
    // Check if we have today's winner already cached
    const cached = await KV.get(cacheKey, 'json');
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: corsHeaders
      });
    }
    
    // If not cached, return message that scan is in progress or pending
    return new Response(JSON.stringify({
      error: true,
      message: 'Daily enterprise scan runs at 12:01 AM PT. Check back tomorrow for today\'s top performer!',
      nextScan: '12:01 AM PT (8:01 AM UTC)'
    }), {
      status: 503,
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

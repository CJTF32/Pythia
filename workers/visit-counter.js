// workers/visit-counter.js
// Simple visit counter that increments on each page view

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Only GET allowed' }), {
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      const KV = env.PYTHIA_TOP50_KV;
      const counterKey = 'site_visit_count';
      
      // Get current count
      let count = parseInt(await KV.get(counterKey) || '0');
      
      // Increment
      count++;
      
      // Store new count (never expires)
      await KV.put(counterKey, count.toString());
      
      return new Response(JSON.stringify({
        visits: count
      }), {
        status: 200,
        headers: corsHeaders
      });
      
    } catch (error) {
      console.error('Visit counter error:', error);
      return new Response(JSON.stringify({
        error: true,
        message: error.message
      }), { status: 500, headers: corsHeaders });
    }
  }
};

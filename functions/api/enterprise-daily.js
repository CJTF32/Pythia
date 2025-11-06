// Pythia™ Enterprise Daily API - Returns the daily enterprise website winner

export async function onRequest(context) {
  const { env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!env.PYTHIA_TOP50_KV) {
      return new Response(JSON.stringify({ error: 'KV namespace not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const enterpriseData = await env.PYTHIA_TOP50_KV.get('enterprise:daily');
    
    if (!enterpriseData) {
      // Return default winner
      return new Response(JSON.stringify({
        winner: {
          url: 'https://microsoft.com',
          pscore: 89,
          scannedAt: new Date().toISOString()
        },
        date: new Date().toISOString().split('T')[0]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = JSON.parse(enterpriseData);
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: `Failed to fetch enterprise winner: ${error.message}` 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

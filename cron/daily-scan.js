// Cloudflare Pages Function with scheduled cron trigger
// This will run daily to scan top 50 websites

const TOP_50_WEBSITES = [
  'https://google.com',
  'https://youtube.com',
  'https://facebook.com',
  'https://twitter.com',
  'https://instagram.com',
  'https://linkedin.com',
  'https://reddit.com',
  'https://wikipedia.org',
  'https://amazon.com',
  'https://netflix.com',
  'https://yahoo.com',
  'https://ebay.com',
  'https://microsoft.com',
  'https://apple.com',
  'https://pinterest.com',
  'https://github.com',
  'https://stackoverflow.com',
  'https://twitch.tv',
  'https://wordpress.com',
  'https://paypal.com',
  'https://bbc.com',
  'https://cnn.com',
  'https://nytimes.com',
  'https://espn.com',
  'https://imdb.com',
  'https://quora.com',
  'https://medium.com',
  'https://tumblr.com',
  'https://shopify.com',
  'https://etsy.com',
  'https://target.com',
  'https://walmart.com',
  'https://bestbuy.com',
  'https://homedepot.com',
  'https://ikea.com',
  'https://spotify.com',
  'https://soundcloud.com',
  'https://vimeo.com',
  'https://dropbox.com',
  'https://zoom.us',
  'https://salesforce.com',
  'https://adobe.com',
  'https://oracle.com',
  'https://ibm.com',
  'https://cloudflare.com',
  'https://airbnb.com',
  'https://booking.com',
  'https://tripadvisor.com',
  'https://uber.com',
  'https://lyft.com'
];

export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Get stored results or initialize
  let results = [];
  
  try {
    // Check if this is a manual trigger or automatic cron
    const url = new URL(context.request.url);
    const action = url.searchParams.get('action');
    
    if (action === 'scan') {
      // Trigger a new scan (can be called manually or by cron)
      console.log('Starting daily scan of top 50 websites...');
      
      // Scan websites in batches to avoid timeout
      const batchSize = 10;
      const scanResults = [];
      
      for (let i = 0; i < Math.min(TOP_50_WEBSITES.length, 50); i += batchSize) {
        const batch = TOP_50_WEBSITES.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (siteUrl) => {
          try {
            const scanResponse = await fetch(`${url.origin}/api/scan`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: siteUrl })
            });
            
            if (scanResponse.ok) {
              const data = await scanResponse.json();
              return {
                url: siteUrl,
                pscore: data.pscore,
                scores: {
                  karpov: data.karpov,
                  vortex: data.vortex,
                  nova: data.nova,
                  aether: data.aether,
                  pulse: data.pulse,
                  eden: data.eden,
                  helix: data.helix,
                  echo: data.echo,
                  quantum: data.quantum,
                  nexus: data.nexus
                },
                timestamp: new Date().toISOString()
              };
            }
          } catch (error) {
            console.error(`Failed to scan ${siteUrl}:`, error);
            return null;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        scanResults.push(...batchResults.filter(r => r !== null));
        
        // Small delay between batches to be nice to servers
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Sort by P-Score
      scanResults.sort((a, b) => b.pscore - a.pscore);
      
      // Store results in KV or return them
      // For now, we'll return them directly
      return new Response(JSON.stringify({
        success: true,
        scanned: scanResults.length,
        lastUpdate: new Date().toISOString(),
        results: scanResults
      }), {
        status: 200,
        headers: corsHeaders
      });
      
    } else {
      // Return cached results
      return new Response(JSON.stringify({
        message: 'Use ?action=scan to trigger a new scan',
        note: 'This endpoint is designed to be called by Cloudflare Cron Triggers daily'
      }), {
        status: 200,
        headers: corsHeaders
      });
    }
    
  } catch (error) {
    console.error('Cron job error:', error);
    return new Response(JSON.stringify({
      error: true,
      message: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

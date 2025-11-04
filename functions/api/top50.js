// functions/api/top50.js
// Cloudflare Worker for automated daily Top 50 scanning

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
    
    const cached = await KV.get(cacheKey, 'json');
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: corsHeaders
      });
    }
    
    return new Response(JSON.stringify({
      error: true,
      message: 'No results available yet. Daily scan runs at 12:01 AM PT.'
    }), {
      status: 503,
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

// Scheduled event handler for daily scans
export async function scheduled(event, env, ctx) {
  console.log('Starting daily Top 50 scan...');
  
  const TOP_50_URLS = [
    'https://www.google.com', 'https://www.youtube.com', 'https://www.facebook.com',
    'https://twitter.com', 'https://www.instagram.com', 'https://www.linkedin.com',
    'https://www.reddit.com', 'https://www.wikipedia.org', 'https://www.amazon.com',
    'https://www.netflix.com', 'https://www.yahoo.com', 'https://www.ebay.com',
    'https://www.microsoft.com', 'https://www.apple.com', 'https://www.pinterest.com',
    'https://github.com', 'https://www.stackoverflow.com', 'https://www.twitch.tv',
    'https://wordpress.com', 'https://www.paypal.com', 'https://www.bbc.com',
    'https://www.cnn.com', 'https://www.nytimes.com', 'https://www.espn.com',
    'https://www.imdb.com', 'https://www.quora.com', 'https://medium.com',
    'https://www.tumblr.com', 'https://www.shopify.com', 'https://www.etsy.com',
    'https://www.target.com', 'https://www.walmart.com', 'https://www.bestbuy.com',
    'https://www.homedepot.com', 'https://www.ikea.com', 'https://www.spotify.com',
    'https://soundcloud.com', 'https://vimeo.com', 'https://www.dropbox.com',
    'https://zoom.us', 'https://www.salesforce.com', 'https://www.adobe.com',
    'https://www.oracle.com', 'https://www.ibm.com', 'https://www.cloudflare.com',
    'https://www.airbnb.com', 'https://www.booking.com', 'https://www.tripadvisor.com',
    'https://www.uber.com', 'https://www.tiktok.com'
  ];
  
  const KV = env.PYTHIA_TOP50_KV;
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const results = [];
    
    // Scan in batches of 5 to avoid rate limits
    for (let i = 0; i < TOP_50_URLS.length; i += 5) {
      const batch = TOP_50_URLS.slice(i, i + 5);
      
      const batchPromises = batch.map(async (url) => {
        try {
          const response = await fetch('https://pythia.pages.dev/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data && data.pscore !== undefined) {
              return { url, pscore: data.pscore, timestamp: Date.now() };
            }
          }
        } catch (error) {
          console.error(`Failed to scan ${url}:`, error.message);
        }
        return null;
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(r => r !== null));
      
      // Wait 2 seconds between batches
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Calculate 5-day running averages
    const resultsWithAvg = await Promise.all(results.map(async (result) => {
      const historyKey = `history_${result.url}`;
      let history = await KV.get(historyKey, 'json') || [];
      
      history.push({ date: today, pscore: result.pscore });
      
      if (history.length > 30) {
        history = history.slice(-30);
      }
      
      let fiveDayAvg = null;
      if (history.length >= 5) {
        const last5 = history.slice(-5);
        const sum = last5.reduce((acc, item) => acc + item.pscore, 0);
        fiveDayAvg = Math.round(sum / 5);
      }
      
      await KV.put(historyKey, JSON.stringify(history), {
        expirationTtl: 60 * 60 * 24 * 31
      });
      
      return { ...result, fiveDayAvg };
    }));
    
    const cacheKey = `top50_${today}`;
    const dataToCache = {
      timestamp: Date.now(),
      results: resultsWithAvg
    };
    
    await KV.put(cacheKey, JSON.stringify(dataToCache), {
      expirationTtl: 60 * 60 * 24
    });
    
    console.log(`Successfully scanned ${results.length} sites for ${today}`);
    
  } catch (error) {
    console.error('Scheduled scan failed:', error);
  }
}

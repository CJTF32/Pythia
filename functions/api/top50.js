// Pythia™ Top 50 API - Returns the top 50 websites with 5-day running averages

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

    const top50Data = await env.PYTHIA_TOP50_KV.get('top50:rankings');
    
    if (!top50Data) {
      // Return default top 50 if not yet populated
      const defaultTop50 = getDefaultTop50();
      return new Response(JSON.stringify(defaultTop50), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = JSON.parse(top50Data);
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: `Failed to fetch top 50: ${error.message}` 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

function getDefaultTop50() {
  // Default top 50 sites (will be replaced by cron worker data)
  const sites = [
    { url: 'https://google.com', pscore: 95, rank: 1 },
    { url: 'https://youtube.com', pscore: 92, rank: 2 },
    { url: 'https://facebook.com', pscore: 88, rank: 3 },
    { url: 'https://twitter.com', pscore: 87, rank: 4 },
    { url: 'https://instagram.com', pscore: 86, rank: 5 },
    { url: 'https://linkedin.com', pscore: 85, rank: 6 },
    { url: 'https://wikipedia.org', pscore: 94, rank: 7 },
    { url: 'https://amazon.com', pscore: 84, rank: 8 },
    { url: 'https://reddit.com', pscore: 83, rank: 9 },
    { url: 'https://netflix.com', pscore: 90, rank: 10 },
    { url: 'https://apple.com', pscore: 91, rank: 11 },
    { url: 'https://microsoft.com', pscore: 89, rank: 12 },
    { url: 'https://github.com', pscore: 93, rank: 13 },
    { url: 'https://stackoverflow.com', pscore: 88, rank: 14 },
    { url: 'https://cloudflare.com', pscore: 96, rank: 15 },
    { url: 'https://bbc.com', pscore: 82, rank: 16 },
    { url: 'https://cnn.com', pscore: 80, rank: 17 },
    { url: 'https://nytimes.com', pscore: 85, rank: 18 },
    { url: 'https://spotify.com', pscore: 87, rank: 19 },
    { url: 'https://twitch.tv', pscore: 84, rank: 20 },
    { url: 'https://medium.com', pscore: 81, rank: 21 },
    { url: 'https://adobe.com', pscore: 86, rank: 22 },
    { url: 'https://salesforce.com', pscore: 83, rank: 23 },
    { url: 'https://zoom.us', pscore: 85, rank: 24 },
    { url: 'https://slack.com', pscore: 88, rank: 25 },
    { url: 'https://dropbox.com', pscore: 84, rank: 26 },
    { url: 'https://paypal.com', pscore: 82, rank: 27 },
    { url: 'https://ebay.com', pscore: 79, rank: 28 },
    { url: 'https://walmart.com', pscore: 78, rank: 29 },
    { url: 'https://target.com', pscore: 77, rank: 30 },
    { url: 'https://bestbuy.com', pscore: 76, rank: 31 },
    { url: 'https://homedepot.com', pscore: 75, rank: 32 },
    { url: 'https://etsy.com', pscore: 80, rank: 33 },
    { url: 'https://airbnb.com', pscore: 83, rank: 34 },
    { url: 'https://uber.com', pscore: 81, rank: 35 },
    { url: 'https://booking.com', pscore: 78, rank: 36 },
    { url: 'https://expedia.com', pscore: 77, rank: 37 },
    { url: 'https://zillow.com', pscore: 76, rank: 38 },
    { url: 'https://pinterest.com', pscore: 82, rank: 39 },
    { url: 'https://tumblr.com', pscore: 74, rank: 40 },
    { url: 'https://wordpress.com', pscore: 85, rank: 41 },
    { url: 'https://shopify.com', pscore: 87, rank: 42 },
    { url: 'https://squarespace.com', pscore: 84, rank: 43 },
    { url: 'https://wix.com', pscore: 82, rank: 44 },
    { url: 'https://vercel.com', pscore: 94, rank: 45 },
    { url: 'https://netlify.com', pscore: 93, rank: 46 },
    { url: 'https://stripe.com', pscore: 89, rank: 47 },
    { url: 'https://mailchimp.com', pscore: 83, rank: 48 },
    { url: 'https://canva.com', pscore: 86, rank: 49 },
    { url: 'https://notion.so', pscore: 88, rank: 50 }
  ];

  return {
    rankings: sites,
    lastUpdated: new Date().toISOString(),
    cached: false
  };
}

// Pythia Top 50 Daily Scanner - Dynamic Tranco Integration
// Runs daily cron: Fetches latest global top 50 domains by traffic, scans with Pythia metrics, stores in KV

// Placeholder scan function - REPLACE with full Pythia logic from api/scan.js
async function scanSite(url) {
  // TODO: Port real scan from repo (Lighthouse-like audits for speed, accessibility, SEO, etc.)
  // Example: Compute 10 metrics, average for P-Score (0-100)
  // Return { url, pScore: 85, metrics: { speed: 90, accessibility: 80, ... } }
  return {
    url,
    pScore: Math.floor(Math.random() * 100), // Temp placeholder
    metrics: { speed: Math.random() * 100, accessibility: Math.random() * 100 } // Expand to 10
  };
}

export default {
  async scheduled(event, env, ctx) {
    let top50Urls = [];

    try {
      // Fetch latest Tranco list ID (daily update at 0:00 UTC)
      const listIdResponse = await fetch('https://tranco-list.eu/top-1m-id');
      const listId = await listIdResponse.text().trim();
      
      // Fetch the CSV for that ID
      const csvUrl = `https://tranco-list.eu/download/${listId}/top-1m.csv.zip`;
      const csvResponse = await fetch(csvUrl);
      
      if (!csvResponse.ok) throw new Error(`HTTP ${csvResponse.status}: Failed to fetch Tranco CSV`);
      
      // For Workers, unzip is tricky without libs; use direct uncompressed if available, or parse zip buffer
      // Alternative: Fetch uncompressed CSV (Tranco provides both)
      const uncompressedUrl = `https://tranco-list.eu/download/${listId}`;
      const uncompressedResponse = await fetch(uncompressedUrl);
      const csvText = await uncompressedResponse.text();
      
      // Parse CSV: First line header, next 50 lines = top 50 domains
      const lines = csvText.split('\n').slice(0, 51); // Header + top 50
      top50Urls = lines.slice(1)  // Skip header
        .map(line => line.trim())
        .filter(line => line)  // Ignore empty
        .slice(0, 50)  // Top 50 only
        .map(domain => `https://${domain}`);  // Add https:// prefix for scanning
      
      console.log(`Fetched dynamic top 50 from Tranco: ${top50Urls[0]} to ${top50Urls[49]}`);
      
    } catch (error) {
      console.error('Tranco fetch failed:', error);
      // Fallback: Current top 50 as of Nov 5, 2025 (from Tranco)
      top50Urls = [
        'https://google.com', 'https://youtube.com', 'https://facebook.com', 'https://wikipedia.org', 'https://instagram.com',
        'https://reddit.com', 'https://amazon.com', 'https://x.com', 'https://baidu.com', 'https://yahoo.com',
        'https://yandex.ru', 'https://whatsapp.com', 'https://linkedin.com', 'https://pinterest.com', 'https://twitter.com',
        'https://live.com', 'https://netflix.com', 'https://tumblr.com', 'https://pornhub.com', 'https://weheartit.com',
        'https://flickr.com', 'https://microsoft.com', 'https://apple.com', 'https://ebay.com', 'https://bing.com',
        'https://aliexpress.com', 'https://yahoo.co.jp', 'https://cnn.com', 'https://imdb.com', 'https://stackoverflow.com',
        'https://office.com', 'https://zoom.us', 'https://blogger.com', 'https://twitch.tv', 'https://bbc.com',
        'https://aliexpress.ru', 'https://qq.com', 'https://taobao.com', 'https://etsy.com', 'https://roblox.com',
        'https://dailymotion.com', 'https://theguardian.com', 'https://quora.com', 'https://dropbox.com', 'https://adobe.com',
        'https://paypal.com', 'https://nytimes.com', 'https://walmart.com', 'https://forbes.com', 'https://fandom.com'
      ];
      console.log('Using fallback top 50');
    }

    // Scan each site
    const results = [];
    for (const url of top50Urls) {
      try {
        console.log(`Scanning ${url}...`);
        const result = await scanSite(url);
        results.push(result);
        // Add delay to avoid rate limits (optional)
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Scan failed for ${url}:`, error);
        results.push({ url, pScore: 0, error: error.message });
      }
    }

    // Sort by P-Score descending
    results.sort((a, b) => (b.pScore || 0) - (a.pScore || 0));

    // Store in KV
    const dateKey = `top50-${new Date().toISOString().split('T')[0]}`;
    await env.PYTHIA_TOP50_KV.put(dateKey, JSON.stringify(results));
    await env.PYTHIA_TOP50_KV.put('latest-top50', JSON.stringify(results));

    console.log(`Completed scan of ${results.length} sites on ${dateKey}. Top: ${results[0]?.url} (${results[0]?.pScore})`);
  },

  // Manual trigger via HTTP GET (for testing)
  async fetch(request, env, ctx) {
    if (request.method === 'GET') {
      // Mock scheduled event
      const event = { cron: '1 8 * * *' };
      await scheduled(event, env, ctx);
      return new Response('Scan triggered manually! Check /api/top50 in 1-2 mins.', { status: 200 });
    }
    return new Response('Method not allowed (use GET)', { status: 405 });
  }
};

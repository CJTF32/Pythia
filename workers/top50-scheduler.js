// Pythia Top 50 Daily Scanner - Automated Cron Only (Dynamic Tranco Top 50)

// REPLACE with full Pythia scan logic from functions/api/scan.js
// Computes 10 metrics (equal 10% weights, fixed Eden variance), returns P-Score (0-100)
async function scanSite(url) {
  // TODO: Implement real scan (fetch page, run audits for speed, accessibility, SEO, etc.)
  // Return { url, pScore: Number, metrics: { eden: Number, karpovSpeed: Number, ... } }
  return {
    url,
    pScore: Math.floor(Math.random() * 100), // Placeholder
    metrics: { eden: Math.random() * 100, speed: Math.random() * 100, accessibility: Math.random() * 100 } // Expand to 10
  };
}

export default {
  async scheduled(event, env, ctx) {
    console.log('Top 50 cron started at', new Date().toISOString());
    let top50Urls = [];

    // Fetch dynamic top 50 from Tranco (daily updated global traffic ranks)
    try {
      // Get latest list ID
      const listIdResponse = await fetch('https://tranco-list.eu/top-1m-id');
      if (!listIdResponse.ok) throw new Error(`HTTP ${listIdResponse.status}`);
      const listId = await listIdResponse.text().trim();
      
      // Fetch uncompressed CSV
      const csvUrl = `https://tranco-list.eu/download/${listId}`;
      const csvResponse = await fetch(csvUrl);
      if (!csvResponse.ok) throw new Error(`HTTP ${csvResponse.status}`);
      const csvText = await csvResponse.text();
      
      // Parse top 50 (format: rank,domain per line)
      const lines = csvText.split('\n').slice(0, 51); // Header + top 50
      top50Urls = lines.slice(1)
        .map(line => line.trim())
        .filter(line => line)
        .slice(0, 50)
        .map(domain => `https://${domain}`);
      
      console.log(`Dynamic top 50 fetched from Tranco (${listId}): ${top50Urls[0]} to ${top50Urls[49]}`);
    } catch (error) {
      console.error('Tranco fetch failed:', error);
      // Fallback: Current top 50 as of Nov 5, 2025 (Tranco)
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

    // Scan sites (batch to avoid timeout; 5 at a time)
    const results = [];
    for (let i = 0; i < top50Urls.length; i += 5) {
      const batch = top50Urls.slice(i, i + 5);
      const batchPromises = batch.map(async (url) => {
        try {
          console.log(`Scanning ${url}...`);
          const result = await scanSite(url);
          return result;
        } catch (error) {
          console.error(`Scan failed for ${url}:`, error);
          return { url, pScore: 0, error: error.message };
        }
      });
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Delay between batches
      if (i + 5 < top50Urls.length) await new Promise(r => setTimeout(r, 2000));
    }

    // Sort by P-Score descending
    results.sort((a, b) => (b.pScore || 0) - (a.pScore || 0));

    // Store in KV
    const dateKey = `top50-${new Date().toISOString().split('T')[0]}`;
    await env.PYTHIA_TOP50_KV.put(dateKey, JSON.stringify(results));
    await env.PYTHIA_TOP50_KV.put('latest-top50', JSON.stringify(results));
    
    console.log(`Top 50 cron complete: ${results.length} sites scanned, stored under ${dateKey}. Top site: ${results[0]?.url} (P-Score: ${results[0]?.pScore})`);
  }
};

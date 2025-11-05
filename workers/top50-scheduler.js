// Pythia Top 50 Daily Scanner - Dynamic Tranco + Manual Trigger
// Cron: Fetches latest top 50 by traffic, scans, stores in KV

async function scanSite(url) {
  // REPLACE with full Pythia scan logic from functions/api/scan.js
  // Computes 10 metrics, P-Score (equal 10% weights, fixed Eden)
  return {
    url,
    pScore: Math.floor(Math.random() * 100), // Placeholder
    metrics: { eden: Math.random() * 100, speed: Math.random() * 100 } // Expand to 10
  };
}

export default {
  async scheduled(event, env, ctx) {
    let top50Urls = [];
    try {
      // Fetch Tranco latest list ID
      const listIdResponse = await fetch('https://tranco-list.eu/top-1m-id');
      const listId = await listIdResponse.text().trim();
      const csvUrl = `https://tranco-list.eu/download/${listId}`;
      const csvResponse = await fetch(csvUrl);
      const csvText = await csvResponse.text();
      
      // Parse top 50
      const lines = csvText.split('\n').slice(0, 51);
      top50Urls = lines.slice(1).map(line => `https://${line.trim()}`).slice(0, 50);
      console.log(`Dynamic top 50 fetched: ${top50Urls[0]}...`);
    } catch (error) {
      console.error('Tranco failed:', error);
      top50Urls = ['https://google.com', 'https://youtube.com' /* add full fallback */]; // Your top 50
    }

    const results = [];
    for (const url of top50Urls) {
      try {
        const result = await scanSite(url);
        results.push(result);
      } catch (error) {
        console.error(`Scan error ${url}:`, error);
      }
    }

    results.sort((a, b) => b.pScore - a.pScore);
    const dateKey = `top50-${new Date().toISOString().split('T')[0]}`;
    await env.PYTHIA_TOP50_KV.put(dateKey, JSON.stringify(results));
    await env.PYTHIA_TOP50_KV.put('latest-top50', JSON.stringify(results));
    console.log(`Top 50 scan complete: ${results.length} sites, top ${results[0]?.pScore}`);
  },

  async fetch(request, env, ctx) {
    if (request.method === 'GET') {
      const event = { cron: 'manual' };
      await scheduled(event, env, ctx);
      return new Response('Manual scan triggered! Check logs/KV in 1-2 mins.', { status: 200 });
    }
    return new Response('Use GET for manual trigger', { status: 405 });
  }
};

// Pythia Enterprise Daily Scanner - Random 1,000 Sites + Manual Trigger
// Cron: Fetches 1,000 random from Tranco top 1M, scans, stores BEST performer in KV

async function scanSite(url) {
  // REPLACE with full Pythia scan logic
  return {
    url,
    pScore: Math.floor(Math.random() * 100),
    metrics: { eden: Math.random() * 100, speed: Math.random() * 100 }
  };
}

export default {
  async scheduled(event, env, ctx) {
    let randomSites = [];
    try {
      // Fetch 1,000 random from Tranco top 1M
      const trancoResponse = await fetch('https://tranco-list.eu/api/domains/random?size=1000');
      const { domains } = await trancoResponse.json();
      randomSites = domains.map(domain => `https://${domain}`);
      console.log(`Random 1,000 sites fetched: ${randomSites[0]}...`);
    } catch (error) {
      console.error('Tranco random failed:', error);
      // Fallback: Generate random from a seed list or cached top 1M
      randomSites = Array.from({length: 1000}, (_, i) => `https://example${i}.com`); // Replace with real fallback
    }

    const scanPromises = randomSites.map(async (url, index) => {
      // Batch to avoid timeouts (e.g., 10 at a time)
      if (index % 10 === 0) await new Promise(r => setTimeout(r, 2000));
      try {
        return await scanSite(url);
      } catch (error) {
        console.error(`Scan error ${url}:`, error);
        return null;
      }
    });

    const results = (await Promise.all(scanPromises)).filter(r => r);
    const best = results.reduce((best, curr) => (curr.pScore > (best.pScore || 0) ? curr : best), { pScore: 0 });

    const dateKey = `enterprise-${new Date().toISOString().split('T')[0]}`;
    const data = { bestUrl: best.url, pScore: best.pScore, metrics: best.metrics, scanDate: dateKey };
    await env.PYTHIA_TOP50_KV.put(dateKey, JSON.stringify(data));
    await env.PYTHIA_TOP50_KV.put('latest-enterprise', JSON.stringify(data));
    console.log(`Enterprise scan complete: Best ${best.url} (${best.pScore}) from ${results.length} sites`);
  },

  async fetch(request, env, ctx) {
    if (request.method === 'GET') {
      const event = { cron: 'manual' };
      await scheduled(event, env, ctx);
      return new Response('Manual enterprise scan triggered! Check /api/enterprise-daily in 5-10 mins.', { status: 200 });
    }
    return new Response('Use GET for manual trigger', { status: 405 });
  }
};

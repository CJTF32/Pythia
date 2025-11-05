// Pythia Enterprise Daily Scanner - Automated Cron Only (Random 1,000 from Tranco Top 1M)

// REPLACE with full Pythia scan logic from functions/api/scan.js
async function scanSite(url) {
  return {
    url,
    pScore: Math.floor(Math.random() * 100), // Placeholder
    metrics: { eden: Math.random() * 100, speed: Math.random() * 100, accessibility: Math.random() * 100 } // Expand to 10
  };
}

export default {
  async scheduled(event, env, ctx) {
    console.log('Enterprise cron started at', new Date().toISOString());
    let randomSites = [];

    // Fetch 1,000 random domains from Tranco top 1M (daily updated, unbiased sample)
    try {
      const trancoResponse = await fetch('https://tranco-list.eu/api/domains/random?size=1000');
      if (!trancoResponse.ok) throw new Error(`HTTP ${trancoResponse.status}`);
      const { domains } = await trancoResponse.json();
      randomSites = domains.map(domain => `https://${domain}`);
      console.log(`Random 1,000 sites fetched from Tranco: ${randomSites[0]}...`);
    } catch (error) {
      console.error('Tranco random API failed:', error);
      // Fallback: Simple random from a seed list (expand or cache top 1M in KV for real use)
      randomSites = Array.from({ length: 1000 }, (_, i) => `https://example-enterprise-${i}.com`);
      console.log('Using fallback random sites');
    }

    // Scan sites (batch 10 at a time to avoid timeout)
    const results = [];
    for (let i = 0; i < randomSites.length; i += 10) {
      const batch = randomSites.slice(i, i + 10);
      const batchPromises = batch.map(async (url) => {
        try {
          console.log(`Scanning enterprise site ${i + 1}-${i + 10}: ${url}...`);
          const result = await scanSite(url);
          return result;
        } catch (error) {
          console.error(`Scan failed for ${url}:`, error);
          return null;
        }
      });
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(r => r));  // Skip nulls
      
      // Delay between batches
      if (i + 10 < randomSites.length) await new Promise(r => setTimeout(r, 3000));
    }

    // Find best performer (highest P-Score)
    const best = results.reduce((best, curr) => (curr.pScore > (best.pScore || 0) ? curr : best), { pScore: 0 });

    // Store best in KV
    const dateKey = `enterprise-${new Date().toISOString().split('T')[0]}`;
    const data = { bestUrl: best.url, pScore: best.pScore, metrics: best.metrics, scanDate: dateKey, totalScanned: results.length };
    await env.PYTHIA_TOP50_KV.put(dateKey, JSON.stringify(data));
    await env.PYTHIA_TOP50_KV.put('latest-enterprise', JSON.stringify(data));
    
    console.log(`Enterprise cron complete: ${results.length} sites scanned. Best: ${best.url} (P-Score: ${best.pScore}) stored under ${dateKey}`);
  }
};

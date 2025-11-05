// Pythia Enterprise Daily Scanner - Automated Cron Only (Random 1,000 from Tranco Top 1M + Full Scan Integration)

// Core scanSite function - Same as above (ported from functions/api/scan.js)
async function scanSite(url) {
  // [Same full scanSite code as in Top 50 above - paste it here to avoid duplication]
  // ... (fetch, analysis, metrics calculation, return result object)
}

// Cron entry point
export default {
  async scheduled(event, env, ctx) {
    console.log('Enterprise cron started at', new Date().toISOString());
    let randomSites = [];

    // Fetch 1,000 random from Tranco top 1M
    try {
      const trancoResponse = await fetch('https://tranco-list.eu/api/domains/random?size=1000');
      if (!trancoResponse.ok) throw new Error(`HTTP ${trancoResponse.status}`);
      const { domains } = await trancoResponse.json();
      randomSites = domains.map(domain => `https://${domain}`);
      console.log(`Random 1,000 sites fetched from Tranco: ${randomSites[0]}...`);
    } catch (error) {
      console.error('Tranco random API failed:', error);
      // Fallback: Generate 1,000 random enterprise-like domains (expand for real)
      randomSites = Array.from({ length: 1000 }, (_, i) => `https://enterprise-site-${i}.com`);
      console.log('Using fallback random sites');
    }

    // Scan sites (batch 10 at a time)
    const results = [];
    for (let i = 0; i < randomSites.length; i += 10) {
      const batch = randomSites.slice(i, i + 10);
      const batchPromises = batch.map(async (url) => {
        try {
          console.log(`Scanning enterprise site ${i + 1}-${i + 10}: ${url}...`);
          return await scanSite(url);
        } catch (error) {
          console.error(`Full scan failed for ${url}:`, error);
          return null;
        }
      });
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(r => r));
      
      if (i + 10 < randomSites.length) await new Promise(r => setTimeout(r, 3000));
    }

    // Find best performer
    const best = results.reduce((best, curr) => (curr.pscore > (best.pscore || 0) ? curr : best), { pscore: 0 });

    // Store in KV
    const dateKey = `enterprise-${new Date().toISOString().split('T')[0]}`;
    const data = { 
      bestUrl: best.url, 
      pscore: best.pscore, 
      metrics: best.metrics, 
      breakdown: best.breakdown,
      scanDate: dateKey, 
      totalScanned: results.length 
    };
    await env.PYTHIA_TOP50_KV.put(dateKey, JSON.stringify(data));
    await env.PYTHIA_TOP50_KV.put('latest-enterprise', JSON.stringify(data));
    
    console.log(`Enterprise cron complete: ${results.length} sites scanned. Best: ${best.url} (P-Score: ${best.pscore})`);
  }
};

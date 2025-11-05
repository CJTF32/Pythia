// Pythia Top 50 Daily Scanner - Fixed Manual Trigger + Standalone Scheduled Logic

// Placeholder scan - REPLACE with real Pythia scanSite
async function scanSite(url) {
  return { url, pScore: 85, metrics: { eden: 90, speed: 80 } };  // Fixed for test
}

// Standalone scheduled logic (reusable by cron and manual)
async function runScan(env, ctx, isManual = false) {
  console.log(`${isManual ? 'Manual' : 'Cron'} scan started`);
  
  const testUrls = ['https://google.com', 'https://youtube.com', 'https://facebook.com'];  // Test 3 sites
  const results = [];
  
  for (const url of testUrls) {
    try {
      const result = await scanSite(url);
      results.push(result);
      console.log(`Scanned ${url}: P-Score ${result.pScore}`);
    } catch (error) {
      console.error(`Scan error for ${url}:`, error);
    }
  }
  
  results.sort((a, b) => b.pScore - a.pScore);
  const dateKey = `top50-${new Date().toISOString().split('T')[0]}`;
  await env.PYTHIA_TOP50_KV.put(dateKey, JSON.stringify(results));
  await env.PYTHIA_TOP50_KV.put('latest-top50', JSON.stringify(results));
  await env.PYTHIA_TOP50_KV.put('test-key', JSON.stringify({ message: 'Scan complete', count: results.length }));
  
  console.log(`Scan complete: ${results.length} sites, top ${results[0]?.pScore}`);
}

export default {
  async scheduled(event, env, ctx) {
    await runScan(env, ctx, false);
  },

  async fetch(request, env, ctx) {
    if (request.method === 'GET') {
      await runScan(env, ctx, true);
      return new Response('Manual scan triggered! Check logs/KV ("latest-top50" + "test-key") in 1 min.', { status: 200 });
    }
    return new Response('Use GET for manual trigger', { status: 405 });
  }
};

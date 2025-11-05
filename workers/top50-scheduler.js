// workers/top50-scheduler.js
// Cloudflare Worker that runs on a cron schedule to trigger Top 50 scanning

export default {
  async scheduled(event, env, ctx) {
    console.log('Starting daily Top 50 scan...');
    
    const TOP_50_URLS = [
      // ... (full array from original)
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
            const fetchUrl = new URL(url);
            fetchUrl.searchParams.append('ref', 'pythia');
            const response = await fetch('https://pythia.pages.dev/api/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: fetchUrl.href })
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
  },

  async fetch(request, env, ctx) {
    // Allow manual triggering via HTTP request
    return new Response('Top 50 scanner - use scheduled trigger', { status: 200 });
  }
};

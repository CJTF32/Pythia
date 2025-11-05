// workers/enterprise-daily-scanner.js
// Scans 1000 random enterprise websites and finds the best performer

export default {
  async scheduled(event, env, ctx) {
    console.log('Starting daily enterprise scan of 1000 random sites...');
    
    // Fortune 1000 + Global 500 + Tech companies + Popular brands
    const ENTERPRISE_DOMAINS = [
      // ... (full array from original, omitted for brevity)
    ];
    
    // Function to generate 1000 unique URLs
    function generateUrls() {
      const urls = [];
      const variations = ['', 'www.', 'www2.', 'shop.', 'store.', 'blog.', 'careers.', 'investors.'];
      const protocols = ['https://'];
      
      ENTERPRISE_DOMAINS.forEach(domain => {
        variations.forEach(subdomain => {
          protocols.forEach(protocol => {
            urls.push(`${protocol}${subdomain}${domain}`);
            if (urls.length >= 1000) return;
          });
          if (urls.length >= 1000) return;
        });
        if (urls.length >= 1000) return;
      });
      
      // Shuffle for randomness
      return urls.sort(() => Math.random() - 0.5).slice(0, 1000);
    }
    
    const KV = env.PYTHIA_TOP50_KV;
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const urlsToScan = generateUrls();
      console.log(`Generated ${urlsToScan.length} URLs to scan`);
      
      let bestResult = null;
      let scannedCount = 0;
      
      // Scan in batches of 5
      for (let i = 0; i < urlsToScan.length; i += 5) {
        const batch = urlsToScan.slice(i, i + 5);
        
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
                scannedCount++;
                
                // Keep track of the best one
                if (!bestResult || data.pscore > bestResult.pscore) {
                  bestResult = {
                    url: data.url,
                    pscore: data.pscore,
                    pageSize: data.pageSize,
                    loadTime: data.loadTime,
                    karpov: data.karpov,
                    vortex: data.vortex,
                    pulse: data.pulse,
                    helix: data.helix,
                    timestamp: Date.now()
                  };
                  console.log(`New best: ${data.url} with P-Score ${data.pscore}`);
                }
                
                return data;
              }
            }
          } catch (error) {
            console.error(`Failed to scan ${url}:`, error.message);
          }
          return null;
        });
        
        await Promise.all(batchPromises);
        
        // Progress log every 100 sites
        if ((i + 5) % 100 === 0) {
          console.log(`Progress: ${i + 5}/1000 sites scanned, best so far: ${bestResult?.pscore || 'none'}`);
        }
        
        // Wait 1 second between batches to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (bestResult) {
        const cacheKey = `enterprise_daily_${today}`;
        const dataToCache = {
          winner: bestResult,
          totalScanned: scannedCount,
          scanDate: today,
          scanTimestamp: Date.now()
        };
        
        await KV.put(cacheKey, JSON.stringify(dataToCache), {
          expirationTtl: 60 * 60 * 24 // 24 hours
        });
        
        console.log(`✅ Successfully scanned ${scannedCount} enterprise sites for ${today}`);
        console.log(`🏆 Winner: ${bestResult.url} with P-Score ${bestResult.pscore}`);
      } else {
        console.log('❌ No successful scans completed');
      }
      
    } catch (error) {
      console.error('Enterprise daily scan failed:', error);
    }
  },

  async fetch(request, env, ctx) {
    return new Response('Enterprise daily scanner - use scheduled trigger', { status: 200 });
  }
};

// workers/enterprise-daily-scanner.js
// Scans 1000 random enterprise websites and finds the best performer

export default {
  async scheduled(event, env, ctx) {
    console.log('Starting daily enterprise scan of 1000 random sites...');
    
    // Fortune 1000 + Global 500 + Tech companies + Popular brands
    const ENTERPRISE_DOMAINS = [
      // Top Tech Companies
      'microsoft.com', 'apple.com', 'alphabet.com', 'amazon.com', 'meta.com',
      'tesla.com', 'nvidia.com', 'intel.com', 'amd.com', 'qualcomm.com',
      'salesforce.com', 'oracle.com', 'sap.com', 'adobe.com', 'ibm.com',
      'dell.com', 'hp.com', 'cisco.com', 'vmware.com', 'red hat.com',
      
      // Financial Services
      'jpmorganchase.com', 'bankofamerica.com', 'wellsfargo.com', 'citigroup.com',
      'goldmansachs.com', 'morganstanley.com', 'ubs.com', 'deutschebank.com',
      'hsbc.com', 'barclays.com', 'visa.com', 'mastercard.com', 'amex.com',
      'paypal.com', 'stripe.com', 'square.com', 'blackrock.com', 'vanguard.com',
      
      // Retail & E-commerce
      'walmart.com', 'target.com', 'costco.com', 'kroger.com', 'homedepot.com',
      'lowes.com', 'bestbuy.com', 'macys.com', 'nordstrom.com', 'gap.com',
      'nike.com', 'adidas.com', 'puma.com', 'underarmour.com', 'lululemon.com',
      'zara.com', 'hm.com', 'uniqlo.com', 'ikea.com', 'wayfair.com',
      
      // Automotive
      'ford.com', 'gm.com', 'toyota.com', 'honda.com', 'nissan.com',
      'bmw.com', 'mercedes-benz.com', 'volkswagen.com', 'audi.com', 'porsche.com',
      'ferrari.com', 'lamborghini.com', 'tesla.com', 'rivian.com', 'lucidmotors.com',
      
      // Food & Beverage
      'coca-cola.com', 'pepsico.com', 'nestle.com', 'unilever.com', 'kraftheinz.com',
      'mcdonalds.com', 'starbucks.com', 'yum.com', 'chipotle.com', 'dominos.com',
      'subway.com', 'wendys.com', 'burgerking.com', 'tacobell.com', 'kfc.com',
      
      // Healthcare & Pharma
      'pfizer.com', 'jnj.com', 'abbvie.com', 'merck.com', 'bayer.com',
      'novartis.com', 'roche.com', 'sanofi.com', 'gsk.com', 'astrazeneca.com',
      'unitedhealth.com', 'cvs.com', 'walgreens.com', 'cigna.com', 'anthem.com',
      
      // Energy
      'exxonmobil.com', 'chevron.com', 'shell.com', 'bp.com', 'totalenergies.com',
      'conocophillips.com', 'equinor.com', 'eni.com', 'nexteraenergy.com',
      
      // Aerospace & Defense
      'boeing.com', 'lockheedmartin.com', 'raytheon.com', 'northropgrumman.com',
      'generaldynamics.com', 'airbus.com', 'spacex.com', 'blueorigin.com',
      
      // Telecommunications
      'verizon.com', 'att.com', 't-mobile.com', 'comcast.com', 'charter.com',
      'vodafone.com', 'orange.com', 'deutschetelekom.com', 'telefonica.com',
      
      // Entertainment & Media
      'disney.com', 'comcast.com', 'netflix.com', 'warnermedia.com', 'viacomcbs.com',
      'sony.com', 'nbcuniversal.com', 'fox.com', 'hulu.com', 'spotify.com',
      'youtube.com', 'twitch.tv', 'roblox.com', 'ea.com', 'activision.com',
      
      // Travel & Hospitality
      'marriott.com', 'hilton.com', 'hyatt.com', 'ihg.com', 'airbnb.com',
      'booking.com', 'expedia.com', 'tripadvisor.com', 'delta.com', 'united.com',
      'american airlines.com', 'southwest.com', 'lufthansa.com', 'emirates.com',
      
      // Manufacturing & Industrial
      'ge.com', 'siemens.com', '3m.com', 'caterpillar.com', 'deere.com',
      'honeywell.com', 'emerson.com', 'schneider-electric.com', 'abb.com',
      
      // Consumer Goods
      'pg.com', 'colgate.com', 'loreal.com', 'estee lauder.com', 'lvmh.com',
      'hermes.com', 'gucci.com', 'prada.com', 'burberry.com', 'chanel.com',
      
      // Professional Services
      'deloitte.com', 'pwc.com', 'ey.com', 'kpmg.com', 'accenture.com',
      'mckinsey.com', 'bcg.com', 'bain.com', 'boozallen.com',
      
      // Education & Research
      'harvard.edu', 'stanford.edu', 'mit.edu', 'oxford.ac.uk', 'cambridge.ac.uk',
      'yale.edu', 'princeton.edu', 'columbia.edu', 'upenn.edu', 'cornell.edu',
      
      // Add 900 more by repeating with variations and subdomains
      // ... (truncated for brevity - in production, you'd have the full 1000)
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
      
      // Scan in batches of 10 to avoid overwhelming the API
      for (let i = 0; i < urlsToScan.length; i += 10) {
        const batch = urlsToScan.slice(i, i + 10);
        
        const batchPromises = batch.map(async (url) => {
          try {
            const response = await fetch('https://pythia.pages.dev/api/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url })
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
        if ((i + 10) % 100 === 0) {
          console.log(`Progress: ${i + 10}/1000 sites scanned, best so far: ${bestResult?.pscore || 'none'}`);
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

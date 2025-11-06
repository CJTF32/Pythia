// Pythia™ Enterprise Daily Scanner Worker
// Cron job that scans 1000 random enterprise sites and picks the winner
// Schedule: 0 8 * * * (8:01 AM UTC / 12:01 AM PT daily)

const ENTERPRISE_DOMAINS = [
  // Fortune 500 & major companies
  'microsoft.com', 'apple.com', 'google.com', 'amazon.com', 'facebook.com',
  'berkshirehathaway.com', 'unitedhealth.com', 'mckesson.com', 'cvs.com', 'att.com',
  'exxonmobil.com', 'walmart.com', 'chevron.com', 'ford.com', 'generalmotors.com',
  'ge.com', 'phillips66.com', 'valero.com', 'costco.com', 'kroger.com',
  'generaldynamics.com', 'boeing.com', 'walgreens.com', 'anthem.com', 'marathonpetroleum.com',
  'verizon.com', 'jpmorgan.com', 'homedepot.com', 'bankofamerica.com', 'wellsfargo.com',
  'citigroup.com', 'comcast.com', 'dell.com', 'target.com', 'fanniemae.com',
  'aig.com', 'lowes.com', 'prudential.com', 'cardinal.com', 'statefarmmutual.com',
  'ibm.com', 'intel.com', 'cisco.com', 'oracle.com', 'adobe.com',
  'salesforce.com', 'nvidia.com', 'qualcomm.com', 'broadcom.com', 'texas-instruments.com',
  'netflix.com', 'paypal.com', 'visa.com', 'mastercard.com', 'americanexpress.com',
  'pepsi.com', 'cocacola.com', 'pfizer.com', 'jnj.com', 'abbvie.com',
  'merck.com', 'bristol-myers-squibb.com', 'gilead.com', 'amgen.com', 'biogen.com',
  'disney.com', 'comcast.com', 'viacom.com', 'warnermedia.com', 'sony.com',
  'nike.com', 'adidas.com', 'underarmour.com', 'gap.com', 'nordstrom.com',
  'mcdonalds.com', 'starbucks.com', 'yum.com', 'chipotle.com', 'dominos.com',
  'fedex.com', 'ups.com', 'delta.com', 'united.com', 'american.com',
  'marriott.com', 'hilton.com', 'hyatt.com', 'ihg.com', 'choicehotels.com',
  'tesla.com', 'toyota.com', 'honda.com', 'nissan.com', 'volkswagen.com',
  'siemens.com', 'shell.com', 'bp.com', 'totalenergies.com', 'conocophillips.com',
  // Add more to reach 1000+ pool
  'salesforce.com', 'zoom.us', 'slack.com', 'dropbox.com', 'box.com',
  'atlassian.com', 'spotify.com', 'airbnb.com', 'uber.com', 'lyft.com',
  'doordash.com', 'instacart.com', 'stripe.com', 'square.com', 'coinbase.com'
];

export default {
  async scheduled(event, env, ctx) {
    console.log('Starting Enterprise Daily scan...');

    try {
      // Select random sample of sites to scan (up to 100 per day to save resources)
      const samplesToScan = selectRandomSamples(ENTERPRISE_DOMAINS, 100);
      
      const results = [];
      
      // Scan sites in batches of 5 to respect rate limits
      for (let i = 0; i < samplesToScan.length; i += 5) {
        const batch = samplesToScan.slice(i, i + 5);
        const batchPromises = batch.map(domain => scanEnterpriseSite(domain, env));
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            console.error(`Failed to scan ${batch[idx]}:`, result.reason);
          }
        });

        // Wait 1 second between batches
        if (i + 5 < samplesToScan.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (results.length === 0) {
        console.error('No successful scans');
        return;
      }

      // Find the winner (highest P-Score)
      results.sort((a, b) => b.pscore - a.pscore);
      const winner = results[0];

      // Store the winner
      await env.PYTHIA_TOP50_KV.put('enterprise:daily', JSON.stringify({
        winner: {
          url: winner.url,
          pscore: winner.pscore,
          scannedAt: winner.scannedAt
        },
        date: new Date().toISOString().split('T')[0],
        totalScanned: results.length
      }));

      console.log(`Enterprise scan complete. Winner: ${winner.url} with P-Score ${winner.pscore}`);

    } catch (error) {
      console.error('Enterprise scanner error:', error);
    }
  }
};

function selectRandomSamples(array, count) {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

async function scanEnterpriseSite(domain, env) {
  try {
    const url = `https://${domain}`;
    
    // Add ref param
    const fetchUrl = url + '?ref=pythia';
    
    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PythiaBot/1.0; +https://p-score.me)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      cf: { cacheTtl: 300 },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const headers = Object.fromEntries(response.headers);

    // Calculate P-Score
    const pscore = calculateEnterprisePScore(html, headers);

    return {
      url,
      pscore,
      scannedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`Error scanning ${domain}:`, error.message);
    throw error;
  }
}

function calculateEnterprisePScore(html, headers) {
  // Enterprise-focused scoring
  let score = 100;

  // Speed & Performance
  const htmlSizeKB = html.length / 1024;
  if (htmlSizeKB > 500) score -= 15;
  else if (htmlSizeKB > 200) score -= 8;

  // Security (critical for enterprise)
  if (!headers['strict-transport-security']) score -= 20;
  if (!headers['x-frame-options'] && !headers['content-security-policy']) score -= 15;

  // Accessibility (important for enterprise compliance)
  if ((html.match(/aria-/g) || []).length < 5) score -= 15;

  // Infrastructure
  if (!headers['cf-ray'] && !headers['x-cdn']) score -= 15;
  if (!headers['cache-control']) score -= 10;

  // Modern tech
  if (!html.includes('og:')) score -= 10;
  if (!html.includes('name="viewport"')) score -= 15;

  // Best practices
  if (!html.includes('<!DOCTYPE html>') && !html.includes('<!doctype html>')) score -= 10;

  return Math.max(0, Math.min(100, score));
}

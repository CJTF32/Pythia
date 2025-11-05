// Pythia Top 50 Daily Scanner - Automated Cron Only (Dynamic Tranco Top 50 + Full Scan Integration)

// Core scanSite function - Ported from functions/api/scan.js
async function scanSite(url) {
  const startTime = Date.now();
  
  // Fetch website with timing
  let html = '';
  let siteHeaders = null;
  let contentLength = 0;
  let loadTime = 0;
  
  try {
    const fetchStart = Date.now();
    const [headResponse, htmlResponse] = await Promise.all([
      fetch(url, { 
        method: 'HEAD', 
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PythiaBot/1.0)' }
      }),
      fetch(url, { 
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PythiaBot/1.0)' }
      })
    ]);
    
    loadTime = Date.now() - fetchStart;
    siteHeaders = headResponse.headers;
    html = await htmlResponse.text();
    contentLength = parseInt(siteHeaders.get('content-length') || html.length.toString(), 10);
  } catch (fetchError) {
    console.error(`Fetch failed for ${url}:`, fetchError);
    return { url, pscore: 0, error: fetchError.message, analysisTime: Date.now() - startTime };
  }
  
  // Deep HTML analysis (ported from scan.js)
  const analysis = {
    scripts: (html.match(/<script/gi) || []).length,
    externalScripts: (html.match(/<script[^>]*src=/gi) || []).length,
    inlineScripts: (html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || []).length,
    images: (html.match(/<img/gi) || []).length,
    stylesheets: (html.match(/<link[^>]*rel=["']stylesheet/gi) || []).length,
    inlineStyles: (html.match(/<style/gi) || []).length,
    videos: (html.match(/<video|<iframe[^>]*youtube|<iframe[^>]*vimeo/gi) || []).length,
    fonts: (html.match(/font-face|@font-face/gi) || []).length,
    
    // Performance indicators
    hasAsync: (html.match(/async/gi) || []).length,
    hasDefer: (html.match(/defer/gi) || []).length,
    hasPreload: (html.match(/rel=["']preload/gi) || []).length,
    hasLazyLoad: html.includes('loading="lazy"') || html.includes('data-src'),
    hasMinified: html.includes('.min.js') || html.includes('.min.css'),
    
    // Accessibility
    altTags: (html.match(/alt=["'][^"']*["']/gi) || []).length,
    emptyAlts: (html.match(/alt=["']["']/gi) || []).length,
    ariaLabels: (html.match(/aria-label/gi) || []).length,
    ariaAttrs: (html.match(/aria-/gi) || []).length,
    roles: (html.match(/role=/gi) || []).length,
    labels: (html.match(/<label/gi) || []).length,
    headings: {
      h1: (html.match(/<h1/gi) || []).length,
      h2: (html.match(/<h2/gi) || []).length,
      h3: (html.match(/<h3/gi) || []).length,
    },
    
    // SEO
    title: html.match(/<title>([^<]+)<\/title>/i)?.[1] || '',
    metaDescription: html.match(/meta[^>]*name=["']description["'][^>]*content=["']([^"']+)/i)?.[1] || '',
    ogTags: {
      title: html.includes('og:title'),
      description: html.includes('og:description'),
      image: html.includes('og:image'),
      url: html.includes('og:url'),
    },
    twitterCard: html.includes('twitter:card'),
    canonical: html.includes('rel="canonical"'),
    
    // Modern tech
    hasWebAssembly: html.includes('.wasm') || html.includes('WebAssembly'),
    hasServiceWorker: html.includes('ServiceWorker') || html.includes('navigator.serviceWorker'),
    hasModules: html.includes('type="module"'),
    hasWebP: html.includes('webp') || html.includes('.webp'),
    hasAVIF: html.includes('avif') || html.includes('.avif'),
    frameworks: {
      react: html.match(/react/i) !== null,
      vue: html.match(/vue/i) !== null,
      angular: html.match(/angular/i) !== null,
      svelte: html.match(/svelte/i) !== null,
    },
    
    // Privacy & Security
    trackers: (html.match(/google-analytics|googletagmanager|facebook\.com\/tr|gtag|doubleclick|mouseflow|clarity\.ms|hotjar|mixpanel|segment\.com/gi) || []),
  };
  
  // Count third-party scripts
  const hostname = new URL(url).hostname;
  const scriptMatches = html.match(/<script[^>]*src=["']https?:\/\/[^"']+["']/gi) || [];
  analysis.thirdPartyScripts = scriptMatches.filter(script => !script.includes(hostname)).length;
  
  // Calculate metrics (ported from scan.js)
  // KARPOV: Speed & Performance
  let karpovScore = 85;
  if (loadTime > 5000) karpovScore -= 40;
  else if (loadTime > 3000) karpovScore -= 30;
  else if (loadTime > 2000) karpovScore -= 20;
  else if (loadTime > 1000) karpovScore -= 10;
  else if (loadTime < 500) karpovScore += 10;
  karpovScore -= Math.min(30, analysis.scripts * 2);
  karpovScore -= Math.min(15, analysis.images * 0.6);
  karpovScore -= Math.min(12, analysis.stylesheets * 3.5);
  karpovScore -= Math.min(15, analysis.videos * 8);
  const sizeMB = contentLength / (1024 * 1024);
  karpovScore -= Math.min(25, sizeMB * 10);
  if (analysis.hasAsync > 0) karpovScore += 5;
  if (analysis.hasDefer > 0) karpovScore += 4;
  if (analysis.hasPreload > 0) karpovScore += 3;
  if (analysis.hasLazyLoad) karpovScore += 8;
  if (analysis.hasMinified) karpovScore += 6;
  const karpov = Math.max(0, Math.min(100, Math.round(karpovScore)));
  
  // VORTEX: Accessibility
  let vortexScore = 40;
  const imageAccessScore = analysis.images > 0 ? ((analysis.altTags - analysis.emptyAlts) / analysis.images) * 30 : 5;
  vortexScore += imageAccessScore;
  vortexScore += Math.min(20, analysis.ariaLabels * 2.5);
  vortexScore += Math.min(12, analysis.ariaAttrs * 1);
  vortexScore += Math.min(10, analysis.roles * 2);
  vortexScore += Math.min(10, analysis.labels * 2.5);
  if (analysis.headings.h1 === 1) vortexScore += 8;
  else if (analysis.headings.h1 > 1) vortexScore -= 5;
  else if (analysis.headings.h1 === 0) vortexScore -= 10;
  if (analysis.headings.h2 >= 2) vortexScore += 5;
  const vortex = Math.max(0, Math.min(100, Math.round(vortexScore)));
  
  // NOVA: Scalability & Infrastructure
  let novaScore = 10;
  const cdnProviders = ['cloudflare', 'akamai', 'fastly', 'cloudfront', 'cdn77', 'bunnycdn', 'stackpath'];
  const serverHeader = siteHeaders.get('server')?.toLowerCase() || '';
  const viaHeader = siteHeaders.get('via')?.toLowerCase() || '';
  if (cdnProviders.some(cdn => serverHeader.includes(cdn) || viaHeader.includes(cdn))) novaScore += 35;
  if (siteHeaders.get('x-cache') || siteHeaders.get('cf-cache-status') || siteHeaders.get('x-varnish')) novaScore += 25;
  if (siteHeaders.get('cache-control')?.includes('public')) novaScore += 18;
  if (siteHeaders.get('cache-control')?.includes('max-age')) novaScore += 10;
  const encoding = siteHeaders.get('content-encoding') || '';
  if (encoding.includes('br')) novaScore += 12;
  else if (encoding.includes('gzip')) novaScore += 6;
  const nova = Math.min(100, Math.round(novaScore));
  
  // AETHER: Modern Tech & Future-Readiness
  let aetherScore = 8;
  if (analysis.hasWebAssembly) aetherScore += 22;
  if (analysis.hasServiceWorker) aetherScore += 18;
  if (analysis.hasModules) aetherScore += 16;
  if (analysis.hasWebP) aetherScore += 12;
  if (analysis.hasAVIF) aetherScore += 14;
  if (analysis.hasAsync > 5) aetherScore += 6;
  if (analysis.hasDefer > 5) aetherScore += 4;
  if (analysis.frameworks.react) aetherScore += 8;
  else if (analysis.frameworks.vue || analysis.frameworks.svelte) aetherScore += 10;
  else if (analysis.frameworks.angular) aetherScore += 6;
  const aether = Math.min(100, Math.round(aetherScore));
  
  // PULSE: Social & SEO Optimization
  let pulseScore = 12;
  if (analysis.title && analysis.title.length > 10) pulseScore += 15;
  if (analysis.metaDescription && analysis.metaDescription.length > 50) pulseScore += 12;
  if (analysis.canonical) pulseScore += 11;
  if (analysis.headings.h1 === 1) pulseScore += 8;
  if (analysis.ogTags.title) pulseScore += 14;
  if (analysis.ogTags.description) pulseScore += 11;
  if (analysis.ogTags.image) pulseScore += 16;
  if (analysis.ogTags.url) pulseScore += 6;
  if (analysis.twitterCard) pulseScore += 10;
  const pulse = Math.min(100, Math.round(pulseScore));
  
  // EDEN: Efficiency & Page Weight (Fixed variance)
  let edenScore = 100;
  if (sizeMB > 10) edenScore = Math.max(10, 100 - (sizeMB - 10) * 8);
  else if (sizeMB > 5) edenScore = Math.max(35, 100 - (sizeMB - 5) * 10);
  else if (sizeMB > 3) edenScore = Math.max(55, 100 - (sizeMB - 3) * 12);
  else if (sizeMB > 1.5) edenScore = Math.max(75, 100 - (sizeMB - 1.5) * 15);
  else if (sizeMB < 0.3) edenScore = Math.max(70, 100 - (0.3 - sizeMB) * 50);
  const eden = Math.round(edenScore);
  
  // HELIX: Privacy & Security
  let helixScore = 45;
  helixScore -= analysis.trackers.length * 6.5;
  helixScore -= Math.min(15, analysis.thirdPartyScripts * 1.2);
  if (siteHeaders.get('strict-transport-security')) helixScore += 14;
  if (siteHeaders.get('content-security-policy')) helixScore += 13;
  if (siteHeaders.get('x-frame-options')) helixScore += 10;
  if (siteHeaders.get('x-content-type-options')) helixScore += 8;
  if (siteHeaders.get('referrer-policy')) helixScore += 6;
  if (siteHeaders.get('permissions-policy')) helixScore += 7;
  if (url.startsWith('https://')) helixScore += 5;
  const helix = Math.max(0, Math.min(100, Math.round(helixScore)));
  
  // ECHO: Green Hosting & Sustainability
  let echoScore = 48;
  if (sizeMB < 1) echoScore += 8;
  if (analysis.hasWebP || analysis.hasAVIF) echoScore += 6;
  if (analysis.hasLazyLoad) echoScore += 4;
  try {
    const hostname = new URL(url).hostname;
    const greenUrl = `https://api.thegreenwebfoundation.org/greencheck/${hostname}`;
    const greenResponse = await fetch(greenUrl);
    if (greenResponse.ok) {
      const greenData = await greenResponse.json();
      if (greenData.green) echoScore = Math.min(100, echoScore + 34);
    }
  } catch (e) {
    console.log(`Green check failed for ${url}:`, e.message);
  }
  const echo = Math.round(echoScore);
  
  // QUANTUM: Best Practices & Code Quality
  let quantumScore = 62;
  if (!html.includes('document.write')) quantumScore += 9;
  if (html.includes('integrity=')) quantumScore += 8;
  if (!html.match(/eval\(/)) quantumScore += 7;
  if (html.includes('crossorigin')) quantumScore += 6;
  if (html.includes('rel="noopener"')) quantumScore += 5;
  if (!html.includes('<!DOCTYPE html>') && !html.includes('<!doctype html>')) quantumScore -= 8;
  if (analysis.inlineScripts > 5) quantumScore -= 6;
  const quantum = Math.min(100, Math.round(quantumScore));
  
  // NEXUS: Mobile Responsiveness
  let nexusScore = 48;
  if (html.includes('viewport')) nexusScore += 24;
  const mediaQueries = (html.match(/@media/gi) || []).length;
  nexusScore += Math.min(16, mediaQueries * 2.8);
  if (html.includes('mobile-web-app-capable')) nexusScore += 6;
  if (html.includes('apple-mobile-web-app')) nexusScore += 6;
  const nexus = Math.min(100, Math.round(nexusScore));
  
  // P-SCORE: Equal 10% weighting
  const pscore = (
    karpov * 0.10 +
    vortex * 0.10 +
    pulse * 0.10 +
    helix * 0.10 +
    nexus * 0.10 +
    echo * 0.10 +
    nova * 0.10 +
    quantum * 0.10 +
    aether * 0.10 +
    eden * 0.10
  );
  
  const analysisTime = Date.now() - startTime;
  const pageSize = `${(sizeMB).toFixed(2)} MB`;
  const loadTimeStr = `${(loadTime / 1000).toFixed(2)}s`;
  
  const breakdown = {
    karpov: { loadTimeMs: loadTime, scripts: analysis.scripts, images: analysis.images, stylesheets: analysis.stylesheets, videos: analysis.videos, hasAsync: analysis.hasAsync, hasDefer: analysis.hasDefer, hasMinified: analysis.hasMinified },
    vortex: { totalImages: analysis.images, imagesWithAlt: analysis.altTags, emptyAlts: analysis.emptyAlts, ariaLabels: analysis.ariaLabels, roles: analysis.roles, labels: analysis.labels, h1Count: analysis.headings.h1 },
    nova: { hasCDN: cdnProviders.some(cdn => serverHeader.includes(cdn) || viaHeader.includes(cdn)), hasCache: !!(siteHeaders.get('x-cache') || siteHeaders.get('cf-cache-status')), compression: encoding, serverHeader: serverHeader },
    aether: { hasWebAssembly: analysis.hasWebAssembly, hasServiceWorker: analysis.hasServiceWorker, hasModules: analysis.hasModules, framework: Object.keys(analysis.frameworks).find(k => analysis.frameworks[k]) || 'none' },
    pulse: { hasTitle: !!analysis.title, hasMetaDescription: !!analysis.metaDescription, ogTags: analysis.ogTags, hasCanonical: analysis.canonical },
    eden: { sizeBytes: contentLength, sizeMB: sizeMB },
    helix: { trackerCount: analysis.trackers.length, thirdPartyScripts: analysis.thirdPartyScripts, securityHeaders: { hsts: !!siteHeaders.get('strict-transport-security'), csp: !!siteHeaders.get('content-security-policy'), xFrame: !!siteHeaders.get('x-frame-options') } }
  };
  
  return {
    url,
    timestamp: new Date().toISOString(),
    pscore: Math.round(pscore),
    analysisTime,
    pageSize,
    loadTime: loadTimeStr,
    breakdown,
    metrics: { karpov, vortex, nova, aether, pulse, eden, helix, echo, quantum, nexus }
  };
}

// Cron entry point
export default {
  async scheduled(event, env, ctx) {
    console.log('Top 50 cron started at', new Date().toISOString());
    let top50Urls = [];

    // Fetch dynamic top 50 from Tranco
    try {
      const listIdResponse = await fetch('https://tranco-list.eu/top-1m-id');
      if (!listIdResponse.ok) throw new Error(`HTTP ${listIdResponse.status}`);
      const listId = await listIdResponse.text().trim();
      
      const csvUrl = `https://tranco-list.eu/download/${listId}`;
      const csvResponse = await fetch(csvUrl);
      if (!csvResponse.ok) throw new Error(`HTTP ${csvResponse.status}`);
      const csvText = await csvResponse.text();
      
      const lines = csvText.split('\n').slice(0, 51);
      top50Urls = lines.slice(1)
        .map(line => line.trim())
        .filter(line => line)
        .slice(0, 50)
        .map(domain => `https://${domain}`);
      
      console.log(`Dynamic top 50 fetched from Tranco (${listId}): ${top50Urls[0]} to ${top50Urls[49]}`);
    } catch (error) {
      console.error('Tranco fetch failed:', error);
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

    // Scan sites (batch 5 at a time)
    const results = [];
    for (let i = 0; i < top50Urls.length; i += 5) {
      const batch = top50Urls.slice(i, i + 5);
      const batchPromises = batch.map(async (url) => {
        try {
          console.log(`Scanning top 50 site ${i + 1}: ${url}...`);
          return await scanSite(url);
        } catch (error) {
          console.error(`Full scan failed for ${url}:`, error);
          return { url, pscore: 0, error: error.message };
        }
      });
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      if (i + 5 < top50Urls.length) await new Promise(r => setTimeout(r, 2000));
    }

    // Sort by pscore descending
    results.sort((a, b) => (b.pscore || 0) - (a.pscore || 0));

    // Store in KV
    const dateKey = `top50-${new Date().toISOString().split('T')[0]}`;
    await env.PYTHIA_TOP50_KV.put(dateKey, JSON.stringify(results));
    await env.PYTHIA_TOP50_KV.put('latest-top50', JSON.stringify(results));
    
    console.log(`Top 50 cron complete: ${results.length} sites scanned. Top site: ${results[0]?.url} (P-Score: ${results[0]?.pscore})`);
  }
};

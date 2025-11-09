export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Only POST allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const { url } = await context.request.json();
    
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL required' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const result = { url, timestamp: new Date().toISOString() };
    
    // =================================================================
    // STEP 1: FETCH WEBSITE DATA
    // =================================================================
    
    let html = '';
    let siteHeaders = null;
    let contentLength = 0;
    let loadTime = 0;
    
    try {
      const fetchStart = Date.now();
      const response = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PythiaBot/1.0)' }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      siteHeaders = response.headers;
      const arrayBuffer = await response.arrayBuffer();
      const decoder = new TextDecoder();
      html = decoder.decode(arrayBuffer);
      contentLength = arrayBuffer.byteLength;
      loadTime = Date.now() - fetchStart;

    } catch (error) {
      console.error('Fetch error:', error);
      // Return 502 Bad Gateway if fetch fails
      return new Response(JSON.stringify({ error: `Could not fetch URL: ${error.message}` }), {
        status: 502,
        headers: corsHeaders
      });
    }

    // =================================================================
    // STEP 2: STRING ANALYSIS (POPULATING 'analysis' OBJECT)
    // =================================================================

    const analysis = {};

    analysis.hasViewport = /<meta\s+name=["']viewport["']/i.test(html);
    analysis.images = (html.match(/<img\s[^>]*>/ig) || []).length;
    analysis.imagesWithAlt = (html.match(/<img\s[^>]*alt=["'][^"']+\s*["'][^>]*>/ig) || []).length;
    analysis.totalScripts = (html.match(/<script\s/ig) || []).length;
    analysis.cssLinks = (html.match(/<link\s[^>]*rel=["']stylesheet["'][^>]*>/ig) || []).length;
    analysis.resourceCount = analysis.images + analysis.totalScripts + analysis.cssLinks;
    analysis.title = (html.match(/<title>([^<]+)<\/title>/i) || [])[1];
    analysis.metaDescription = (html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) || [])[1];
    analysis.canonical = /<link\s+rel=["']canonical["']/i.test(html);

    analysis.inlineScripts = (html.match(/<script\s*>[^<]+<\/script>/ig) || []).length;
    analysis.thirdPartyScripts = (html.match(/<script\s[^>]*src=["'](?!https?:\/\/(?!www\.)[a-z0-9]+\.[a-z]{2,5}\/)[^"']+["']/ig) || []).length;
    analysis.hasAsync = (html.match(/<script\s[^>]*async/ig) || []).length;
    analysis.hasDefer = (html.match(/<script\s[^>]*defer/ig) || []).length;

    const trackerPatterns = [/google-analytics.com/, /googletagmanager.com/, /facebook.com\/tr/, /doubleclick.net/, /hotjar.com/, /yandex.ru\/metrika/];
    analysis.trackers = trackerPatterns.filter(p => p.test(html));

    analysis.ogTags = (html.match(/<meta\s+property=["']og:/ig) || []).length;
    analysis.hasDoctype = /^<!DOCTYPE html>/i.test(html.trim());
    analysis.hasDeprecatedTags = (html.match(/<center>|<font>|<strike>|<tt>/ig) || []).length;
    analysis.hasWebAssembly = /WebAssembly\.instantiate/i.test(html);
    analysis.hasServiceWorker = /navigator\.serviceWorker\.register/i.test(html);
    analysis.hasModules = (html.match(/<script\s[^>]*type=["']module["']/ig) || []).length > 0;
    analysis.hasWebp = (html.match(/\.(webp|avif)/ig) || []).length > 0;
    analysis.hasSemanticTags = (html.match(/<header>|<footer>|<main>|<nav>|<section>|<article>/ig) || []).length;


    // =================================================================
    // STEP 3: ECHO GREEN EXTERNAL CHECK
    // =================================================================
    
    let greenWebHosted = false;
    try {
        const hostname = new URL(url).hostname;
        const greenWebResponse = await fetch(`https://api.thegreenwebfoundation.org/api/v3/greencheck/${hostname}`);
        const greenWebData = await greenWebResponse.json();
        greenWebHosted = greenWebData.green === true;
    } catch (error) {
        console.error('Green Web Check failed:', error);
    }


    // =================================================================
    // STEP 4: SCORING LOGIC FOR 11 INDICES
    // =================================================================

    // KARPOV SPEED (Load Time & Resources)
    let karpovScore = 100 - Math.min(100, Math.max(0, (loadTime - 1500) / 20));
    karpovScore -= Math.min(30, analysis.totalScripts + analysis.cssLinks);
    result.karpov = Math.min(100, Math.max(0, Math.round(karpovScore)));

    // TYCHE INTERACTIVITY (Script Efficiency)
    let tycheScore = 90;
    tycheScore -= Math.min(40, analysis.thirdPartyScripts * 5);
    tycheScore -= Math.min(15, analysis.inlineScripts * 1.5);
    if (analysis.hasAsync > 0 || analysis.hasDefer > 0) tycheScore += 10;
    if (analysis.hasAsync > 5 && analysis.hasDefer > 5) tycheScore += 10;
    result.tyche = Math.min(100, Math.max(0, Math.round(tycheScore)));

    // VORTEX ACCESS (Accessibility)
    let vortexScore = 100;
    if (analysis.images > 0) {
      const altRatio = analysis.imagesWithAlt / analysis.images;
      vortexScore *= (0.5 + 0.5 * altRatio);
    }
    if (!analysis.hasViewport) vortexScore -= 30;
    if (analysis.hasSemanticTags < 3) vortexScore -= 10;
    result.vortex = Math.min(100, Math.max(0, Math.round(vortexScore)));

    // NEXUS MOBILE (Mobile Viewport)
    result.nexus = analysis.hasViewport ? 100 : 0;

    // PULSE SEO (Search & Social Optimization)
    let pulseScore = 50;
    if (analysis.title) pulseScore += 10;
    if (analysis.metaDescription) pulseScore += 10;
    if (analysis.ogTags >= 4) pulseScore += 10;
    if (analysis.canonical) pulseScore += 10;
    if (analysis.title && analysis.title.length < 65) pulseScore += 5;
    if (analysis.metaDescription && analysis.metaDescription.length < 160) pulseScore += 5;
    result.pulse = Math.min(100, Math.max(0, Math.round(pulseScore)));

    // EDEN EFFICIENCY (Page Weight)
    const sizeMB = contentLength / (1024 * 1024);
    let edenScore = 100;
    if (sizeMB > 0.5) edenScore = 100 - (sizeMB * 15);
    if (sizeMB > 5.0) edenScore = 0;
    result.eden = Math.min(100, Math.max(0, Math.round(edenScore)));

    // HELIX PRIVACY (Security & Tracking)
    let helixScore = 100;
    helixScore -= Math.min(50, analysis.trackers.length * 10);
    if (siteHeaders.get('strict-transport-security')) helixScore += 10;
    if (siteHeaders.get('content-security-policy')) helixScore += 15;
    if (siteHeaders.get('x-frame-options')) helixScore += 5;
    result.helix = Math.min(100, Math.max(0, Math.round(helixScore)));

    // NOVA SCALABILITY (Infrastructure)
    let novaScore = 50;
    const serverHeader = siteHeaders.get('server') || '';
    const viaHeader = siteHeaders.get('via') || '';
    const cdnProviders = ['cloudflare', 'bunnycdn', 'fastly', 'akamai', 'cloudfront', 'sucuri', 'incapsula', 'x-cdn', 'x-served-by'];
    const isCDN = cdnProviders.some(cdn => serverHeader.toLowerCase().includes(cdn) || viaHeader.toLowerCase().includes(cdn) || siteHeaders.has(cdn));
    
    if (isCDN) novaScore += 30;
    if (siteHeaders.get('cache-control') && siteHeaders.get('cache-control').includes('max-age')) novaScore += 10;
    const encoding = siteHeaders.get('content-encoding');
    if (encoding && (encoding.includes('gzip') || encoding.includes('br'))) novaScore += 10;
    
    result.nova = Math.min(100, Math.max(0, Math.round(novaScore)));
    
    // AETHER TECH (Modern Technology)
    let aetherScore = 10;
    if (analysis.hasWebAssembly) aetherScore += 25;
    if (analysis.hasServiceWorker) aetherScore += 25;
    if (analysis.hasModules) aetherScore += 15;
    if (analysis.hasWebp) aetherScore += 15;
    result.aether = Math.min(100, Math.max(0, Math.round(aetherScore)));

    // QUANTUM QUALITY (Code Best Practices)
    let quantumScore = 80;
    if (!analysis.hasDoctype) quantumScore -= 20;
    if (analysis.hasDeprecatedTags > 0) quantumScore -= Math.min(30, analysis.hasDeprecatedTags * 3);
    result.quantum = Math.min(100, Math.max(0, Math.round(quantumScore)));

    // ECHO GREEN (Sustainable Hosting)
    result.echo = greenWebHosted ? 100 : 0;

// scan-5.js: After all scoring logic (e.g., after the 'echo' score calculation)
// Add all individual scores to the overall result object and calculate the final pscore.

// =================================================================
// STEP 5: FINAL P-SCORE CALCULATION
// =================================================================
const overallPScore = (
    result.karpov * 0.20 +
    result.tyche * 0.15 +
    result.vortex * 0.10 +
    result.nexus * 0.05 +
    result.helix * 0.15 +
    result.pulse * 0.05 +
    result.nova * 0.10 +
    result.eden * 0.10 +
    result.aether * 0.05 +
    result.quantum * 0.03 +
    result.echo * 0.02 // Total must equal 1.00 or 100%
);

// =================================================================
// STEP 6: CONSTRUCT FINAL PAYLOAD
// =================================================================
const fullResult = {
    pscore: Math.min(100, Math.max(0, Math.round(overallPScore))),
    url: result.url,
    timestamp: result.timestamp,
    
    // Crucially, include all individual scores at the top level for the front-end
    karpov: result.karpov,
    tyche: result.tyche,
    vortex: result.vortex,
    nexus: result.nexus,
    helix: result.helix,
    pulse: result.pulse,
    nova: result.nova,
    eden: result.eden,
    aether: result.aether,
    quantum: result.quantum,
    echo: result.echo,

    // Nested data for sub-pages
    data: {
        karpov: { loadTime: loadTime, resourceCount: analysis.resourceCount },
        tyche: { totalScripts: analysis.totalScripts, thirdPartyScripts: analysis.thirdPartyScripts, hasAsync: analysis.hasAsync, hasDefer: analysis.hasDefer },
        vortex: { totalImages: analysis.images, imagesWithAlt: analysis.imagesWithAlt, hasSemanticTags: analysis.hasSemanticTags },
        nexus: { hasViewport: analysis.hasViewport },
        pulse: { hasTitle: !!analysis.title, hasMetaDescription: !!analysis.metaDescription, ogTags: analysis.ogTags, hasCanonical: analysis.canonical },
        eden: { sizeBytes: contentLength }, // sizeMB is calculated on the front-end now
        helix: { trackerCount: analysis.trackers.length, securityHeaders: { hsts: !!siteHeaders.get('strict-transport-security'), csp: !!siteHeaders.get('content-security-policy'), xFrame: !!siteHeaders.get('x-frame-options') } },
        nova: { isCDN: isCDN, hasCache: !!siteHeaders.get('cache-control'), compression: encoding },
        aether: { hasWebAssembly: analysis.hasWebAssembly, hasServiceWorker: analysis.hasServiceWorker, hasModules: analysis.hasModules, hasWebp: analysis.hasWebp },
        quantum: { hasDoctype: analysis.hasDoctype, hasDeprecatedTags: analysis.hasDeprecatedTags },
        echo: { isGreenHosted: greenWebHosted }
    }
};

return new Response(JSON.stringify(fullResult), {
    status: 200,
    headers: corsHeaders
});
// ... end of the try block
    
  } catch (error) {
    console.error('Final Scan error:', error);
    // Return 500 Internal Server Error for general execution errors
    return new Response(JSON.stringify({
      error: 'An internal server error occurred during scanning.',
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

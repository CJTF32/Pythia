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
    // 1. INPUT PARSING
    const { url } = await context.request.json();
    
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL required' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const result = { url, timestamp: new Date().toISOString() };
    
    // =================================================================
    // STEP 2: FETCH WEBSITE DATA (Aggressive Error Handling)
    // =================================================================
    
    let html = '';
    // Initialize siteHeaders as a new, empty Headers object if fetch fails
    let siteHeaders = new Headers(); 
    let contentLength = 0;
    let loadTime = 0;
    let finalUrl = url; // Used to track potential redirects

    try {
      const fetchStart = Date.now();
      const response = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          // Crucial: Set a User-Agent to avoid blocking by some firewalls
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PythiaBot/1.0)' }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      finalUrl = response.url; // Capture the final URL after redirects
      siteHeaders = response.headers;
      
      const arrayBuffer = await response.arrayBuffer();
      const decoder = new TextDecoder();
      html = decoder.decode(arrayBuffer);
      contentLength = arrayBuffer.byteLength;
      loadTime = Date.now() - fetchStart;

    } catch (error) {
      console.error('Core Fetch Failed:', error);
      // Return a 502 error if the main content cannot be fetched
      return new Response(JSON.stringify({ 
        error: `Could not fetch URL: ${error.message}. Check URL validity or server status.`,
      }), {
        status: 502,
        headers: corsHeaders
      });
    }

    // =================================================================
    // STEP 3: STRING ANALYSIS
    // =================================================================

    const analysis = {};
    // Defensive regex checks for analysis
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
    // STEP 4: ECHO GREEN EXTERNAL CHECK (Robust Hostname Extraction)
    // =================================================================
    
    let greenWebHosted = false;
    let hostname;
    try {
        hostname = new URL(finalUrl).hostname; // Use the final URL after redirects
        const greenWebResponse = await fetch(`https://api.thegreenwebfoundation.org/api/v3/greencheck/${hostname}`);
        const greenWebData = await greenWebResponse.json();
        greenWebHosted = greenWebData.green === true;
    } catch (error) {
        console.error('Green Web Check failed:', error);
        // Green check failure should NOT stop the main scan
    }


    // =================================================================
    // STEP 5: SCORING LOGIC
    // =================================================================

    // KARPOV SPEED 
    let karpovScore = 100 - Math.min(100, Math.max(0, (loadTime - 1500) / 20));
    karpovScore -= Math.min(30, analysis.totalScripts + analysis.cssLinks);
    result.karpov = Math.min(100, Math.max(0, Math.round(karpovScore)));

    // TYCHE INTERACTIVITY 
    let tycheScore = 90;
    tycheScore -= Math.min(40, analysis.thirdPartyScripts * 5);
    tycheScore -= Math.min(15, analysis.inlineScripts * 1.5);
    if (analysis.hasAsync > 0 || analysis.hasDefer > 0) tycheScore += 10;
    if (analysis.hasAsync > 5 && analysis.hasDefer > 5) tycheScore += 10;
    result.tyche = Math.min(100, Math.max(0, Math.round(tycheScore)));

    // VORTEX ACCESS 
    let vortexScore = 100;
    if (analysis.images > 0) {
      const altRatio = analysis.imagesWithAlt / analysis.images;
      vortexScore *= (0.5 + 0.5 * altRatio);
    }
    if (!analysis.hasViewport) vortexScore -= 30;
    if (analysis.hasSemanticTags < 3) vortexScore -= 10;
    result.vortex = Math.min(100, Math.max(0, Math.round(vortexScore)));

    // NEXUS MOBILE 
    result.nexus = analysis.hasViewport ? 100 : 0;

    // PULSE SEO 
    let pulseScore = 50;
    if (analysis.title) pulseScore += 10;
    if (analysis.metaDescription) pulseScore += 10;
    if (analysis.ogTags >= 4) pulseScore += 10;
    if (analysis.canonical) pulseScore += 10;
    if (analysis.title && analysis.title.length < 65) pulseScore += 5;
    if (analysis.metaDescription && analysis.metaDescription.length < 160) pulseScore += 5;
    result.pulse = Math.min(100, Math.max(0, Math.round(pulseScore)));

    // EDEN EFFICIENCY 
    const sizeMB = contentLength / (1024 * 1024);
    let edenScore = 100;
    if (sizeMB > 0.5) edenScore = 100 - (sizeMB * 15);
    if (sizeMB > 5.0) edenScore = 0;
    result.eden = Math.min(100, Math.max(0, Math.round(edenScore)));

    // HELIX PRIVACY (Uses siteHeaders)
    let helixScore = 100;
    helixScore -= Math.min(50, analysis.trackers.length * 10);
    if (siteHeaders.get('strict-transport-security')) helixScore += 10;
    if (siteHeaders.get('content-security-policy')) helixScore += 15;
    if (siteHeaders.get('x-frame-options')) helixScore += 5;
    result.helix = Math.min(100, Math.max(0, Math.round(helixScore)));

    // NOVA SCALABILITY (Uses siteHeaders)
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
    
    // AETHER TECH 
    let aetherScore = 10;
    if (analysis.hasWebAssembly) aetherScore += 25;
    if (analysis.hasServiceWorker) aetherScore += 25;
    if (analysis.hasModules) aetherScore += 15;
    if (analysis.hasWebp) aetherScore += 15;
    result.aether = Math.min(100, Math.max(0, Math.round(aetherScore)));

    // QUANTUM QUALITY 
    let quantumScore = 80;
    if (!analysis.hasDoctype) quantumScore -= 20;
    if (analysis.hasDeprecatedTags > 0) quantumScore -= Math.min(30, analysis.hasDeprecatedTags * 3);
    result.quantum = Math.min(100, Math.max(0, Math.round(quantumScore)));

    // ECHO GREEN 
    result.echo = greenWebHosted ? 100 : 0;


    // =================================================================
    // STEP 6: OVERALL P-SCORE CALCULATION & PAYLOAD
    // =================================================================
    
    const overallPScore = (
        (result.karpov * 0.18) +
        (result.tyche * 0.20) +
        (result.vortex * 0.12) +
        (result.nexus * 0.10) +
        (result.helix * 0.10) +
        (result.pulse * 0.08) +
        (result.nova * 0.08) +
        (result.eden * 0.05) +
        (result.aether * 0.04) +
        (result.quantum * 0.03) +
        (result.echo * 0.02)
    ) / 1.0; 

    const pscore = Math.min(100, Math.max(0, Math.round(overallPScore)));


    // FINAL PAYLOAD (Flat scores for frontend compatibility)
    const fullResult = {
      pscore: pscore,
      url: result.url,
      timestamp: result.timestamp,
      
      // FLAT SCORES
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
      
      // RAW DATA
      data: {
          karpov: { loadTime: loadTime, resourceCount: analysis.resourceCount },
          tyche: { inlineScripts: analysis.inlineScripts, thirdPartyScripts: analysis.thirdPartyScripts, hasAsync: analysis.hasAsync, hasDefer: analysis.hasDefer },
          vortex: { images: analysis.images, imagesWithAlt: analysis.imagesWithAlt, hasSemanticTags: analysis.hasSemanticTags },
          nexus: { hasViewport: analysis.hasViewport },
          pulse: { hasTitle: !!analysis.title, hasMetaDescription: !!analysis.metaDescription, ogTags: analysis.ogTags, hasCanonical: analysis.canonical },
          eden: { sizeBytes: contentLength, sizeMB: sizeMB },
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
    
  } catch (error) {
    // Catch-all for scoring or final packaging errors
    console.error('Catch-all Execution Error:', error);
    return new Response(JSON.stringify({
      error: 'An internal server error occurred during scanning. Check the worker logs for details.',
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

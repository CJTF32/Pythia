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
      return new Response(JSON.stringify({
        error: true,
        message: `Could not fetch website: ${fetchError.message}`
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Deep HTML analysis
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
    
    // Count third-party scripts separately
    const hostname = new URL(url).hostname;
    const scriptMatches = html.match(/<script[^>]*src=["']https?:\/\/[^"']+["']/gi) || [];
    analysis.thirdPartyScripts = scriptMatches.filter(script => !script.includes(hostname)).length;
    
    // Calculate KARPOV: Speed & Performance (0-100)
    let karpovScore = 85;
    
    // Load time penalty (more aggressive)
    if (loadTime > 5000) karpovScore -= 40;
    else if (loadTime > 3000) karpovScore -= 30;
    else if (loadTime > 2000) karpovScore -= 20;
    else if (loadTime > 1000) karpovScore -= 10;
    else if (loadTime < 500) karpovScore += 10;
    
    // Resource penalties (harsher)
    karpovScore -= Math.min(30, analysis.scripts * 2);
    karpovScore -= Math.min(15, analysis.images * 0.6);
    karpovScore -= Math.min(12, analysis.stylesheets * 3.5);
    karpovScore -= Math.min(15, analysis.videos * 8);
    
    // Size penalty (much harsher)
    const sizeMB = contentLength / (1024 * 1024);
    karpovScore -= Math.min(25, sizeMB * 10);
    
    // Performance bonuses
    if (analysis.hasAsync > 0) karpovScore += 5;
    if (analysis.hasDefer > 0) karpovScore += 4;
    if (analysis.hasPreload > 0) karpovScore += 3;
    if (analysis.hasLazyLoad) karpovScore += 8;
    if (analysis.hasMinified) karpovScore += 6;
    
    result.karpov = Math.max(0, Math.min(100, Math.round(karpovScore)));
    
    // Calculate VORTEX: Accessibility (0-100)
    let vortexScore = 40;
    
    // Image accessibility (stricter)
    const imageAccessScore = analysis.images > 0 
      ? ((analysis.altTags - analysis.emptyAlts) / analysis.images) * 30
      : 5;
    vortexScore += imageAccessScore;
    
    // ARIA attributes
    vortexScore += Math.min(20, analysis.ariaLabels * 2.5);
    vortexScore += Math.min(12, analysis.ariaAttrs * 1);
    vortexScore += Math.min(10, analysis.roles * 2);
    
    // Form accessibility
    vortexScore += Math.min(10, analysis.labels * 2.5);
    
    // Heading structure
    if (analysis.headings.h1 === 1) vortexScore += 8;
    else if (analysis.headings.h1 > 1) vortexScore -= 5;
    else if (analysis.headings.h1 === 0) vortexScore -= 10;
    if (analysis.headings.h2 >= 2) vortexScore += 5;
    
    result.vortex = Math.max(0, Math.min(100, Math.round(vortexScore)));
    
    // Calculate NOVA: Scalability & Infrastructure (0-100)
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
    
    result.nova = Math.min(100, Math.round(novaScore));
    
    // Calculate AETHER: Modern Tech & Future-Readiness (0-100)
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
    
    result.aether = Math.min(100, Math.round(aetherScore));
    
    // Calculate PULSE: Social & SEO Optimization (0-100)
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
    
    result.pulse = Math.min(100, Math.round(pulseScore));
    
    // Calculate EDEN: Efficiency & Page Weight (0-100)
    let edenScore = 100;
    
    if (sizeMB > 5) edenScore = Math.max(15, 100 - (sizeMB - 5) * 16);
    else if (sizeMB > 3) edenScore = Math.max(48, 100 - (sizeMB - 3) * 13);
    else if (sizeMB > 1) edenScore = Math.max(72, 100 - (sizeMB - 1) * 9);
    
    // Bonus for efficient sites
    if (sizeMB < 0.5) edenScore = 100;
    
    result.eden = Math.round(edenScore);
    
    // Calculate HELIX: Privacy & Security (0-100)
    let helixScore = 45;
    
    // Tracker penalty (harsh)
    helixScore -= analysis.trackers.length * 6.5;
    helixScore -= Math.min(15, analysis.thirdPartyScripts * 1.2);
    
    // Security headers (bonuses)
    if (siteHeaders.get('strict-transport-security')) helixScore += 14;
    if (siteHeaders.get('content-security-policy')) helixScore += 13;
    if (siteHeaders.get('x-frame-options')) helixScore += 10;
    if (siteHeaders.get('x-content-type-options')) helixScore += 8;
    if (siteHeaders.get('referrer-policy')) helixScore += 6;
    if (siteHeaders.get('permissions-policy')) helixScore += 7;
    if (url.startsWith('https://')) helixScore += 5;
    
    result.helix = Math.max(0, Math.min(100, Math.round(helixScore)));
    
    // Calculate ECHO: Green Hosting & Sustainability (0-100)
    let echoScore = 48;
    
    // Small, efficient sites get sustainability bonus
    if (sizeMB < 1) echoScore += 8;
    if (analysis.hasWebP || analysis.hasAVIF) echoScore += 6;
    if (analysis.hasLazyLoad) echoScore += 4;
    
    // Check green hosting
    try {
      const hostname = new URL(url).hostname;
      const greenUrl = `https://api.thegreenwebfoundation.org/greencheck/${hostname}`;
      const greenResponse = await fetch(greenUrl);
      if (greenResponse.ok) {
        const greenData = await greenResponse.json();
        if (greenData.green) echoScore = Math.min(100, echoScore + 34);
      }
    } catch (e) {
      console.log('Green check failed:', e.message);
    }
    
    result.echo = Math.round(echoScore);
    
    // Calculate QUANTUM: Best Practices & Code Quality (0-100)
    let quantumScore = 62;
    
    if (!html.includes('document.write')) quantumScore += 9;
    if (html.includes('integrity=')) quantumScore += 8;
    if (!html.match(/eval\(/)) quantumScore += 7;
    if (html.includes('crossorigin')) quantumScore += 6;
    if (html.includes('rel="noopener"')) quantumScore += 5;
    if (!html.includes('<!DOCTYPE html>') && !html.includes('<!doctype html>')) quantumScore -= 8;
    
    // Inline script penalty
    if (analysis.inlineScripts > 5) quantumScore -= 6;
    
    result.quantum = Math.min(100, Math.round(quantumScore));
    
    // Calculate NEXUS: Mobile Responsiveness (0-100)
    let nexusScore = 48;
    
    if (html.includes('viewport')) nexusScore += 24;
    
    const mediaQueries = (html.match(/@media/gi) || []).length;
    nexusScore += Math.min(16, mediaQueries * 2.8);
    
    if (html.includes('mobile-web-app-capable')) nexusScore += 6;
    if (html.includes('apple-mobile-web-app')) nexusScore += 6;
    
    result.nexus = Math.min(100, Math.round(nexusScore));
    
    // Calculate P-SCORE: Unified Performance Score (0-100)
    const pScore = (
      result.karpov * 0.25 +
      result.vortex * 0.15 +
      result.nova * 0.12 +
      result.aether * 0.10 +
      result.pulse * 0.10 +
      result.eden * 0.08 +
      result.helix * 0.08 +
      result.echo * 0.07 +
      result.quantum * 0.03 +
      result.nexus * 0.02
    );
    result.pscore = Math.round(pScore);
    
    // Add metadata and detailed breakdown
    result.analysisTime = Date.now() - startTime;
    result.pageSize = `${(sizeMB).toFixed(2)} MB`;
    result.loadTime = `${(loadTime / 1000).toFixed(2)}s`;
    
    // Detailed breakdown for export/analysis
    result.breakdown = {
      karpov: {
        loadTimeMs: loadTime,
        scripts: analysis.scripts,
        images: analysis.images,
        stylesheets: analysis.stylesheets,
        videos: analysis.videos,
        hasAsync: analysis.hasAsync,
        hasDefer: analysis.hasDefer,
        hasMinified: analysis.hasMinified
      },
      vortex: {
        totalImages: analysis.images,
        imagesWithAlt: analysis.altTags,
        emptyAlts: analysis.emptyAlts,
        ariaLabels: analysis.ariaLabels,
        roles: analysis.roles,
        labels: analysis.labels,
        h1Count: analysis.headings.h1
      },
      nova: {
        hasCDN: cdnProviders.some(cdn => serverHeader.includes(cdn) || viaHeader.includes(cdn)),
        hasCache: !!(siteHeaders.get('x-cache') || siteHeaders.get('cf-cache-status')),
        compression: encoding,
        serverHeader: serverHeader
      },
      aether: {
        hasWebAssembly: analysis.hasWebAssembly,
        hasServiceWorker: analysis.hasServiceWorker,
        hasModules: analysis.hasModules,
        framework: Object.keys(analysis.frameworks).find(k => analysis.frameworks[k]) || 'none'
      },
      pulse: {
        hasTitle: !!analysis.title,
        hasMetaDescription: !!analysis.metaDescription,
        ogTags: analysis.ogTags,
        hasCanonical: analysis.canonical
      },
      eden: {
        sizeBytes: contentLength,
        sizeMB: sizeMB
      },
      helix: {
        trackerCount: analysis.trackers.length,
        thirdPartyScripts: analysis.thirdPartyScripts,
        securityHeaders: {
          hsts: !!siteHeaders.get('strict-transport-security'),
          csp: !!siteHeaders.get('content-security-policy'),
          xFrame: !!siteHeaders.get('x-frame-options')
        }
      }
    };
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Scan error:', error);
    return new Response(JSON.stringify({
      error: true,
      message: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

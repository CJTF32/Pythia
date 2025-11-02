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
    
    // Fetch website content first (this always works)
    let html = '';
    let siteHeaders = null;
    let contentLength = 0;
    
    try {
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
    
    // Try PageSpeed API (but don't fail if it doesn't work)
    let categories = {};
    let audits = {};
    let pageSpeedFailed = false;
    
    try {
      const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=desktop&category=performance&category=accessibility&category=best-practices&category=seo`;
      const psResponse = await fetch(psUrl, {
        headers: {
          'Referer': 'https://pythia-3n2.pages.dev'
        }
      });
      
      if (psResponse.status === 429) {
        pageSpeedFailed = true;
        console.log('PageSpeed rate limited, using heuristics only');
      } else if (!psResponse.ok) {
        pageSpeedFailed = true;
        console.log(`PageSpeed failed with ${psResponse.status}`);
      } else {
        const psData = await psResponse.json();
        audits = psData.lighthouseResult?.audits || {};
        categories = psData.lighthouseResult?.categories || {};
      }
    } catch (psError) {
      pageSpeedFailed = true;
      console.log('PageSpeed error:', psError.message);
    }
    
    // KARPOV: Speed & Performance (0-100)
    if (categories.performance) {
      result.karpov = Math.round(categories.performance.score * 100);
    } else {
      // Heuristic fallback based on page size and resource count
      const scripts = (html.match(/<script/gi) || []).length;
      const images = (html.match(/<img/gi) || []).length;
      const stylesheets = (html.match(/<link.*stylesheet/gi) || []).length;
      const sizeMB = contentLength / (1024 * 1024);
      
      let karpovScore = 100;
      karpovScore -= Math.min(30, scripts * 2);
      karpovScore -= Math.min(20, images * 1);
      karpovScore -= Math.min(15, sizeMB * 10);
      result.karpov = Math.max(0, Math.round(karpovScore));
    }
    
    // VORTEX: Accessibility (0-100)
    if (categories.accessibility) {
      result.vortex = Math.round(categories.accessibility.score * 100);
    } else {
      // Heuristic fallback
      let vortexScore = 60;
      if (html.match(/alt="/gi)) vortexScore += 15;
      if (html.match(/aria-/gi)) vortexScore += 15;
      if (html.match(/role="/gi)) vortexScore += 10;
      result.vortex = Math.min(100, vortexScore);
    }
    
    // NOVA: Scalability & Infrastructure (0-100)
    let novaScore = 0;
    const cdnProviders = ['cloudflare', 'akamai', 'fastly', 'cloudfront', 'cdn'];
    const serverHeader = siteHeaders.get('server')?.toLowerCase() || '';
    if (cdnProviders.some(cdn => serverHeader.includes(cdn))) novaScore += 35;
    if (siteHeaders.get('x-cache') || siteHeaders.get('cf-cache-status')) novaScore += 25;
    if (siteHeaders.get('cache-control')?.includes('public')) novaScore += 20;
    const encoding = siteHeaders.get('content-encoding') || '';
    if (encoding.includes('br') || encoding.includes('gzip')) novaScore += 20;
    result.nova = Math.min(100, novaScore);
    
    // AETHER: Modern Tech & Future-Readiness (0-100)
    let aetherScore = 0;
    if (html.includes('.wasm') || html.includes('WebAssembly')) aetherScore += 25;
    if (html.includes('type="module"') || html.includes('import ')) aetherScore += 20;
    if (html.includes('ServiceWorker') || html.includes('navigator.serviceWorker')) aetherScore += 20;
    if (html.includes('async') || html.includes('defer')) aetherScore += 15;
    if (html.match(/react|vue|angular|svelte/i)) aetherScore += 10;
    if (html.includes('webp') || html.includes('avif')) aetherScore += 10;
    result.aether = Math.min(100, aetherScore);
    
    // PULSE: Social & SEO Optimization (0-100)
    let pulseScore = 0;
    if (html.includes('og:title')) pulseScore += 20;
    if (html.includes('og:description')) pulseScore += 15;
    if (html.includes('og:image')) pulseScore += 20;
    if (html.includes('twitter:card')) pulseScore += 15;
    if (html.includes('rel="canonical"')) pulseScore += 15;
    if (categories.seo) {
      pulseScore += categories.seo.score * 15;
    } else {
      if (html.match(/<title>/i)) pulseScore += 10;
      if (html.match(/meta.*description/i)) pulseScore += 5;
    }
    result.pulse = Math.round(Math.min(100, pulseScore));
    
    // EDEN: Efficiency & Page Weight (0-100)
    const sizeMB = contentLength / (1024 * 1024);
    let edenScore = 100;
    if (sizeMB > 3) edenScore = Math.max(0, 100 - (sizeMB - 3) * 15);
    else if (sizeMB > 1) edenScore = Math.max(70, 100 - (sizeMB - 1) * 10);
    result.eden = Math.round(edenScore);
    
    // HELIX: Privacy & Security (0-100)
    let helixScore = 50;
    const trackers = html.match(/google-analytics|facebook\.com\/tr|gtag|doubleclick|mouseflow|clarity\.ms|hotjar|mixpanel/gi) || [];
    helixScore -= trackers.length * 8;
    if (siteHeaders.get('strict-transport-security')) helixScore += 15;
    if (siteHeaders.get('content-security-policy')) helixScore += 15;
    if (siteHeaders.get('x-frame-options')) helixScore += 10;
    if (siteHeaders.get('x-content-type-options')) helixScore += 10;
    result.helix = Math.max(0, Math.min(100, helixScore));
    
    // ECHO: Green Hosting & Sustainability (0-100)
    let echoScore = 50;
    try {
      const hostname = new URL(url).hostname;
      const greenUrl = `https://api.thegreenwebfoundation.org/greencheck/${hostname}`;
      const greenResponse = await fetch(greenUrl);
      if (greenResponse.ok) {
        const greenData = await greenResponse.json();
        if (greenData.green) echoScore = 100;
      }
    } catch (e) {
      console.log('Green check failed:', e.message);
    }
    result.echo = echoScore;
    
    // QUANTUM: Best Practices & Code Quality (0-100)
    if (categories['best-practices']) {
      result.quantum = Math.round(categories['best-practices'].score * 100);
    } else {
      let quantumScore = 60;
      if (!html.includes('document.write')) quantumScore += 10;
      if (html.includes('integrity=')) quantumScore += 10;
      if (!html.match(/eval\(/)) quantumScore += 10;
      if (html.includes('crossorigin')) quantumScore += 10;
      result.quantum = Math.min(100, quantumScore);
    }
    
    // NEXUS: Mobile Responsiveness (0-100)
    let nexusScore = 60;
    if (html.includes('viewport')) nexusScore += 20;
    if (html.match(/@media|media="/i)) nexusScore += 10;
    if (html.includes('mobile-web-app-capable') || html.includes('apple-mobile-web-app')) nexusScore += 10;
    result.nexus = Math.min(100, nexusScore);
    
    // P-SCORE: Unified Performance Score (0-100)
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
    
    // Add note if PageSpeed failed
    if (pageSpeedFailed) {
      result.note = 'Some scores use heuristics due to API limits';
    }
    
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

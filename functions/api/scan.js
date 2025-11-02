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
    
    const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=desktop&category=performance&category=accessibility&category=best-practices&category=seo`;
    const psResponse = await fetch(psUrl);
    
    if (!psResponse.ok) {
      throw new Error(`PageSpeed failed: ${psResponse.status}`);
    }
    
    const psData = await psResponse.json();
    const audits = psData.lighthouseResult?.audits || {};
    const categories = psData.lighthouseResult?.categories || {};
    
    const [headResponse, htmlResponse] = await Promise.all([
      fetch(url, { method: 'HEAD', redirect: 'follow' }),
      fetch(url, { redirect: 'follow' })
    ]);
    
    const siteHeaders = headResponse.headers;
    const html = await htmlResponse.text();
    const contentLength = parseInt(siteHeaders.get('content-length') || html.length.toString(), 10);
    
    const speedScore = categories.performance?.score || 0.5;
    result.karpov = Math.round(speedScore * 100);
    
    const accessibilityScore = categories.accessibility?.score || 0.7;
    result.vortex = Math.round(accessibilityScore * 100);
    
    let novaScore = 0;
    const cdnProviders = ['cloudflare', 'akamai', 'fastly', 'cloudfront', 'cdn'];
    const serverHeader = siteHeaders.get('server')?.toLowerCase() || '';
    if (cdnProviders.some(cdn => serverHeader.includes(cdn))) novaScore += 35;
    if (siteHeaders.get('x-cache') || siteHeaders.get('cf-cache-status')) novaScore += 25;
    if (siteHeaders.get('cache-control')?.includes('public')) novaScore += 20;
    if (siteHeaders.get('content-encoding')?.includes('br') || siteHeaders.get('content-encoding')?.includes('gzip')) novaScore += 20;
    result.nova = Math.min(100, novaScore);
    
    let aetherScore = 0;
    if (html.includes('.wasm') || html.includes('WebAssembly')) aetherScore += 25;
    if (html.includes('type="module"') || html.includes('import ')) aetherScore += 20;
    if (html.includes('ServiceWorker') || html.includes('navigator.serviceWorker')) aetherScore += 20;
    if (html.includes('async') || html.includes('defer')) aetherScore += 15;
    if (html.match(/react|vue|angular|svelte/i)) aetherScore += 10;
    if (html.includes('webp') || html.includes('avif')) aetherScore += 10;
    result.aether = Math.min(100, aetherScore);
    
    let pulseScore = 0;
    if (html.includes('og:title')) pulseScore += 20;
    if (html.includes('og:description')) pulseScore += 15;
    if (html.includes('og:image')) pulseScore += 20;
    if (html.includes('twitter:card')) pulseScore += 15;
    if (html.includes('rel="canonical"')) pulseScore += 15;
    const seoScore = categories.seo?.score || 0;
    pulseScore += seoScore * 15;
    result.pulse = Math.round(Math.min(100, pulseScore));
    
    const sizeMB = contentLength / (1024 * 1024);
    let edenScore = 100;
    if (sizeMB > 3) edenScore = Math.max(0, 100 - (sizeMB - 3) * 15);
    else if (sizeMB > 1) edenScore = Math.max(70, 100 - (sizeMB - 1) * 10);
    result.eden = Math.round(edenScore);
    
    let helixScore = 50;
    const trackers = html.match(/google-analytics|facebook\.com\/tr|pixel|hotjar|mixpanel|gtag|doubleclick|mouseflow|clarity\.ms/gi) || [];
    helixScore -= trackers.length * 8;
    if (siteHeaders.get('strict-transport-security')) helixScore += 15;
    if (siteHeaders.get('content-security-policy')) helixScore += 15;
    if (siteHeaders.get('x-frame-options')) helixScore += 10;
    if (siteHeaders.get('x-content-type-options')) helixScore += 10;
    result.helix = Math.max(0, Math.min(100, helixScore));
    
    const hostname = new URL(url).hostname;
    let echoScore = 50;
    try {
      const greenUrl = `https://api.thegreenwebfoundation.org/greencheck/${hostname}`;
      const greenResponse = await fetch(greenUrl);
      const greenData = await greenResponse.json();
      if (greenData.green) echoScore = 100;
    } catch (e) {
      console.log('Green check failed:', e.message);
    }
    result.echo = echoScore;
    
    const bestPracticesScore = categories['best-practices']?.score || 0.7;
    result.quantum = Math.round(bestPracticesScore * 100);
    
    let nexusScore = 60;
    if (html.includes('viewport')) nexusScore += 20;
    if (html.match(/@media|media="/i)) nexusScore += 10;
    if (html.includes('mobile-web-app-capable') || html.includes('apple-mobile-web-app')) nexusScore += 10;
    result.nexus = Math.min(100, nexusScore);
    
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

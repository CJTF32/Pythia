// Pythia™ Scan API - Main Website Analysis Endpoint
// Rate limited, respects robots.txt, legal compliant

export async function onRequest(context) {
  const { request, env } = context;
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let targetUrl;
    
    // Support both GET (query param) and POST (JSON body)
    if (request.method === 'POST') {
      const body = await request.json();
      targetUrl = body.url;
    } else {
      const url = new URL(request.url);
      targetUrl = url.searchParams.get('url');
    }

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'URL parameter required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Rate limiting check
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitKey = `ratelimit:${clientIP}`;
    const RATE_LIMIT = 25; // scans per hour

    if (env.PYTHIA_TOP50_KV) {
      try {
        const current = await env.PYTHIA_TOP50_KV.get(rateLimitKey);
        const count = current ? parseInt(current) : 0;

        if (count >= RATE_LIMIT) {
          return new Response(JSON.stringify({ 
            error: 'Rate limit exceeded. Maximum 25 scans per hour.' 
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        await env.PYTHIA_TOP50_KV.put(rateLimitKey, (count + 1).toString(), { expirationTtl: 3600 });
      } catch (kvError) {
        // If KV fails, log but continue (don't block the scan)
        console.log('KV error (rate limit):', kvError.message);
      }
    }

    // Check cache first
    const cacheKey = `scan:${targetUrl}`;
    if (env.PYTHIA_TOP50_KV) {
      try {
        const cached = await env.PYTHIA_TOP50_KV.get(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          return new Response(JSON.stringify({ ...data, cached: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (cacheError) {
        console.log('Cache read error:', cacheError.message);
        // Continue with fresh scan if cache fails
      }
    }

    // Check robots.txt compliance
    const robotsUrl = new URL(targetUrl).origin + '/robots.txt';
    try {
      const robotsResponse = await fetch(robotsUrl, {
        headers: { 'User-Agent': 'PythiaBot/1.0 (+https://p-score.me)' }
      });
      if (robotsResponse.ok) {
        const robotsTxt = await robotsResponse.text();
        if (robotsTxt.includes('PythiaBot') && robotsTxt.includes('Disallow')) {
          return new Response(JSON.stringify({ 
            error: 'Site blocks PythiaBot in robots.txt' 
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    } catch (e) {
      // Continue if robots.txt check fails
    }

    // Fetch the target URL with ref param
    const fetchUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + 'ref=pythia';
    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PythiaBot/1.0; +https://p-score.me)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      cf: { cacheTtl: 300 }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const headers = Object.fromEntries(response.headers);

    // Calculate metrics
    const metrics = {
      karpov: calcKarpov(html, headers, response),
      vortex: calcVortex(html),
      pulse: calcPulse(html),
      helix: calcHelix(html, headers),
      nexus: calcNexus(html),
      echo: calcEcho(headers),
      nova: calcNova(headers, html),
      quantum: calcQuantum(html),
      aether: calcAether(html),
      eden: calcEden(html, response)
    };

    // Calculate P-Score (average of all 10 metrics)
    const pscore = Math.round(
      (metrics.karpov + metrics.vortex + metrics.pulse + metrics.helix + 
       metrics.nexus + metrics.echo + metrics.nova + metrics.quantum + 
       metrics.aether + metrics.eden) / 10
    );

    const result = {
      url: targetUrl,
      pscore,
      metrics,
      scannedAt: new Date().toISOString(),
      cached: false
    };

    // Store in cache
    if (env.PYTHIA_TOP50_KV) {
      try {
        await env.PYTHIA_TOP50_KV.put(cacheKey, JSON.stringify(result), { expirationTtl: 300 });
      } catch (cacheError) {
        console.log('Cache write error:', cacheError.message);
        // Continue even if cache save fails
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: `Scan failed: ${error.message}` 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// ===== METRIC CALCULATION FUNCTIONS =====

function calcKarpov(html, headers, response) {
  // ⚡ KARPOV - Speed & Performance
  let score = 100;
  
  // Check response time (estimate from headers)
  const serverTiming = headers['server-timing'];
  if (serverTiming) {
    const timing = parseInt(serverTiming.match(/\d+/)?.[0] || 0);
    if (timing > 1000) score -= 20;
    else if (timing > 500) score -= 10;
  }
  
  // Check HTML size
  const htmlSize = html.length / 1024; // KB
  if (htmlSize > 500) score -= 15;
  else if (htmlSize > 200) score -= 8;
  
  // Check for optimization indicators
  if (!html.includes('async') && !html.includes('defer')) score -= 10;
  if (html.split('<script').length > 20) score -= 10;
  if (!headers['cache-control']) score -= 10;
  
  return Math.max(0, score);
}

function calcVortex(html) {
  // ♿ VORTEX - Accessibility
  let score = 100;
  
  // Check for ARIA attributes
  const ariaCount = (html.match(/aria-/g) || []).length;
  if (ariaCount === 0) score -= 20;
  else if (ariaCount < 5) score -= 10;
  
  // Check for alt attributes on images
  const imgTags = (html.match(/<img/g) || []).length;
  const altTags = (html.match(/alt=/g) || []).length;
  if (imgTags > 0 && altTags < imgTags * 0.5) score -= 15;
  
  // Check for semantic HTML
  if (!html.includes('<header')) score -= 10;
  if (!html.includes('<nav')) score -= 5;
  if (!html.includes('<main')) score -= 10;
  if (!html.includes('<footer')) score -= 5;
  
  // Check for form labels
  const inputCount = (html.match(/<input/g) || []).length;
  const labelCount = (html.match(/<label/g) || []).length;
  if (inputCount > 0 && labelCount < inputCount * 0.7) score -= 15;
  
  return Math.max(0, score);
}

function calcPulse(html) {
  // 📱 PULSE - Social & SEO Optimization
  let score = 100;
  
  // Check for Open Graph tags
  const ogTags = (html.match(/property="og:/g) || []).length;
  if (ogTags === 0) score -= 25;
  else if (ogTags < 4) score -= 15;
  
  // Check for Twitter cards
  if (!html.includes('twitter:card')) score -= 15;
  
  // Check for meta description
  if (!html.includes('name="description"')) score -= 15;
  
  // Check for title tag
  if (!html.includes('<title>')) score -= 20;
  
  // Check for canonical link
  if (!html.includes('rel="canonical"')) score -= 10;
  
  return Math.max(0, score);
}

function calcHelix(html, headers) {
  // 🔒 HELIX - Privacy & Security
  let score = 100;
  
  // Check for HTTPS (from response)
  if (!headers['strict-transport-security']) score -= 20;
  
  // Check for privacy-respecting headers
  if (!headers['x-frame-options'] && !headers['content-security-policy']) score -= 15;
  
  // Check for tracking scripts (negative indicators)
  const trackingServices = ['google-analytics', 'facebook', 'doubleclick', 'googletagmanager'];
  let trackingCount = 0;
  trackingServices.forEach(service => {
    if (html.includes(service)) trackingCount++;
  });
  score -= trackingCount * 5;
  
  // Check for privacy policy link
  if (!html.toLowerCase().includes('privacy') || !html.toLowerCase().includes('policy')) {
    score -= 10;
  }
  
  // Check for cookie consent
  if (!html.toLowerCase().includes('cookie')) score -= 10;
  
  return Math.max(0, score);
}

function calcNexus(html) {
  // 📱 NEXUS - Mobile Responsiveness
  let score = 100;
  
  // Check for viewport meta tag
  if (!html.includes('name="viewport"')) score -= 30;
  
  // Check for responsive design indicators
  if (!html.includes('media=') && !html.includes('@media')) score -= 20;
  
  // Check for mobile-friendly frameworks
  const frameworks = ['bootstrap', 'tailwind', 'foundation', 'material', 'flexbox', 'grid'];
  const hasFramework = frameworks.some(fw => html.toLowerCase().includes(fw));
  if (!hasFramework) score -= 15;
  
  // Check for touch-friendly elements
  if (!html.includes('touch')) score -= 10;
  
  return Math.max(0, score);
}

function calcEcho(headers) {
  // 🌱 ECHO - Green Hosting & Sustainability
  let score = 100;
  
  // Check for green hosting indicators (server headers)
  const server = headers['server'] || '';
  const poweredBy = headers['x-powered-by'] || '';
  
  // Known green hosting providers
  const greenProviders = ['cloudflare', 'vercel', 'netlify', 'kinsta', 'greengeeks'];
  const hasGreenProvider = greenProviders.some(provider => 
    server.toLowerCase().includes(provider) || 
    poweredBy.toLowerCase().includes(provider)
  );
  
  if (!hasGreenProvider) score -= 20;
  
  // Check for CDN (reduces energy)
  const hasCDN = headers['cf-ray'] || headers['x-cdn'] || 
                 headers['x-cache'] || headers['via'];
  if (!hasCDN) score -= 20;
  
  // Check for compression
  if (!headers['content-encoding']) score -= 15;
  
  // Check for HTTP/2 or HTTP/3
  if (!headers['alt-svc'] && !headers['http2']) score -= 15;
  
  return Math.max(0, score);
}

function calcNova(headers, html) {
  // 🌐 NOVA - Scalability & Infrastructure
  let score = 100;
  
  // Check for CDN
  const hasCDN = headers['cf-ray'] || headers['x-cdn'] || 
                 headers['x-cache'] || headers['via'] ||
                 headers['x-amz-cf-id']; // CloudFront
  if (!hasCDN) score -= 25;
  
  // Check for caching headers
  const cacheControl = headers['cache-control'];
  if (!cacheControl) score -= 20;
  else if (!cacheControl.includes('max-age')) score -= 10;
  
  // Check for load balancing indicators
  if (headers['x-served-by'] || headers['x-backend']) score += 10;
  
  // Check for compression
  if (!headers['content-encoding']) score -= 15;
  
  // Check for resource hints
  if (!html.includes('preload') && !html.includes('prefetch')) score -= 10;
  
  return Math.max(0, Math.min(100, score));
}

function calcQuantum(html) {
  // ✨ QUANTUM - Best Practices & Code Quality
  let score = 100;
  
  // Check for HTML5 doctype
  if (!html.includes('<!DOCTYPE html>') && !html.includes('<!doctype html>')) score -= 20;
  
  // Check for valid meta charset
  if (!html.includes('charset=')) score -= 15;
  
  // Check for proper heading hierarchy
  const h1Count = (html.match(/<h1/g) || []).length;
  if (h1Count === 0) score -= 20;
  if (h1Count > 1) score -= 10;
  
  // Check for inline styles (bad practice)
  const inlineStyles = (html.match(/style=/g) || []).length;
  if (inlineStyles > 20) score -= 15;
  
  // Check for external CSS
  if (!html.includes('<link') || !html.includes('stylesheet')) score -= 10;
  
  return Math.max(0, score);
}

function calcAether(html) {
  // 🚀 AETHER - Modern Tech & Future-Readiness
  let score = 100;
  
  // Check for modern JavaScript frameworks
  const modernFrameworks = ['react', 'vue', 'angular', 'svelte', 'next', 'nuxt'];
  const hasModernFramework = modernFrameworks.some(fw => html.toLowerCase().includes(fw));
  if (hasModernFramework) score += 10;
  else score -= 15;
  
  // Check for PWA indicators
  const pwaFeatures = ['manifest', 'service-worker', 'sw.js'];
  const pwaCount = pwaFeatures.filter(feature => html.toLowerCase().includes(feature)).length;
  score += pwaCount * 10;
  
  // Check for WebP images
  if (html.includes('.webp')) score += 10;
  
  // Check for modern CSS features
  if (html.includes('css-grid') || html.includes('flexbox')) score += 5;
  
  // Check for lazy loading
  if (html.includes('loading=') || html.includes('lazy')) score += 5;
  
  return Math.max(0, Math.min(100, score));
}

function calcEden(html, response) {
  // 📊 EDEN - Efficiency & Page Weight
  let score = 100;
  
  // Calculate total HTML size
  const htmlSizeKB = html.length / 1024;
  
  if (htmlSizeKB < 50) score = 100;
  else if (htmlSizeKB < 100) score = 95;
  else if (htmlSizeKB < 200) score = 85;
  else if (htmlSizeKB < 300) score = 75;
  else if (htmlSizeKB < 500) score = 60;
  else if (htmlSizeKB < 1000) score = 40;
  else score = 20;
  
  // Count external resources
  const scriptCount = (html.match(/<script/g) || []).length;
  const linkCount = (html.match(/<link/g) || []).length;
  const imgCount = (html.match(/<img/g) || []).length;
  
  const totalResources = scriptCount + linkCount + imgCount;
  if (totalResources > 100) score -= 20;
  else if (totalResources > 50) score -= 10;
  
  // Check for minification
  if (html.includes('  ') || html.includes('\n\n')) score -= 10;
  
  return Math.max(0, score);
}

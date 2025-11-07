// === CONFIGURATION ===
const CACHE_DURATION = 5 * 10 ; // 5 minutes in milliseconds
const BOOT_LOG = [
  "Initializing Oracle OS...",
  "Scanning Index Logics...",
  "Booting Pythia Metrics...",
  "Calibrating Performance Matrix...",
  "System Check: OK.",
  "Done."
];

// === SOUNDS ===
// Tiny click/beep sound encoded as base64 WAV (256 bytes)
const SOUNDS = {
  click: new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABeZGF0YQQAAAD//38A+QDKARsB9AIEAyADJAUUAz4F9wWhA/wIaw/1EZ0U9hckG2gaqByTHL4dwx68HxIh7R/5Gf0f/R/yH/og/gCRAJEAnQCaAKUArQC5ANEA+QDYAPEA5gDYASUBHwE3AV0BfQJIAmoC4QMBBBEEFgQ/BFcEcAT2BPwG7Ab+BycHywf2CBoIkgifCOQJHAmiCVgJwwnXCl0KzwuRC/kMHwxKDGEMng1cDW0Ofg7CD2oPsw+0D/kQBBILEwwTzxTYFTY...')
};

function playSound(name) {
  if (isSoundOn && SOUNDS[name]) {
    const sound = SOUNDS[name];
    sound.currentTime = 0;
    // Using .catch prevents a console error if the user hasn't interacted with the page yet
    sound.play().catch(e => console.error("Sound play failed:", e));
  }
}

let isRetro = true; // RETRO MODE IS THE DEFAULT
let isSoundOn = false; // Initial sound state
let currentData = null; // Store current scan data

// === RIVALRIES DATA (41 battles) ===
const RIVALRIES = [
    // Academic
    { category: 'Academic', name1: 'Oxford', url1: 'https://www.ox.ac.uk', name2: 'Cambridge', url2: 'https://www.cam.ac.uk' },
    { category: 'Academic', name1: 'Harvard', url1: 'https://www.harvard.edu', name2: 'Yale', url2: 'https://www.yale.edu' },
    { category: 'Academic', name1: 'MIT', url1: 'https://www.mit.edu', name2: 'Caltech', url2: 'https://www.caltech.edu' },
    // Sport
    { category: 'Sport', name1: 'India (BCCI)', url1: 'https://www.bcci.tv', name2: 'Pakistan (PCB)', url2: 'https://www.pcb.com.pk' },
    { category: 'Sport', name1: 'England (ECB)', url1: 'https://www.ecb.co.uk', name2: 'Australia', url2: 'https://www.cricket.com.au' },
    { category: 'Sport', name1: 'Springboks', url1: 'https://www.sarugby.co.za', name2: 'All Blacks', url2: 'https://www.nzrugby.co.nz' },
    { category: 'Sport', name1: 'Manchester United', url1: 'https://www.manutd.com', name2: 'Liverpool', url2: 'https://www.liverpoolfc.com' },
    { category: 'Sport', name1: 'Arsenal', url1: 'https://www.arsenal.com', name2: 'Chelsea', url2: 'https://www.chelseafc.com' },
    { category: 'Sport', name1: 'Real Madrid', url1: 'https://www.realmadrid.com', name2: 'Barcelona', url2: 'https://www.fcbarcelona.com' },
    { category: 'Sport', name1: 'LA Lakers', url1: 'https://www.nba.com/lakers', name2: 'Boston Celtics', url2: 'https://www.nba.com/celtics' },
    { category: 'Sport', name1: 'Army', url1: 'https://www.westpoint.edu', name2: 'Navy', url2: 'https://www.usna.edu' },
    { category: 'Sport', name1: 'NY Yankees', url1: 'https://www.mlb.com/yankees', name2: 'Red Sox', url2: 'https://www.mlb.com/redsox' },
    // Retail
    { category: 'Retail', name1: 'Amazon', url1: 'https://www.amazon.com', name2: 'Walmart', url2: 'https://www.walmart.com' },
    { category: 'Retail', name1: 'Craigslist', url1: 'https://www.craigslist.org', name2: 'FB Marketplace', url2: 'https://www.facebook.com/marketplace' },
    { category: 'Retail', name1: 'McDonald\'s', url1: 'https://www.mcdonalds.com', name2: 'Burger King', url2: 'https://www.bk.com' },
    { category: 'Retail', name1: 'Starbucks', url1: 'https://www.starbucks.com', name2: 'Costa', url2: 'https://www.costa.co.uk' },
    { category: 'Retail', name1: 'Louis Vuitton', url1: 'https://www.louisvuitton.com', name2: 'Gucci', url2: 'https://www.gucci.com' },
    // Corporations
    { category: 'Corporations', name1: 'Apple', url1: 'https://www.apple.com', name2: 'Samsung', url2: 'https://www.samsung.com' },
    { category: 'Corporations', name1: 'Tesla', url1: 'https://www.tesla.com', name2: 'BYD', url2: 'https://www.byd.com' },
    { category: 'Corporations', name1: 'SpaceX', url1: 'https://www.spacex.com', name2: 'Blue Origin', url2: 'https://www.blueorigin.com' },
    // Cities
    { category: 'Cities', name1: 'London', url1: 'https://www.london.gov.uk', name2: 'Paris', url2: 'https://www.paris.fr' },
    { category: 'Cities', name1: 'New York', url1: 'https://www.nyc.gov', name2: 'Tokyo', url2: 'https://www.metro.tokyo.lg.jp' },
    { category: 'Cities', name1: 'Cape Town', url1: 'https://www.capetown.gov.za', name2: 'Rio de Janeiro', url2: 'https://www.rio.rj.gov.br' },
    // Nations
    { category: 'Nations', name1: 'White House', url1: 'https://www.whitehouse.gov', name2: 'No 10', url2: 'https://www.gov.uk' },
    // IGOs
    { category: 'IGOs', name1: 'United Nations', url1: 'https://www.un.org', name2: 'European Union', url2: 'https://europa.eu' },
    { category: 'IGOs', name1: 'World Bank', url1: 'https://www.worldbank.org', name2: 'IMF', url2: 'https://www.imf.org' },
    { category: 'IGOs', name1: 'G7', url1: 'https://www.g7germany.de', name2: 'G20', url2: 'https://www.g20.org' },
    // Tech
    { category: 'Tech', name1: 'Google', url1: 'https://www.google.com', name2: 'Meta', url2: 'https://about.meta.com' },
    { category: 'Tech', name1: 'DeepMind', url1: 'https://www.deepmind.com', name2: 'OpenAI', url2: 'https://www.openai.com' },
    { category: 'Tech', name1: 'Anthropic', url1: 'https://www.anthropic.com', name2: 'xAI', url2: 'https://x.ai' },
    // Automotive
    { category: 'Automotive', name1: 'McLaren', url1: 'https://www.mclaren.com', name2: 'Red Bull Racing', url2: 'https://www.redbullracing.com' },
    { category: 'Automotive', name1: 'Ferrari', url1: 'https://www.ferrari.com', name2: 'Porsche', url2: 'https://www.porsche.com' },
    // Socials
    { category: 'Socials', name1: 'X', url1: 'https://www.x.com', name2: 'Threads', url2: 'https://www.threads.net' },
    { category: 'Socials', name1: 'TikTok', url1: 'https://www.tiktok.com', name2: 'YouTube', url2: 'https://www.youtube.com' },
    { category: 'Socials', name1: 'LinkedIn', url1: 'https://www.linkedin.com', name2: 'BlueSky', url2: 'https://bsky.app' },
    { category: 'Socials', name1: 'WhatsApp', url1: 'https://www.whatsapp.com', name2: 'Telegram', url2: 'https://telegram.org' },
    // Entertainment
    { category: 'Entertainment', name1: 'Marvel', url1: 'https://www.marvel.com', name2: 'DC', url2: 'https://www.dc.com' },
    { category: 'Entertainment', name1: 'Netflix', url1: 'https://www.netflix.com', name2: 'Disney+', url2: 'https://www.disneyplus.com' },
    { category: 'Entertainment', name1: 'Nintendo', url1: 'https://www.nintendo.com', name2: 'PlayStation', url2: 'https://www.playstation.com' }
  ];

// === COMPONENT_METRICS (Renamed 'metrics' to 'COMPONENT_METRICS' for clarity) ===
const COMPONENT_METRICS = [
    { id: 'karpov', name: 'Karpov Speed', desc: 'Page load performance', tooltip: 'Measures load time, resource count, page weight, and optimization techniques.' },
    { id: 'vortex', name: 'Vortex Access', desc: 'Accessibility score', tooltip: 'Evaluates image alt text, ARIA labels, semantic HTML, and accessibility features.' },
    { id: 'nova', name: 'Nova Scale', desc: 'Infrastructure & CDN', tooltip: 'Checks for CDN usage, caching headers, and compression.' },
    { id: 'aether', name: 'Aether Tech', desc: 'Modern technologies', tooltip: 'Detects WebAssembly, Service Workers, ES6 modules, and modern frameworks.' },
    { id: 'pulse', name: 'Pulse SEO', desc: 'Search & social optimization', tooltip: 'Analyzes meta tags, Open Graph, Twitter Cards, and SEO basics.' },
    { id: 'eden', name: 'Eden Efficiency', desc: 'Page weight & size', tooltip: 'Scores based on total page weight. Smaller sites score higher.' },
    { id: 'helix', name: 'Helix Privacy', desc: 'Security & tracking', tooltip: 'Counts trackers and checks security headers (HSTS, CSP, X-Frame).' },
    { id: 'echo', name: 'Echo Green', desc: 'Sustainable hosting', tooltip: 'Checks if hosting uses renewable energy via Green Web Foundation API.' },
    { id: 'quantum', name: 'Quantum Quality', desc: 'Best practices', tooltip: 'Checks for code quality indicators and modern web practices.' },
    { id: 'nexus', name: 'Nexus Mobile', desc: 'Mobile responsiveness', tooltip: 'Evaluates viewport meta tags and media queries.' }
  ];

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial State from localStorage
  const storedRetro = localStorage.getItem('isRetro');
  const storedSound = localStorage.getItem('isSoundOn');

  // 2. Set Default Mode to Retro/Sound
  isRetro = (storedRetro === 'false' ? false : true); // Default to TRUE if null or missing
  isSoundOn = storedSound === 'true'; 

  // 3. Run Boot Sequence
  const mainContent = document.getElementById('mainContent');
  const mainHeader = document.getElementById('mainHeader');
  mainContent.classList.add('hidden'); // Hide main content initially
  mainHeader.classList.add('hidden');
  bootSequence();
  
  // Initialise rivalry list
  renderRivalries();
});

// Helper to update sound button text
function updateSoundToggleText() {
  document.getElementById('soundToggle').textContent = isSoundOn ? '🔊 SOUND' : '🔇 SOUND';
}

// Boot sequence function (FAST typing with 2-second time cap)
async function bootSequence() {
  const bootScreen = document.getElementById('bootScreen');
  const bootLog = document.getElementById('bootLog');
  bootLog.innerHTML = '';

  const charsPerSecond = 80;   // Tweak this: higher = faster typing
  const lineDelay = 0.12;      // Small pause between lines (seconds)
  let currentDelay = 0;

  BOOT_LOG.forEach((line, index) => {
    const p = document.createElement('p');
    p.textContent = line;

    const numChars = line.length;
    const typingDuration = numChars / charsPerSecond;

    // CSS custom property for dynamic width
    p.style.setProperty('--chars', numChars);

    // Base styles
    p.classList.add('overflow-hidden', 'whitespace-nowrap');
    p.classList.add('border-r-4', 'border-r-[#00ff00]');

    // Animations (longhand for full control)
    p.style.animationName = 'typing, blink';
    p.style.animationDuration = `${typingDuration}s, 0.75s`;
    p.style.animationTimingFunction = `steps(${numChars}, end), step-end`;
    p.style.animationIterationCount = '1, infinite';
    p.style.animationDelay = `${currentDelay}s, ${currentDelay}s`;
    p.style.animationFillMode = 'forwards, none';

    // Remove cursor when this line finishes typing
    p.addEventListener('animationend', (e) => {
      if (e.animationName === 'typing') {
        p.style.borderRight = 'none';
      }
    }, { once: true });

    bootLog.appendChild(p);

    // Advance delay for next line
    currentDelay += typingDuration;
    if (index < BOOT_LOG.length - 1) {
      currentDelay += lineDelay;
    }
  });

  // Total duration in ms, enforced minimum 2 seconds + fade buffer
  const totalDurationMs = Math.max(2000, currentDelay * 1000 + 600);

  await new Promise(resolve => setTimeout(resolve, totalDurationMs));

  // Fade out
  bootScreen.style.opacity = '0';
  bootScreen.style.transition = 'opacity 0.5s';

  setTimeout(() => {
    bootScreen.remove();
    initMainPage();
  }, 500);
}
// Function to initialize main page and handle pixelated load
function initMainPage() {
  const mainContent = document.getElementById('mainContent');
  const mainHeader = document.getElementById('mainHeader');
  
  // Show main header
  mainHeader.classList.remove('hidden');

  // Animate in main content
  mainContent.classList.remove('hidden');
  mainContent.style.opacity = '1';
  mainContent.style.transition = 'opacity 0.5s';

  // Set initial theme and start effects
  applyTheme(isRetro);
  
  // Start the pixelated dissolve (2 second duration must be in CSS)
  setTimeout(() => {
      mainContent.classList.add('pixel-dissolve');
  }, 0); 
  
  // Start typing animation after the page is visible
  setTimeout(() => {
    startTypingAnimation('pythiaH1');
    startTypingAnimation('mainTagline');
  }, 200);
  
  // Check if there are any cached results to display the leaderboard
  updateLeaderboardDisplay(); 
}

// Typing animation function for headings/score output
function startTypingAnimation(elementId, speed = 40) {
  const el = document.getElementById(elementId);
  if (!el || !isRetro) return;
  
  const text = el.textContent; // Store original text
  el.textContent = ''; // Clear text
  
  el.classList.remove('typing-pause');
  el.classList.add('typing');

  let i = 0;
  const timer = setInterval(() => {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
    } else {
      el.classList.remove('typing');
      el.classList.add('typing-pause');
      clearInterval(timer);
    }
  }, speed);
}

// Helper to apply the current theme
function applyTheme(retro) {
  const body = document.body;
  const themeToggle = document.getElementById('themeToggle');
  const oracleTextBox = document.getElementById('oracleTextBox');
  const crtFlicker = document.getElementById('crtFlicker');
  const mainContent = document.getElementById('mainContent');

  updateSoundToggleText();

  if (retro) {
    body.classList.add('retro');
    themeToggle.textContent = '✨ BORING MODE';

    // Pythia image and text box
    document.getElementById('oracleImage').style.display = 'block';
    oracleTextBox.classList.remove('hidden');

    // CRT Effects
    crtFlicker.classList.remove('hidden');
    mainContent.classList.add('crt-container');
  } else {
    body.classList.remove('retro');
    themeToggle.textContent = '🕹️ RETRO MODE';

    // Pythia image and text box
    document.getElementById('oracleImage').style.display = 'none';
    oracleTextBox.classList.add('hidden');
    
    // CRT Effects
    crtFlicker.classList.add('hidden');
    mainContent.classList.remove('crt-container');
  }

  // Reset animations for new mode
  if (retro) {
    // Re-run animation if we switch to retro
    const pscoreValue = document.getElementById('pscoreValue');
    if (pscoreValue && pscoreValue.textContent.trim() !== '--') {
      startTypingAnimation('pscoreValue', 20);
    } else {
      startTypingAnimation('pythiaH1');
      startTypingAnimation('mainTagline');
    }
  }
}

// === EVENT LISTENERS ===
// Theme Toggle
document.getElementById('themeToggle').addEventListener('click', () => {
  isRetro = !isRetro;
  localStorage.setItem('isRetro', isRetro);
  applyTheme(isRetro);
  playSound('click');
});

// Sound Toggle
document.getElementById('soundToggle').addEventListener('click', () => {
  isSoundOn = !isSoundOn;
  localStorage.setItem('isSoundOn', isSoundOn);
  updateSoundToggleText();
  playSound('click');
});

// Menu Toggles (Adding click sound)
document.getElementById('hamburger').addEventListener('click', () => {
  openMenu();
  playSound('click');
});
document.getElementById('menuBackdrop').addEventListener('click', () => {
  closeMenu();
  playSound('click');
});
document.querySelectorAll('.menu-overlay button').forEach(button => {
  button.addEventListener('click', () => {
    playSound('click');
  });
});

// Show Page function (Adding click sound)
window.showPage = function(pageId) {
  playSound('click');
  document.querySelectorAll('.page-content').forEach(page => {
    page.classList.remove('active');
  });
  const pageMap = {
      'main': 'mainPage',
      'pscore-explainer': 'pscoreExplainerPage',
      'components': 'componentsPage',
      'custom': 'customPage',
      'about': 'aboutPage',
      'leaderboard': 'mainPage' // Leaderboard logic is handled by clicking the button, but it's on the main page.
    };
  document.getElementById(pageMap[pageId]).classList.add('active');
  // Close menu after navigation
  closeMenu();
};

// === MAIN SCAN FUNCTION ===
document.getElementById('scanBtn').addEventListener('click', analyzeSite);
document.getElementById('urlInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') analyzeSite();
});

async function analyzeSite() {
  playSound('click');
  const url = document.getElementById('urlInput').value.trim();
  if (!url || !url.startsWith('http')) {
    alert('Please enter a valid URL starting with http:// or https://');
    return;
  }

  // Check cache first
  const cached = getCachedScan(url);
  if (cached) {
    console.log('Using cached result');
    currentData = cached;
    displayResults(cached, true);
    return;
  }

  const scanBtn = document.getElementById('scanBtn');
  // Use innerHTML to set text and keep the spinner span
  scanBtn.innerHTML = 'ANALYZING... <span id="scanSpinner" class="spinner ml-2">|</span>'; 
  scanBtn.disabled = true;
  scanBtn.classList.add('scanning');
  
  // Re-select the spinner after innerHTML update
  const spinner = document.getElementById('scanSpinner');

  let spinnerInterval;
  if (isRetro) {
    // Simple retro spinner animation (| / - \)
    spinner.classList.remove('hidden');
    let frames = ['|', '/', '-', '\\'];
    let i = 0;
    spinnerInterval = setInterval(() => {
      spinner.textContent = frames[i = ++i % frames.length];
    }, 150);
  }
  
  document.getElementById('resultsContainer').classList.add('hidden');
  document.getElementById('pscoreContainer').classList.add('hidden');
  document.getElementById('exportBtn').style.display = 'none';

  try {
    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.message || 'Unknown error');
    }

    setCachedScan(url, data);
    currentData = data;
    displayResults(data, false);

  } catch (error) {
    alert(`Analysis failed: ${error.message}`);
    console.error('Error:', error);
  } finally {
    if (spinnerInterval) clearInterval(spinnerInterval);
    // Reset button text, hiding the spinner element
    scanBtn.innerHTML = 'ANALYZE <span id="scanSpinner" class="spinner ml-2 hidden"></span>'; 
    scanBtn.disabled = false;
    scanBtn.classList.remove('scanning');
  }
}

function displayResults(data, fromCache) {
  document.getElementById('pscoreContainer').classList.remove('hidden');
  document.getElementById('resultsContainer').classList.remove('hidden');
  document.getElementById('exportBtn').style.display = 'inline-block';

  document.getElementById('pscoreValue').textContent = data.pscore || '--';
  if (isRetro) startTypingAnimation('pscoreValue', 20); // Animate score output

  const scanDate = new Date(data.timestamp || Date.now()).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  
  // Fix cache info display
  let cacheInfo = '';
  if (fromCache && data.cacheAge) {
    const mins = Math.floor(data.cacheAge / 60);
    const secs = Math.floor(data.cacheAge % 60);
    const cacheBadge = `<span class="cache-badge cache-stored">CACHED ${mins}m ${secs}s OLD</span>`;
    cacheInfo = `<br>${cacheBadge}`;
  } else if (!fromCache) {
    cacheInfo = `<br><span class="cache-badge cache-live">LIVE SCAN</span>`;
  }

  const siteInfo = `URL: <a href="${data.url}" target="_blank" class="font-bold text-white hover:underline">${new URL(data.url).hostname}</a> | Scanned: ${scanDate}${cacheInfo}`;
  document.getElementById('siteInfo').innerHTML = siteInfo;

  // Render detailed metrics
  const resultsContainer = document.getElementById('resultsContainer');
  resultsContainer.innerHTML = '';
  
  COMPONENT_METRICS.forEach(metric => {
    const score = data[metric.id];
    const tooltipText = metric.tooltip;
    const scoreColorClass = getScoreColorClass(score);
    
    const scoreElement = `
      <div class="score-card bg-white rounded-xl shadow-lg p-4 text-center">
        <h3 class="text-lg font-bold ${scoreColorClass}">${metric.name}</h3>
        <div class="text-3xl font-bold mt-1 ${scoreColorClass}">${score || '--'}</div>
        <p class="text-xs text-gray-500 mt-1">${metric.desc}</p>
        <div class="tooltip mt-2">
          <span class="text-sm font-bold text-indigo-500 cursor-help">ℹ️</span>
          <span class="tooltiptext">${tooltipText}</span>
        </div>
      </div>
    `;
    resultsContainer.innerHTML += scoreElement;
  });

  // Save to leaderboard
  if (data.pscore !== undefined) {
    saveToLeaderboard(data);
  }
}


function getScoreColorClass(score) {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  if (score >= 50) return 'text-orange-600';
  return 'text-red-600';
}

// === CACHING ===

function getCachedScan(url) {
  const key = `pythia_cache_${url}`;
  const item = localStorage.getItem(key);
  if (!item) return null;

  const cached = JSON.parse(item);
  const now = Date.now();
  cached.cacheAge = now - cached.timestamp;

  if (cached.cacheAge > CACHE_DURATION) {
    localStorage.removeItem(key);
    return null;
  }
  // Return age in seconds for display
  return { ...cached, cacheAge: Math.floor(cached.cacheAge / 1000) };
}

function setCachedScan(url, data) {
  const key = `pythia_cache_${url}`;
  data.timestamp = Date.now();
  localStorage.setItem(key, JSON.stringify(data));
}

// === LEADERBOARD ===
function getLeaderboard() {
  const lb = localStorage.getItem('pythiaLeaderboard');
  return lb ? JSON.parse(lb) : [];
}

function saveToLeaderboard(data) {
  let leaderboard = getLeaderboard();
  
  // Check if site already exists
  const existingIndex = leaderboard.findIndex(entry => entry.url === data.url);
  
  const newEntry = {
    url: data.url,
    pscore: data.pscore,
    timestamp: data.timestamp
  };

  if (existingIndex > -1) {
    // Update existing entry if new score is higher or if it's been a day
    if (newEntry.pscore > leaderboard[existingIndex].pscore || (Date.now() - leaderboard[existingIndex].timestamp > 24 * 60 * 60 * 1000)) {
      leaderboard[existingIndex] = newEntry;
    }
  } else {
    // Add new entry
    leaderboard.push(newEntry);
  }
  
  // Sort by pscore (descending) and keep top 100
  leaderboard.sort((a, b) => b.pscore - a.pscore);
  const top100 = leaderboard.slice(0, 100);

  localStorage.setItem('pythiaLeaderboard', JSON.stringify(top100));
  updateLeaderboardDisplay(top100);
}

function updateLeaderboardDisplay(leaderboardData) {
  const leaderboard = leaderboardData || getLeaderboard();
  if (leaderboard.length === 0) return;
  
  document.getElementById('leaderboard').classList.remove('hidden');
  
  const topSites = leaderboard.slice(0, 10);
  const bottomSites = leaderboard.slice(-10).reverse();
  
  const mapToHtml = (site, index, isBottom) => {
    const rank = isBottom ? leaderboard.length - index : index + 1;
    const scoreClass = getScoreColorClass(site.pscore);
    return `
      <div class="leaderboard-entry flex justify-between items-center p-2 rounded">
        <span class="text-sm font-bold text-gray-700">${rank}. ${new URL(site.url).hostname}</span>
        <span class="text-lg font-bold ${scoreClass}">${site.pscore}</span>
      </div>
    `;
  };

  document.getElementById('topSites').innerHTML = topSites.map((site, i) => mapToHtml(site, i, false)).join('');
  
  document.getElementById('bottomSites').innerHTML = bottomSites.map((site, i) => mapToHtml(site, i, true)).join('');
}

// === RIVALRIES ===
function renderRivalries() {
    const rivalryList = document.getElementById('rivalryList');
    rivalryList.innerHTML = RIVALRIES.map((rivalry, index) => `
      <div class="rivalry-item flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-indigo-50 transition">
        <div class="flex-1">
          <div class="text-xs font-bold text-gray-500 mb-1">${rivalry.category}</div>
          <div class="font-bold text-gray-800">${rivalry.name1} v ${rivalry.name2}</div>
        </div>
        <button onclick="startBattle(event, '${rivalry.url1}', '${rivalry.url2}', '${rivalry.name1}', '${rivalry.name2}')" 
          class="retro-button px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition text-sm">
          ⚔️
        </button>
      </div>
    `).join('');
  }

document.getElementById('customBattleBtn').addEventListener('click', () => {
    const url1 = document.getElementById('customUrl1').value.trim();
    const url2 = document.getElementById('customUrl2').value.trim();
    
    if (!url1 || !url2 || !url1.startsWith('http') || !url2.startsWith('http')) {
      alert('Please enter two valid URLs');
      return;
    }
    
    const name1 = new URL(url1).hostname;
    const name2 = new URL(url2).hostname;
    startBattle(event, url1, url2, name1, name2);
});
  
let currentBattleData = null;

async function startBattle(event, url1, url2, name1, name2) {
    playSound('click');
    document.getElementById('battleResults').classList.add('hidden');
    
    const btn = event.target.closest('button'); // Get the button element
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<span class="fighting-swords">⚔️</span>';
    btn.disabled = true;
    
    try {
      let result1 = getCachedScan(url1);
      let result2 = getCachedScan(url2);
      
      const scanUrl = async (url) => {
          const response = await fetch('/api/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url })
          });
          if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
          const data = await response.json();
          if (data.error) throw new Error(data.message || 'Unknown scan error');
          setCachedScan(url, data);
          return data;
      };

      const promises = [];
      if (!result1) promises.push(scanUrl(url1).then(data => result1 = data));
      if (!result2) promises.push(scanUrl(url2).then(data => result2 = data));
      
      await Promise.all(promises);
      
      if (!result1 || !result2 || result1.pscore === undefined || result2.pscore === undefined) {
          throw new Error("One or both scans failed to return a valid P-Score.");
      }
      
      const winner = result1.pscore > result2.pscore ? name1 : 
                    result2.pscore > result1.pscore ? name2 : 'TIE';
      
      const battleDate = new Date().toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      currentBattleData = { name1, name2, result1, result2, winner, battleDate };
      
      const winnerAnnouncement = document.getElementById('winnerAnnouncement');
      const scoreClass1 = getScoreColorClass(result1.pscore);
      const scoreClass2 = getScoreColorClass(result2.pscore);
      
      if (winner === 'TIE') {
        winnerAnnouncement.innerHTML = `
          🤝 IT'S A TIE!<br>
          <span class="text-2xl ${scoreClass1}">${result1.pscore}</span> - <span class="text-2xl ${scoreClass2}">${result2.pscore}</span><br>
          <span class="text-xs opacity-75 mt-2 block">${battleDate}</span>
        `;
      } else {
        const winScore = winner === name1 ? result1.pscore : result2.pscore;
        const loseScore = winner === name1 ? result2.pscore : result1.pscore;
        winnerAnnouncement.innerHTML = `
          🏆 ${winner.toUpperCase()} IS THE WINNER!<br>
          <span class="text-2xl ${winner === name1 ? scoreClass1 : scoreClass2}">${winScore}</span> - <span class="text-2xl ${winner === name2 ? scoreClass1 : scoreClass2}">${loseScore}</span><br>
          <span class="text-xs opacity-75 mt-2 block">${battleDate}</span>
        `;
      }
      
      document.getElementById('contestant1Results').innerHTML = `
        <div class="text-center">
          <div class="text-xl font-bold mb-2">${name1}</div>
          <div class="text-3xl font-bold ${scoreClass1}">${result1.pscore}</div>
          <div class="text-xs text-gray-500 mt-2">
            Speed: ${result1.karpov} • Access: ${result1.vortex}<br>
            Scale: ${result1.nova} • Tech: ${result1.aether}
          </div>
        </div>
      `;
      
      document.getElementById('contestant2Results').innerHTML = `
        <div class="text-center">
          <div class="text-xl font-bold mb-2">${name2}</div>
          <div class="text-3xl font-bold ${scoreClass2}">${result2.pscore}</div>
          <div class="text-xs text-gray-500 mt-2">
            Speed: ${result2.karpov} • Access: ${result2.vortex}<br>
            Scale: ${result2.nova} • Tech: ${result2.aether}
          </div>
        </div>
      `;
      
      document.getElementById('battleResults').classList.remove('hidden');
      // Scroll to bottom of page where results are displayed
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
      
    } catch (error) {
      alert(`Battle failed: ${error.message}`);
    } finally {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
    }
}

document.getElementById('shareRivalryBtn').addEventListener('click', () => {
  if (currentBattleData) {
    const { name1, name2, result1, result2, winner, battleDate } = currentBattleData;
    const text = `⚔️ PYTHIA BATTLE (${battleDate}): ${name1} (${result1.pscore}) v ${name2} (${result2.pscore}) - ${winner.toUpperCase()} WINS! 🏆`;
    shareContent(text, window.location.href);
  }
});
  
// === TOP 50 SCANNER (Placeholder/Existing Logic - kept for completeness) ===
document.getElementById('scanTop50Btn').addEventListener('click', scanTop50Websites);
  
async function scanTop50Websites() {
    // Logic for Top 50 scan (unchanged)
    const TOP_50_URLS = [
      'https://www.google.com', 'https://www.youtube.com', 'https://www.facebook.com',
      'https://www.x.com', 'https://www.instagram.com', 'https://www.linkedin.com',
      'https://www.reddit.com', 'https://www.wikipedia.org', 'https://www.amazon.com',
      'https://www.netflix.com', 'https://www.yahoo.com', 'https://www.ebay.com',
      'https://www.microsoft.com', 'https://www.apple.com', 'https://www.pinterest.com',
      'https://www.github.com', 'https://www.stackoverflow.com', 'https://www.twitch.tv',
      'https://www.wordpress.com', 'https://www.paypal.com', 'https://www.bbc.com',
      'https://www.cnn.com', 'https://www.nytimes.com', 'https://www.espn.com',
      'https://www.imdb.com', 'https://www.quora.com', 'https://www.medium.com',
      'https://www.tumblr.com', 'https://www.shopify.com', 'https://www.etsy.com',
      'https://www.target.com', 'https://www.walmart.com', 'https://www.bestbuy.com',
      'https://www.homedepot.com', 'https://www.ikea.com', 'https://www.spotify.com',
      'https://www.soundcloud.com', 'https://www.vimeo.com', 'https://www.dropbox.com',
      'https://www.zoom.us', 'https://www.salesforce.com', 'https://www.adobe.com',
      'https://www.oracle.com', 'https://www.ibm.com', 'https://www.cloudflare.com',
      'https://www.airbnb.com', 'https://www.booking.com', 'https://www.tripadvisor.com',
      'https://www.uber.com', 'https://www.tiktok.com'
    ];
    
    const btn = document.getElementById('scanTop50Btn');
    const loading = document.getElementById('top50Loading');
    const results = document.getElementById('top50Results');
    const progress = document.getElementById('scanProgress');
    
    btn.disabled = true;
    btn.textContent = '⏳ SCANNING...';
    loading.classList.remove('hidden');
    results.classList.add('hidden');
    
    try {
      const scanResults = [];
      let completed = 0;
      
      for (let i = 0; i < TOP_50_URLS.length; i += 5) {
        const batch = TOP_50_URLS.slice(i, i + 5);
        
        const batchPromises = batch.map(async (url) => {
          // Check cache
          const cached = getCachedScan(url);
          if (cached) {
            completed++;
            progress.textContent = `Scanned ${completed} of ${TOP_50_URLS.length} sites...`;
            return { url, pscore: cached.pscore };
          }
          
          try {
            const response = await fetch('/api/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url })
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data && data.pscore !== undefined) {
                setCachedScan(url, data);
                completed++;
                progress.textContent = `Scanned ${completed} of ${TOP_50_URLS.length} sites...`;
                return { url, pscore: data.pscore };
              }
            } else {
              console.error(`Failed ${url}: HTTP ${response.status}`);
            }
          } catch (error) {
            console.error(`Failed ${url}:`, error.message);
          }
          return null;
        });
        
        const batchResults = await Promise.all(batchPromises);
        const validResults = batchResults.filter(r => r !== null && r.url && r.pscore !== undefined);
        scanResults.push(...validResults);
        
        // Log progress
        console.log(`Batch complete. Total valid scans: ${scanResults.length}/${TOP_50_URLS.length}`);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`Top 50 scan complete. Successfully scanned: ${scanResults.length} sites`);
      
      if (scanResults.length >= 10) {
        const sorted = scanResults.sort((a, b) => b.pscore - a.pscore);
        const top10 = sorted.slice(0, 10);
        const bottom10 = sorted.slice(-10);
        
        const scanDate = new Date().toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        document.getElementById('top50TopList').innerHTML = `
          <div class="text-xs text-gray-500 mb-3 italic">Scanned: ${scanDate} (${scanResults.length} sites)</div>
          ${top10.map((site, i) => {
              const scoreClass = getScoreColorClass(site.pscore);
              return `
                <div class="leaderboard-entry flex justify-between items-center p-2 rounded bg-green-50">
                  <span class="text-sm font-bold text-gray-700">${i + 1}. ${new URL(site.url).hostname}</span>
                  <span class="text-lg font-bold ${scoreClass}">${site.pscore}</span>
                </div>
              `;
          }).join('')}
        `;
        
        document.getElementById('top50BottomList').innerHTML = `
          <div class="text-xs text-gray-500 mb-3 italic">Scanned: ${scanResults.length} sites)</div>
          ${bottom10.reverse().map((site, i) => {
            const rank = sorted.length - (9 - i);
            const scoreClass = getScoreColorClass(site.pscore);
            return `
              <div class="leaderboard-entry flex justify-between items-center p-2 rounded bg-red-50">
                <span class="text-sm font-bold text-gray-700">${rank}. ${new URL(site.url).hostname}</span>
                <span class="text-lg font-bold ${scoreClass}">${site.pscore}</span>
              </div>
            `;
          }).join('')}
        `;
        
        loading.classList.add('hidden');
        results.classList.remove('hidden');
      } else {
        throw new Error(`Only ${scanResults.length} sites scanned successfully. Need at least 10.`);
      }
      
    } catch (error) {
      alert(`Top 50 scan failed: ${error.message}`);
      console.error('Error:', error);
    } finally {
      btn.textContent = '🚀 SCAN TOP 50 WEBSITES';
      btn.disabled = false;
      loading.classList.add('hidden');
    }
}

// === SOCIAL SHARING ===
function shareOn(platform) {
  const text = 'Check out Pythia - The ultimate website performance oracle! ONE SCORE TO RANK THEM ALL 🔮';
  const url = window.location.href;
  shareContent(text, url, platform);
}

function shareContent(text, url, platform = null) {
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);
  
  if (!platform) {
    if (navigator.share) {
      navigator.share({ title: 'Pythia', text, url });
    }
    return;
  }
  
  let shareUrl;
  switch(platform) {
    case 'twitter':
      shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
      break;
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
      break;
    case 'whatsapp':
      shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
      break;
    case 'email':
      shareUrl = `mailto:?subject=${encodeURIComponent('Pythia')}&body=${encodedText}%20${encodedUrl}`;
      break;
  }
  
  if (shareUrl) {
    window.open(shareUrl, '_blank', 'width=600,height=400');
  }
}

window.shareOn = shareOn;

// === MENU FUNCTIONS ===
function openMenu() {
  document.getElementById('menuOverlay').classList.add('open');
  document.getElementById('menuBackdrop').classList.add('open');
}

function closeMenu() {
  document.getElementById('menuOverlay').classList.remove('open');
  document.getElementById('menuBackdrop').classList.remove('open');
}

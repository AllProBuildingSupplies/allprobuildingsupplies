// ══════════════════════════════════════════
// GLOBAL LAYOUT INJECTION
// ══════════════════════════════════════════

(function initApbsApiBase() {
  var host = '';
  try { host = String(window.location.hostname || '').toLowerCase(); } catch (_) {}
  // Test/staging hosts → test Worker (never the live domain).
  var isTest =
    host === 'allpro-test.pages.dev' ||
    host.endsWith('.allpro-test.pages.dev') ||
    host === 'test.allprobuildingsupplies.com' ||
    host.endsWith('.test.allprobuildingsupplies.com');
  // Explicit query override for local checks: ?apbs_env=test
  try {
    var q = new URLSearchParams(window.location.search || '');
    if (q.get('apbs_env') === 'test') isTest = true;
    if (q.get('apbs_env') === 'live') isTest = false;
  } catch (_) {}

  window.APBS_IS_TEST = !!isTest;
  window.APBS_API_BASE = isTest
    ? 'https://allpro-api-test.baruch-6d5.workers.dev/api'
    : 'https://allpro-api.baruch-6d5.workers.dev/api';
})();

window.APBS_THEME_KEY = 'apbs_theme';
window.apbsGetTheme = function apbsGetTheme() {
  try { return localStorage.getItem(window.APBS_THEME_KEY) === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; }
};
window.apbsIsLightTheme = function apbsIsLightTheme() {
  return document.documentElement.classList.contains('theme-light');
};
window.apbsSyncThemeLogos = function apbsSyncThemeLogos() {
  var light = window.apbsIsLightTheme();
  document.querySelectorAll('img').forEach(function (img) {
    var src = img.getAttribute('src') || '';
    if (!/logo\.png(\?|$)/.test(src) && !/images\/logo\.png/.test(src) && img.dataset.logoDark == null) return;
    if (!img.dataset.logoDark) img.dataset.logoDark = src;
    img.src = light ? 'images/logo-email-white.png' : img.dataset.logoDark;
  });
};
window.apbsSyncThemeControls = function apbsSyncThemeControls() {
  var light = window.apbsIsLightTheme();
  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    btn.setAttribute('aria-pressed', light ? 'true' : 'false');
    btn.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
    btn.title = light ? 'Dark mode' : 'Light mode';
    var label = btn.querySelector('.theme-toggle-text');
    if (label) label.textContent = light ? 'Dark' : 'Light';
  });
  var metas = document.querySelectorAll('meta[name="theme-color"]');
  for (var i = 0; i < metas.length; i++) metas[i].setAttribute('content', light ? '#FFFFFF' : '#0C1117');
};
window.apbsSetTheme = function apbsSetTheme(theme) {
  var light = theme === 'light';
  document.documentElement.classList.toggle('theme-light', light);
  document.documentElement.style.colorScheme = light ? 'light' : 'dark';
  try { localStorage.setItem(window.APBS_THEME_KEY, light ? 'light' : 'dark'); } catch (e) {}
  window.apbsSyncThemeControls();
  window.apbsSyncThemeLogos();
};
window.apbsToggleTheme = function apbsToggleTheme() {
  window.apbsSetTheme(window.apbsIsLightTheme() ? 'dark' : 'light');
};
window.apbsThemeToggleHtml = function apbsThemeToggleHtml() {
  return '<button type="button" class="theme-toggle" data-theme-toggle aria-pressed="false" aria-label="Switch to light mode" title="Light mode">' +
    '<svg class="theme-toggle-ico theme-ico-moon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 14.3A9 9 0 1 1 9.7 3 7 7 0 0 0 21 14.3z"/></svg>' +
    '<svg class="theme-toggle-ico theme-ico-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>' +
    '<span class="theme-toggle-text">Light</span></button>';
};
window.apbsBindThemeToggles = function apbsBindThemeToggles() {
  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    if (btn.__apbsThemeBound) return;
    btn.__apbsThemeBound = true;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      window.apbsToggleTheme();
    });
  });
  window.apbsSyncThemeControls();
  window.apbsSyncThemeLogos();
};

function apbsShowTestBanner() {
  if (!window.APBS_IS_TEST) return;
  if (document.getElementById('apbs-test-banner')) return;
  var bar = document.createElement('div');
  bar.id = 'apbs-test-banner';
  bar.setAttribute('role', 'status');
  bar.style.cssText = [
    'position:sticky', 'top:0', 'z-index:100001',
    'background:#8B1E1E', 'color:#fff',
    'font-family:DM Mono,monospace', 'font-size:12px', 'letter-spacing:1px',
    'text-align:center', 'padding:8px 12px',
    'border-bottom:2px solid #C8981F'
  ].join(';');
  bar.innerHTML = 'TEST SITE — not live. Data here will not affect allprobuildingsupplies.com';
  var root = document.body;
  if (root) root.insertBefore(bar, root.firstChild);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', apbsShowTestBanner);
} else {
  apbsShowTestBanner();
}

/**
 * Characters Excel/CSV often use (or corrupt into) instead of ASCII "x"
 * between dimension parts like 2x2x1.5.
 */
window.APBS_SIZE_X_CHARS = /[xX\u00D7\u2715\u2716\u2A2F\u22C5\u2217\uFFFD\u2022]/g;

/** Canonical size for DB keys (strips inch marks, trims, collapses spaces). */
window.normalizeProductSize = function normalizeProductSize(size) {
  if (size == null) return '';
  return String(size)
    .trim()
    .replace(/[\u201C\u201D\u2033\u2036]/g, '"')
    .replace(/"/g, '')
    // Excel ANSI CSVs: × (0xD7) misread as UTF-8 → ; also real × / bullets
    .replace(/\uFFFD/g, 'x')
    .replace(/[\u00D7\u2715\u2716\u2A2F\u22C5\u2217\u2022]/g, 'x')
    // Digits separated by odd junk (or capital X) → standard 2x2x1.5
    .replace(/(\d)\s*[xX]\s*(?=\d)/g, '$1x')
    .replace(/\s+/g, ' ');
};

/** Legacy sheet / cart codes → current catalog codes. */
window.APBS_PRODUCT_CODE_ALIASES = {
  'PIPE-FOAM': 'PVC-PIPE-FOAM',
  'PIPE-SOLID': 'PVC-PIPE-SOLID',
  'PVC-PIPEFOAM': 'PVC-PIPE-FOAM'
};
window.normalizeProductCode = function normalizeProductCode(code) {
  var c = String(code || '').trim();
  if (!c) return '';
  var map = window.APBS_PRODUCT_CODE_ALIASES || {};
  return map[c] || map[c.toUpperCase()] || c;
};

/** Front-facing size with inch marks: 1-1/2 → 1-1/2", 2x1-1/2 → 2" x 1-1/2" */
window.apbsSizeToDisplay = function apbsSizeToDisplay(size) {
  var raw = window.normalizeProductSize(size);
  if (!raw) return '';
  var parts = raw.split(/\s*[xX\u00D7\u2715\u2716\u2A2F\u22C5\u2217\uFFFD\u2022]\s*/).filter(Boolean);
  if (!parts.length) return raw;
  return parts.map(function (p) {
    return /["″]$/.test(p) ? p : (p + '"');
  }).join(' x ');
};

/** Convert one size segment for Excel-safe decimals / spaced fractions → catalog form. */
window.apbsSizeSegmentToCatalog = function apbsSizeSegmentToCatalog(seg) {
  var s = String(seg == null ? '' : seg).trim();
  if (!s) return '';
  s = s.replace(/_/g, ' ');

  // Already catalog-like: 2, 1/2, 1-1/2
  if (/^\d+$/.test(s) || /^\d+\/\d+$/.test(s) || /^\d+-\d+\/\d+$/.test(s)) return s;

  // Spaced fraction: 1 1/2 → 1-1/2
  var spaced = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (spaced) return spaced[1] + '-' + spaced[2] + '/' + spaced[3];

  // Decimal inches: 1.5 → 1-1/2 (Excel-friendly; avoids date coercion on 1-1/2)
  if (/^\d*\.\d+$/.test(s)) {
    var n = parseFloat(s);
    if (!Number.isFinite(n) || n < 0) return s;
    var whole = Math.floor(n + 1e-9);
    var frac = Math.round((n - whole) * 1000) / 1000;
    var fracMap = {
      0: '',
      0.125: '1/8',
      0.25: '1/4',
      0.375: '3/8',
      0.5: '1/2',
      0.625: '5/8',
      0.75: '3/4',
      0.875: '7/8'
    };
    var nearest = null;
    var best = 1;
    Object.keys(fracMap).forEach(function (k) {
      var d = Math.abs(frac - parseFloat(k));
      if (d < best) { best = d; nearest = k; }
    });
    if (nearest == null || best > 0.02) return s;
    var fr = fracMap[nearest];
    if (!fr) return String(whole);
    if (!whole) return fr;
    return whole + '-' + fr;
  }

  return s;
};

/** Catalog size key: 1.5 / 2x1.5 / 1 1/2 → 1-1/2 / 2x1-1/2 / 1-1/2 */
window.apbsSizeToCatalog = function apbsSizeToCatalog(size) {
  var raw = window.normalizeProductSize(size);
  if (!raw) return '';
  var parts = raw.split(/\s*[xX\u00D7\u2715\u2716\u2A2F\u22C5\u2217\uFFFD\u2022]\s*/).filter(Boolean);
  if (!parts.length) return raw;
  return parts.map(window.apbsSizeSegmentToCatalog).join('x');
};

/** Expand a Size cell into catalog candidates (supports 1.5, 2x1.5, 1 1/2, etc.). */
window.apbsSizeMatchCandidates = function apbsSizeMatchCandidates(size) {
  var raw = window.normalizeProductSize(size);
  var out = [];
  var seen = {};
  function add(v) {
    var n = window.normalizeProductSize(v);
    if (!n || seen[n]) return;
    seen[n] = true;
    out.push(n);
  }
  var sep = /\s*[xX\u00D7\u2715\u2716\u2A2F\u22C5\u2217\uFFFD\u2022]\s*/g;
  add(raw);
  add(raw.replace(sep, 'x'));
  add(raw.replace(/(\d+)\s+(\d+\/\d+)/g, '$1-$2'));

  var parts = raw.split(/\s*[xX\u00D7\u2715\u2716\u2A2F\u22C5\u2217\uFFFD\u2022]\s*/);
  if (parts.length) {
    var converted = parts.map(window.apbsSizeSegmentToCatalog);
    add(converted.join('x'));
    add(converted.join(' x '));
  }
  var catalog = window.apbsSizeToCatalog(raw);
  add(catalog);
  if (window.apbsSizeToExcelSafe) add(window.apbsSizeToExcelSafe(catalog));
  return out;
};

/** Catalog size → Excel-safe form (1-1/2 → 1.5) so CSV opens without becoming a date. */
window.apbsSizeToExcelSafe = function apbsSizeToExcelSafe(size) {
  var raw = window.normalizeProductSize(size);
  if (!raw) return '';
  return raw.split(/\s*[xX\u00D7\u2715\u2716\u2A2F\u22C5\u2217\uFFFD\u2022]\s*/).map(function (seg) {
    var s = String(seg).trim();
    var m = s.match(/^(\d+)-(\d+)\/(\d+)$/);
    if (m) {
      var dec = parseInt(m[1], 10) + (parseInt(m[2], 10) / parseInt(m[3], 10));
      return String(Math.round(dec * 1000) / 1000);
    }
    var onlyFrac = s.match(/^(\d+)\/(\d+)$/);
    if (onlyFrac) {
      var d = parseInt(onlyFrac[1], 10) / parseInt(onlyFrac[2], 10);
      return String(Math.round(d * 1000) / 1000);
    }
    return s;
  }).join('x');
};

window.apbsProductKey = function apbsProductKey(code, size) {
  var c = window.normalizeProductCode ? window.normalizeProductCode(code) : String(code || '').trim();
  var sz = window.apbsSizeToCatalog ? window.apbsSizeToCatalog(size) : window.normalizeProductSize(size);
  return c + '|' + sz;
};

window.apbsFindProduct = function apbsFindProduct(products, code, size) {
  if (!Array.isArray(products)) return null;
  const c = window.normalizeProductCode
    ? window.normalizeProductCode(code)
    : String(code || '').trim();
  const want = window.apbsSizeToCatalog
    ? window.apbsSizeToCatalog(size)
    : window.normalizeProductSize(size);
  if (!c || !want) return null;
  return products.find(function (p) {
    var pc = window.normalizeProductCode
      ? window.normalizeProductCode(p.code)
      : String(p.code || '').trim();
    if (pc !== c) return false;
    const ps = window.apbsSizeToCatalog
      ? window.apbsSizeToCatalog(p.size)
      : window.normalizeProductSize(p.size);
    return ps === want;
  }) || null;
};

window.apbsHashPassword = async function apbsHashPassword(password) {
  const data = new TextEncoder().encode(String(password));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(function (b) { return b.toString(16).padStart(2, '0'); })
    .join('');
};

window.apbsEscapeHtml = function apbsEscapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

window.apbsGetAdminToken = function apbsGetAdminToken() {
  return sessionStorage.getItem('apbs_admin_token') || '';
};

window.apbsAdminHeaders = function apbsAdminHeaders(extra) {
  const token = window.apbsGetAdminToken();
  const headers = { ...(extra || {}) };
  if (token) headers.Authorization = 'Bearer ' + token;
  return headers;
};

window.apbsLogout = function apbsLogout() {
  sessionStorage.removeItem('apbs_user');
  sessionStorage.removeItem('apbs_token');
  sessionStorage.removeItem('apbs_admin_auth');
  sessionStorage.removeItem('apbs_admin_token');
};

/** D1 stores 0/1; session may have number or boolean. */
window.apbsCanOrderPieces = function apbsCanOrderPieces(user) {
  if (!user) return true;
  const v = user.canOrderPieces;
  return v !== 0 && v !== false && v !== '0' && v !== 'false';
};

window.apbsNormalizeUser = function apbsNormalizeUser(user) {
  if (!user) return user;
  user.canOrderPieces = window.apbsCanOrderPieces(user);
  return user;
};

window.apbsGetUser = function apbsGetUser() {
  try {
    return JSON.parse(sessionStorage.getItem("apbs_user") || "null");
  } catch {
    return null;
  }
};

window.apbsGetToken = function apbsGetToken() {
  return sessionStorage.getItem("apbs_token") || "";
};

window.apbsAuthHeaders = function apbsAuthHeaders(extra) {
  const token = window.apbsGetToken();
  const headers = { ...(extra || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

function loadGlobalLayout() {
  const headerHTML = `
    <div class="topbar">
      <div class="topbar-links">
        <a href="tel:17327341123" style="cursor:none;"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.22 1.12.45 2.32.68 3.58.68.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.29 21 3 13.71 3 4.5c0-.55.45-1 1-1H8c.55 0 1 .45 1 1 0 1.27.2 2.48.57 3.62.1.32.03.68-.22.96L6.6 10.8z"/></svg>732-734-1123</a>
        <a href="mailto:info@allprobuildingsupplies.com" style="cursor:none;"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>info@allprobuildingsupplies.com</a>
      </div>
      <div class="topbar-end">
        ${window.apbsThemeToggleHtml()}
        <div class="topbar-badge">Contractor-Grade · Fast Response · NJ &amp; Surrounding Areas</div>
      </div>
    </div>

    <nav>
      <a href="index.html" class="nav-logo" style="cursor:none;">
        <img src="images/logo.png" alt="All Pro Building Supplies" onerror="this.style.display='none'"/>
        <div class="nav-brand-text">All Pro Building Supplies <span>LLC</span></div>
      </a>
      <form class="nav-search" id="nav-search-form" action="products.html" method="get" role="search">
        <label class="nav-search-label" for="nav-search-input">Search catalog</label>
        <input class="nav-search-input" id="nav-search-input" name="q" type="search" placeholder="Search code, size, or name…" autocomplete="off" enterkeyhint="search"/>
        <button class="nav-search-btn" type="submit" aria-label="Search products">Search</button>
        <div class="nav-search-suggest" id="nav-search-suggest" hidden></div>
      </form>
      <ul class="nav-links">
        <li><a href="products.html" style="cursor:none;">Products</a></li>
        <li><a href="about.html" style="cursor:none;">About</a></li>
        <li><a href="contact.html" style="cursor:none;">Contact</a></li>
      </ul>
      <div class="nav-actions" id="nav-auth-container">
        ${window.apbsThemeToggleHtml()}
        <a href="tel:17327341123" class="nav-tel" style="cursor:none;"><svg viewBox="0 0 24 24" width="16" height="16" fill="var(--gold)"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.22 1.12.45 2.32.68 3.58.68.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.29 21 3 13.71 3 4.5c0-.55.45-1 1-1H8c.55 0 1 .45 1 1 0 1.27.2 2.48.57 3.62.1.32.03.68-.22.96L6.6 10.8z"/></svg>732-734-1123</a>
        <span id="auth-buttons" style="display:inline-flex; align-items:center; gap:8px;">
          <a href="login.html" class="nav-cta" id="nav-login-btn" style="background:transparent;border:1px solid var(--gold);color:var(--gold);cursor:none;">Login</a>
          <a href="account.html" class="nav-cta" id="nav-account-btn" style="display:none;background:var(--ink3);border:1px solid rgba(200,152,31,.3);flex-direction:column;align-items:flex-start;padding:6px 12px;line-height:1.3;gap:2px;cursor:none;"><span style="font-size:9px;color:var(--silver);letter-spacing:1px;font-family:'DM Mono',monospace;">ACCOUNT</span><span id="nav-logged-in-name" style="font-size:12px;color:var(--white);">My Account</span></a>
          <a href="cart.html" class="nav-cta" id="nav-cart-btn" style="background:var(--gold);color:var(--on-gold);border:none;cursor:none;">Cart <span id="nav-cart-count" class="cart-nav-badge"></span></a>
        </span>
      </div>
      <button class="hamburger" id="hamburger" aria-label="Menu" style="cursor:none;">
        <span></span><span></span><span></span>
      </button>
    </nav>

    <div class="mobile-menu" id="mobile-menu">
      <button class="mobile-menu-close" id="mob-close" aria-label="Close" style="cursor:none;">&#10005;</button>
      <form class="mob-search" id="mob-search-form" action="products.html" method="get" role="search">
        <div class="mob-search-field">
          <input class="mob-search-input" id="mob-search-input" name="q" type="search" placeholder="Search code, size, or name…" autocomplete="off" enterkeyhint="search"/>
          <div class="nav-search-suggest" id="mob-search-suggest" hidden></div>
        </div>
        <button class="mob-search-btn" type="submit">Search catalog</button>
      </form>
      <div class="mob-theme-row">${window.apbsThemeToggleHtml()}</div>
      <a href="index.html" style="cursor:none;">Home</a>
      <a href="products.html" style="cursor:none;">Products</a>
      <a href="about.html" style="cursor:none;">About</a>
      <a href="contact.html" style="cursor:none;">Contact</a>
      <a href="account.html" style="cursor:none;">Account</a>
      <a href="tel:17327341123" class="mob-tel" style="cursor:none;">732-734-1123</a>
      <a href="cart.html" class="mob-cta" style="cursor:none;">Cart →</a>
      <a href="login.html" class="mob-cta" style="margin-top:10px;background:transparent;border:1px solid var(--gold);color:var(--gold);cursor:none;">Login / Register</a>
    </div>
  `;

  const footerHTML = `
    <footer>
      <div class="ft-top">
        <div class="ft-brand">
          <img src="images/logo.png" alt="All Pro Building Supplies" class="ft-logo" onerror="this.style.display='none'"/>
          <p class="ft-txt desktop-only-block">Contractor-grade building materials, plumbing, hardware, and contractor supplies. Fast response, real people, reliable service.</p>
          <p class="ft-txt mobile-only-block">Contractor-grade materials. Fast response. Real people.</p>
          <div class="ft-socials">
            <a href="mailto:info@allprobuildingsupplies.com" class="soc">✉</a>
            <a href="tel:17327341123" class="soc">📞</a>
          </div>
        </div>
        <div class="ft-col">
          <h4>Products</h4>
          <ul>
            <li><a href="products.html?main=Building%20Materials">Building Materials</a></li>
            <li><a href="products.html?main=Plumbing">Plumbing</a></li>
            <li><a href="products.html?main=Hardware">Hardware</a></li>
            <li><a href="products.html?main=Contractor%20Supplies">Contractor Supplies</a></li>
          </ul>
        </div>
        <div class="ft-col">
          <h4>Company</h4>
          <ul>
            <li><a href="about.html">About Us</a></li>
            <li><a href="contact.html">Contact</a></li>
            <li><a href="login.html">Dealer Login</a></li>
            <li><a href="admin.html" style="color:var(--gold);">Admin Dashboard</a></li>
          </ul>
        </div>
      </div>
      <div class="ft-bot">
        <p>&copy; 2026 All Pro Building Supplies LLC. All rights reserved.</p>
      </div>
    </footer>
  `;

  const headerContainer = document.getElementById('global-header');
  if(headerContainer) headerContainer.innerHTML = headerHTML;

  const footerContainer = document.getElementById('global-footer');
  if(footerContainer) footerContainer.innerHTML = footerHTML;

  window.apbsBindThemeToggles();

  if(!window.__apbsGlobalScriptsInit){
    initGlobalScripts();
    window.__apbsGlobalScriptsInit = true;
  } else {
    initNavSearch();
  }
}

function ensureGlobalLayout(){
  const hasHeader = document.querySelector('#global-header nav');
  const hasFooter = document.querySelector('#global-footer footer');
  if(!hasHeader || !hasFooter){
    loadGlobalLayout();
  }
}

// ══════════════════════════════════════════
// GLOBAL SCRIPTS (Runs after layout loads)
// ══════════════════════════════════════════

function initGlobalScripts() {
  // CURSOR — desktop pointer only; never on touch / coarse pointers
  const cur = document.getElementById('cursor');
  const finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const wideEnough = !(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
  if (cur && finePointer && wideEnough) {
    let mx = 0, my = 0, raf = null;
    function paint() {
      raf = null;
      cur.style.left = mx + 'px';
      cur.style.top = my + 'px';
    }
    document.addEventListener(
      'mousemove',
      (e) => {
        mx = e.clientX;
        my = e.clientY;
        const on = !!(e.target && e.target.closest && e.target.closest('a,button'));
        document.documentElement.classList.toggle('apbs-cursor-on-link', on);
        if (raf == null) raf = requestAnimationFrame(paint);
      },
      { passive: true }
    );
  } else {
    if (cur) cur.style.display = 'none';
    const ring = document.getElementById('cursor-ring');
    if (ring) ring.style.display = 'none';
    document.documentElement.classList.add('apbs-no-custom-cursor');
  }

  // SCROLL REVEAL
  const io=new IntersectionObserver(entries=>{
    entries.forEach((e,i)=>{if(e.isIntersecting){setTimeout(()=>e.target.classList.add('vis'),i*80);io.unobserve(e.target)}});
  },{threshold:.1,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('[data-r]').forEach(el=>io.observe(el));

  // ACTIVE NAV
  const navLinks=document.querySelectorAll('.nav-links a');
  navLinks.forEach(a=>{
    if(a.getAttribute('href')===window.location.pathname.split('/').pop()||
      (window.location.pathname.endsWith('/')&&a.getAttribute('href')==='index.html')){
      a.classList.add('active');
    }
  });

  // HAMBURGER MENU
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  if(hamburger && mobileMenu){
    hamburger.addEventListener('click', ()=>{
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(a=>{
      a.addEventListener('click',()=>{
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
    var mobClose = document.getElementById('mob-close');
    if(mobClose){
      mobClose.addEventListener('click', ()=>{
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    }
  }

  // AUTHENTICATION SYNC FOR HEADER
  try {
    var sess = sessionStorage.getItem('apbs_user');
    var user = null; if(sess) user = JSON.parse(sess);
    var isLoggedIn = user && user.status === 'approved';
    
    var acctBtn  = document.getElementById('nav-account-btn');
    var loginBtn = document.getElementById('nav-login-btn');
    var nameEl   = document.getElementById('nav-logged-in-name');

    var mobLogin = document.querySelector('.mobile-menu a[href="login.html"]');
    if(isLoggedIn){
      if(acctBtn) acctBtn.style.display = 'inline-flex';
      if(loginBtn) loginBtn.style.display = 'none';
      if(nameEl) nameEl.textContent = user.name || ((user.fname||'') + ' ' + (user.lname||'')).trim();
      if(mobLogin) {
        mobLogin.href = 'account.html';
        mobLogin.textContent = 'My Account →';
      }
    } else {
      if(acctBtn) acctBtn.style.display = 'none';
      if(loginBtn) loginBtn.style.display = 'inline-flex';
      if(mobLogin) {
        mobLogin.href = 'login.html';
        mobLogin.textContent = 'Login / Register';
      }
    }
  } catch(e) {}

  // CART COUNT UPDATE
  try {
    var cart = JSON.parse(localStorage.getItem('apbs_cart')||'[]');
    var total = cart.reduce(function(s,i){ return s+i.qty; }, 0);
    var el = document.getElementById('nav-cart-count');
    if(el) el.textContent = total > 0 ? total : '';
  } catch(e) {}

  initNavSearch();
}

/** Header / mobile / page catalog search — live typeahead suggestions. */
function initNavSearch() {
  var params = new URLSearchParams(window.location.search || '');
  var qParam = params.get('q') || '';
  var page = (window.location.pathname.split('/').pop() || '').toLowerCase();
  var navInput = document.getElementById('nav-search-input');
  var mobInput = document.getElementById('mob-search-input');
  if (navInput && qParam && page === 'products.html') navInput.value = qParam;
  if (mobInput && qParam && page === 'products.html') mobInput.value = qParam;

  ensureCatalogSuggestBoxes();
  bindCatalogSuggestInput(document.getElementById('nav-search-input'), document.getElementById('nav-search-suggest'));
  bindCatalogSuggestInput(document.getElementById('mob-search-input'), document.getElementById('mob-search-suggest'));
  bindCatalogSuggestInput(document.getElementById('home-search-input'), document.getElementById('home-search-suggest'));
  bindCatalogSuggestInput(document.getElementById('prod-search'), document.getElementById('prod-search-suggest'));

  bindCatalogSearchForm(document.getElementById('nav-search-form'), page);
  bindCatalogSearchForm(document.getElementById('mob-search-form'), page);
  bindCatalogSearchForm(document.getElementById('home-search-form') || document.querySelector('form.home-search'), page);

  // Always warm / refresh in-memory catalog for typeahead (don't wait for products page).
  apbsLoadSuggestCatalog(true);
}

function ensureCatalogSuggestBoxes() {
  function ensure(inputId, boxId, wrapSel) {
    if (document.getElementById(boxId)) return;
    var input = document.getElementById(inputId);
    if (!input) return;
    var wrap = wrapSel ? input.closest(wrapSel) : input.parentElement;
    if (!wrap) return;
    if (window.getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
    var box = document.createElement('div');
    box.className = 'nav-search-suggest';
    box.id = boxId;
    box.hidden = true;
    wrap.appendChild(box);
  }
  ensure('home-search-input', 'home-search-suggest', '.home-search');
  ensure('prod-search', 'prod-search-suggest', '.search-wrap');
}

window.__apbsSuggestCatalog = window.__apbsSuggestCatalog || null;
window.__apbsSuggestCatalogPromise = window.__apbsSuggestCatalogPromise || null;
window.__apbsSuggestActiveInput = null;

function apbsCatalogCacheKey() {
  var user = null;
  try { user = JSON.parse(sessionStorage.getItem('apbs_user') || 'null'); } catch (_) {}
  return (user && user.status === 'approved') ? 'apbs_catalog_v1_trade' : 'apbs_catalog_v1_public';
}

function apbsReadCachedCatalog() {
  if (Array.isArray(window.__apbsSuggestCatalog) && window.__apbsSuggestCatalog.length) {
    return window.__apbsSuggestCatalog;
  }
  try {
    var raw = sessionStorage.getItem(apbsCatalogCacheKey())
      || sessionStorage.getItem('apbs_catalog_v1_public')
      || sessionStorage.getItem('apbs_catalog_v1_trade');
    if (!raw) return null;
    var rows = JSON.parse(raw);
    if (Array.isArray(rows) && rows.length) {
      window.__apbsSuggestCatalog = rows;
      return rows;
    }
  } catch (_) {}
  return null;
}

function apbsLoadSuggestCatalog(forceNetwork) {
  var cached = apbsReadCachedCatalog();
  if (cached && !forceNetwork) return Promise.resolve(cached);
  if (window.__apbsSuggestCatalogPromise) return window.__apbsSuggestCatalogPromise;
  if (!window.APBS_API_BASE) return Promise.resolve(cached || []);

  window.__apbsSuggestCatalogPromise = fetch(window.APBS_API_BASE + '/products', {
    headers: window.apbsAuthHeaders ? window.apbsAuthHeaders() : {}
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (rows) {
      window.__apbsSuggestCatalogPromise = null;
      if (!Array.isArray(rows) || !rows.length) return cached || [];
      window.__apbsSuggestCatalog = rows;
      try { sessionStorage.setItem(apbsCatalogCacheKey(), JSON.stringify(rows)); } catch (_) {}
      // If user is mid-typing, refresh the open dropdown now that data arrived.
      var active = window.__apbsSuggestActiveInput;
      if (active && document.activeElement === active && active.__apbsRenderSuggest) {
        active.__apbsRenderSuggest(active.value);
      }
      return rows;
    })
    .catch(function () {
      window.__apbsSuggestCatalogPromise = null;
      return cached || [];
    });
  return window.__apbsSuggestCatalogPromise;
}

function apbsCatalogHints(qt, rows) {
  qt = String(qt || '').trim().toLowerCase();
  if (qt.length < 1) return [];
  rows = rows || apbsReadCachedCatalog() || [];
  if (!rows.length) return [];
  var seen = {};
  var out = [];
  for (var i = 0; i < rows.length && out.length < 8; i++) {
    var r = rows[i];
    var code = String(r.code || '').trim();
    if (!code || seen[code]) continue;
    var hay = (
      code + ' ' + (r.description || '') + ' ' + (r.size || '') + ' ' +
      (r.main_category || '') + ' ' + (r.sub_category || '')
    ).toLowerCase();
    if (hay.indexOf(qt) === -1) continue;
    seen[code] = true;
    out.push({
      code: code,
      desc: r.description || code,
      main: r.main_category || '',
      href: 'products.html?q=' + encodeURIComponent(code)
    });
  }
  return out;
}

function bindCatalogSuggestInput(input, suggest) {
  if (!input || !suggest || input.__apbsSuggestBound) return;
  input.__apbsSuggestBound = true;
  var timer = null;

  function hideSuggest() {
    suggest.hidden = true;
    suggest.classList.remove('is-open');
    suggest.innerHTML = '';
  }

  function renderSuggest(qt) {
    var q = String(qt || '').trim();
    if (!q.length) { hideSuggest(); return; }
    var rows = apbsReadCachedCatalog();
    if (!rows) {
      suggest.innerHTML = '<div class="nav-search-hint">Loading catalog…</div>';
      suggest.hidden = false;
      suggest.classList.add('is-open');
      apbsLoadSuggestCatalog(true);
      return;
    }
    var items = apbsCatalogHints(q, rows);
    if (!items.length) {
      suggest.innerHTML = '<div class="nav-search-hint">No matches — press Enter to search</div>';
      suggest.hidden = false;
      suggest.classList.add('is-open');
      return;
    }
    suggest.innerHTML = items.map(function (it) {
      return '<button type="button" class="nav-search-hit" data-suggest-q="' +
        window.apbsEscapeHtml(it.code).replace(/"/g, '&quot;') + '">' +
        '<span class="nav-search-hit-code">' + window.apbsEscapeHtml(it.code) + '</span>' +
        '<span class="nav-search-hit-desc">' + window.apbsEscapeHtml(it.desc) + '</span>' +
        (it.main ? '<span class="nav-search-hit-cat">' + window.apbsEscapeHtml(it.main) + '</span>' : '') +
      '</button>';
    }).join('');
    suggest.hidden = false;
    suggest.classList.add('is-open');
  }

  input.__apbsRenderSuggest = renderSuggest;
  input.__apbsHideSuggest = hideSuggest;

  input.addEventListener('input', function () {
    window.__apbsSuggestActiveInput = input;
    clearTimeout(timer);
    timer = setTimeout(function () { renderSuggest(input.value); }, 60);
  });
  input.addEventListener('focus', function () {
    window.__apbsSuggestActiveInput = input;
    if (input.value.trim().length >= 1) renderSuggest(input.value);
    else apbsLoadSuggestCatalog(false);
  });

  suggest.addEventListener('mousedown', function (e) {
    // Keep focus long enough to apply the pick (avoid input blur hiding first).
    e.preventDefault();
  });
  suggest.addEventListener('click', function (e) {
    var hit = e.target.closest ? e.target.closest('[data-suggest-q]') : null;
    if (!hit) return;
    var q = hit.getAttribute('data-suggest-q') || '';
    input.value = q;
    hideSuggest();
    var form = input.form || input.closest('form');
    if (form) {
      if (typeof form.requestSubmit === 'function') form.requestSubmit();
      else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    } else {
      // products.html page search (no form) — filter in place
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  if (!window.__apbsSuggestDocClickBound) {
    window.__apbsSuggestDocClickBound = true;
    document.addEventListener('click', function (e) {
      if (e.target.closest && (
        e.target.closest('.nav-search') ||
        e.target.closest('.home-search') ||
        e.target.closest('.search-wrap') ||
        e.target.closest('.mob-search-field')
      )) return;
      document.querySelectorAll('.nav-search-suggest.is-open').forEach(function (el) {
        el.hidden = true;
        el.classList.remove('is-open');
        el.innerHTML = '';
      });
    });
  }
}

function bindCatalogSearchForm(form, page) {
  if (!form || form.__apbsSearchBound) return;
  form.__apbsSearchBound = true;
  form.addEventListener('submit', function (e) {
    var input = form.querySelector('input[name="q"], input[type="search"]');
    var q = input ? String(input.value || '').trim() : '';
    document.querySelectorAll('.nav-search-suggest').forEach(function (el) {
      el.hidden = true;
      el.classList.remove('is-open');
    });
    if (page === 'products.html') {
      e.preventDefault();
      var prodSearch = document.getElementById('prod-search');
      if (prodSearch) {
        prodSearch.value = q;
        prodSearch.dispatchEvent(new Event('input', { bubbles: true }));
        try { prodSearch.focus(); } catch (_) {}
      }
      try {
        var url = q ? ('products.html?q=' + encodeURIComponent(q)) : 'products.html';
        history.replaceState(null, '', url);
      } catch (_) {}
      var hamburger = document.querySelector('.hamburger');
      var mobileMenu = document.querySelector('.mobile-menu');
      if (hamburger && mobileMenu && mobileMenu.classList.contains('open')) {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      }
    }
  });
}

// Auto-run when DOM is ready
document.addEventListener('DOMContentLoaded', loadGlobalLayout);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) ensureGlobalLayout();
});

// Contact form — wired on contact.html
async function submitContactForm(btn) {
  const form = btn.closest('.cf');
  if (!form) return;
  const get = function (sel) {
    const el = form.querySelector(sel);
    return el ? el.value.trim() : '';
  };
  const payload = {
    firstName: get('.frow .fg:first-child .fi'),
    lastName: get('.frow .fg:last-child .fi'),
    email: get('.fg input[type="email"]'),
    phone: get('.fg input[type="tel"]'),
    company: get('#contact-company'),
    category: get('.fsel'),
    message: get('.fta'),
  };
  if (!payload.email || !payload.message) {
    alert('Please enter your email and message.');
    return;
  }
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = 'Sending...';
  try {
    const api = (window.APBS_API_BASE || 'https://allpro-api.baruch-6d5.workers.dev/api') + '/contact';
    const r = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(data.error || 'Send failed');
    btn.innerHTML = '✓ Sent! We\'ll respond shortly.';
    btn.style.background = 'var(--ink3)';
    btn.style.color = 'var(--gold)';
    form.querySelectorAll('input, textarea, select').forEach(function (el) { el.value = ''; });
  } catch (e) {
    alert(e.message || 'Could not send. Please call 732-734-1123.');
    btn.innerHTML = orig;
    btn.disabled = false;
  }
}

// ══════════════════════════════════════════
// PWA — service worker + install prompt
// ══════════════════════════════════════════
(function initApbsPwa() {
  if (!('serviceWorker' in navigator)) return;

  var register = function () {
    var swUrl = 'sw.js';
    try {
      swUrl = new URL('sw.js', window.location.href).pathname;
    } catch (_) {}
    navigator.serviceWorker.register(swUrl).catch(function () {});
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register);

  var deferredPrompt = null;
  var dismissedKey = 'apbs_pwa_install_dismissed';

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    try {
      if (sessionStorage.getItem(dismissedKey) === '1') return;
    } catch (_) {}
    showInstallBanner();
  });

  function showInstallBanner() {
    if (document.getElementById('apbs-pwa-install')) return;
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return;
    if (window.navigator.standalone) return;

    var bar = document.createElement('div');
    bar.id = 'apbs-pwa-install';
    bar.setAttribute('role', 'dialog');
    bar.innerHTML =
      '<div class="apbs-pwa-install-text">' +
        '<strong>Install All Pro</strong>' +
        '<span>Add to your home screen for quick access</span>' +
      '</div>' +
      '<div class="apbs-pwa-install-actions">' +
        '<button type="button" class="btn-gold" id="apbs-pwa-install-btn">Install</button>' +
        '<button type="button" class="btn-ghost" id="apbs-pwa-dismiss-btn">Not now</button>' +
      '</div>';
    document.body.appendChild(bar);

    document.getElementById('apbs-pwa-install-btn').addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function () {
        deferredPrompt = null;
        hideInstallBanner(true);
      });
    });
    document.getElementById('apbs-pwa-dismiss-btn').addEventListener('click', function () {
      hideInstallBanner(true);
    });
  }

  function hideInstallBanner(remember) {
    var bar = document.getElementById('apbs-pwa-install');
    if (bar) bar.remove();
    if (remember) {
      try { sessionStorage.setItem(dismissedKey, '1'); } catch (_) {}
    }
  }

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    hideInstallBanner(true);
  });
})();

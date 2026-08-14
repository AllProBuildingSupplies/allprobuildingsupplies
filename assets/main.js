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
  var sz = window.apbsSizeToCatalog ? window.apbsSizeToCatalog(size) : window.normalizeProductSize(size);
  return String(code || '').trim() + '|' + sz;
};

window.apbsFindProduct = function apbsFindProduct(products, code, size) {
  if (!Array.isArray(products)) return null;
  const c = String(code || '').trim();
  const want = window.apbsSizeToCatalog
    ? window.apbsSizeToCatalog(size)
    : window.normalizeProductSize(size);
  if (!c || !want) return null;
  return products.find(function (p) {
    if (String(p.code || '').trim() !== c) return false;
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
      <div class="topbar-badge">Contractor-Grade · Fast Response · NJ &amp; Surrounding Areas</div>
    </div>

    <nav>
      <div class="nav-logo">
        <img src="images/logo.png" alt="All Pro Building Supplies" onerror="this.style.display='none'"/>
        <div class="nav-brand-text">All Pro Building Supplies <span>LLC</span></div>
      </div>
      <ul class="nav-links">
        <li><a href="index.html" style="cursor:none;">Home</a></li>
        <li><a href="products.html" style="cursor:none;">Products</a></li>
        <li><a href="about.html" style="cursor:none;">About</a></li>
        <li><a href="contact.html" style="cursor:none;">Contact</a></li>
      </ul>
      <div class="nav-actions" id="nav-auth-container">
        <a href="tel:17327341123" class="nav-tel" style="cursor:none;"><svg viewBox="0 0 24 24" width="16" height="16" fill="var(--gold)"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.22 1.12.45 2.32.68 3.58.68.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.29 21 3 13.71 3 4.5c0-.55.45-1 1-1H8c.55 0 1 .45 1 1 0 1.27.2 2.48.57 3.62.1.32.03.68-.22.96L6.6 10.8z"/></svg>732-734-1123</a>
        <span id="auth-buttons" style="display:inline-flex; align-items:center; gap:8px;">
          <a href="login.html" class="nav-cta" id="nav-login-btn" style="background:transparent;border:1px solid var(--gold);color:var(--gold);cursor:none;">Login</a>
          <a href="account.html" class="nav-cta" id="nav-account-btn" style="display:none;background:var(--ink3);border:1px solid rgba(200,152,31,.3);flex-direction:column;align-items:flex-start;padding:6px 12px;line-height:1.3;gap:2px;cursor:none;"><span style="font-size:9px;color:var(--silver);letter-spacing:1px;font-family:'DM Mono',monospace;">LOGGED IN AS</span><span id="nav-logged-in-name" style="font-size:12px;color:var(--white);">My Account</span></a>
          <a href="cart.html" class="nav-cta" id="nav-cart-btn" style="background:var(--gold);color:var(--ink);border:none;cursor:none;">🛒 Cart <span id="nav-cart-count" class="cart-nav-badge"></span></a>
        </span>
      </div>
      <button class="hamburger" id="hamburger" aria-label="Menu" style="cursor:none;">
        <span></span><span></span><span></span>
      </button>
    </nav>

    <div class="mobile-menu" id="mobile-menu">
      <button class="mobile-menu-close" id="mob-close" aria-label="Close" style="cursor:none;">&#10005;</button>
      <a href="index.html" style="cursor:none;">Home</a>
      <a href="products.html" style="cursor:none;">Products</a>
      <a href="about.html" style="cursor:none;">About</a>
      <a href="contact.html" style="cursor:none;">Contact</a>
      <a href="tel:17327341123" class="mob-tel" style="cursor:none;">📞 732-734-1123</a>
      <a href="cart.html" class="mob-cta" style="cursor:none;">🛒 Cart →</a>
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
            <li><a href="products.html">Building Materials</a></li>
            <li><a href="products.html">Plumbing</a></li>
            <li><a href="products.html">Hardware</a></li>
            <li><a href="products.html">Contractor Supplies</a></li>
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

  if(!window.__apbsGlobalScriptsInit){
    initGlobalScripts();
    window.__apbsGlobalScriptsInit = true;
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
  // CURSOR — one rAF-coalesced paint per frame max; no perpetual ring loop (ring is display:none)
  const cur = document.getElementById('cursor');
  if (cur) {
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
/**
 * Generates light, Alveron-style category sell-sheet PDFs (1 page each)
 * from assets/products.csv. Run: npm run sell-sheets  (from brochure/)
 */
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { CATEGORY_META, COMPANY, standardsForSku } from './category-standards.js';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const csvPath = path.join(root, 'assets', 'products.csv');
const outDir = path.join(__dirname, 'sell-sheets');
const htmlDir = path.join(outDir, 'html');
const pdfDir = path.join(outDir, 'pdf');
const imagesDir = path.join(root, 'images');
const heroDir = path.join(outDir, 'images');

function parseCsv(text) {
  const rows = [];
  let i = 0;
  let field = '';
  let row = [];
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some((x) => x !== '')) rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).map((cols) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] ?? '';
    });
    return obj;
  });
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function productImgUrl(rel) {
  if (!rel) return null;
  const clean = rel.replace(/^\.\//, '').replace(/^images\//, '');
  const abs = path.join(imagesDir, clean);
  return fs.existsSync(abs) ? `file://${abs}` : null;
}

function heroImgUrl(filename) {
  if (!filename) return null;
  const abs = path.join(heroDir, filename);
  if (fs.existsSync(abs)) return `file://${abs}`;
  const alt = path.join(imagesDir, 'sell-sheets', filename);
  return fs.existsSync(alt) ? `file://${alt}` : null;
}

function logoUrl() {
  const dark = path.join(imagesDir, 'logo.png');
  const light = path.join(imagesDir, 'logo-email.png');
  if (fs.existsSync(dark)) return `file://${dark}`;
  if (fs.existsSync(light)) return `file://${light}`;
  return null;
}

function groupByCategory(products) {
  const map = new Map();
  for (const p of products) {
    const key = (p.sub_sub_category || p.Material || 'Other').trim() || 'Other';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  }
  return map;
}

function productFamilies(rows) {
  const byCode = new Map();
  for (const r of rows) {
    const code = r.Code || 'UNKNOWN';
    const unit = priceUnitFor(r);
    if (!byCode.has(code)) {
      byCode.set(code, {
        code,
        description: r.Description,
        material: r.Material,
        image: r.Image,
        family: r.sub_sub_sub_category || r.Description,
        pack: r.Pack,
        unit,
        sizePrices: [],
        standards: standardsForSku(r),
      });
    }
    const fam = byCode.get(code);
    const size = (r.Size || '').trim();
    if (size && !fam.sizePrices.some((sp) => sp.size === size)) {
      fam.sizePrices.push({
        size,
        price: parseFloat(r.Price),
        unit,
      });
    }
    if (r.Pack) fam.pack = r.Pack;
    if (r.Image && !fam.image) fam.image = r.Image;
  }
  for (const fam of byCode.values()) {
    fam.sizePrices.sort((a, b) => sizeSort(a.size, b.size));
    fam.sizes = fam.sizePrices.map((sp) => sp.size);
  }
  return [...byCode.values()].sort(
    (a, b) => a.family.localeCompare(b.family) || a.code.localeCompare(b.code)
  );
}

function priceUnitFor(row) {
  const sub = (row.sub_category || '').toLowerCase();
  if (sub === 'pipes') return '/ft';
  return '/ea';
}

function fmtPrice(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `$${v.toFixed(2)}`;
}

function sizeValue(s) {
  const first = String(s).split(/[x×]/i)[0].trim();
  const m = first.match(/(\d+)\s*-\s*(\d+)\s*\/\s*(\d+)/);
  if (m) return parseInt(m[1], 10) + parseInt(m[2], 10) / parseInt(m[3], 10);
  const f = first.match(/(\d+)\s*\/\s*(\d+)/);
  if (f) return parseInt(f[1], 10) / parseInt(f[2], 10);
  const n = first.match(/(\d+(?:\.\d+)?)/);
  return n ? parseFloat(n[1]) : 0;
}

function sizeSort(a, b) {
  const partsA = String(a).split(/[x×]/i).map((p) => p.trim());
  const partsB = String(b).split(/[x×]/i).map((p) => p.trim());
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const da = sizeValue(partsA[i] || '0');
    const db = sizeValue(partsB[i] || '0');
    if (da !== db) return da - db;
  }
  return String(a).localeCompare(String(b));
}

function sizeRange(families) {
  const all = [...new Set(families.flatMap((f) => f.sizes))];
  all.sort(sizeSort);
  if (!all.length) return '—';
  if (all.length === 1) return all[0];
  return `${all[0]} – ${all[all.length - 1]}`;
}

const SHARED_CSS = `
  :root {
    --ink: #0C1117;
    --navy: #1A3350;
    --navy2: #243F5C;
    --gold: #C8981F;
    --gold2: #B8871A;
    --gold-soft: #E8C56A;
    --cream: #FFFFFF;
    --paper: #FFFFFF;
    --muted: #5C6B7A;
    --line: #D8DEE6;
    --line2: #E8ECF0;
    --soft: #EEF2F6;
  }
  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'DM Sans', sans-serif;
    background: #ccc;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    color: var(--ink);
  }
  .page {
    width: 8.5in;
    height: 11in;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    background: var(--cream);
    display: grid;
    grid-template-columns: 2.2in 1fr;
    grid-template-rows: 1fr 0.42in;
  }
  .page:last-child { page-break-after: auto; }

  /* ── SIDEBAR ── */
  .sidebar {
    grid-row: 1 / 2;
    background: var(--navy);
    color: #fff;
    padding: 0.28in 0.2in 0.22in;
    display: flex;
    flex-direction: column;
    position: relative;
  }
  .sidebar::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(200,152,31,.08) 0%, transparent 28%);
    pointer-events: none;
  }
  .sidebar > * { position: relative; z-index: 1; }
  .brand-block { margin-bottom: 0.16in; }
  .brand-logo {
    height: 0.48in;
    width: auto;
    display: block;
    margin-bottom: 8px;
  }
  .brand-name {
    font-family: 'Oswald', sans-serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: var(--gold-soft);
    line-height: 1.1;
  }
  .brand-script {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-style: italic;
    font-size: 12px;
    color: var(--gold-soft);
    margin-top: 2px;
  }
  .collection {
    font-family: 'DM Mono', monospace;
    font-size: 7px;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    color: rgba(255,255,255,.55);
    margin: 0.12in 0 0.1in;
  }
  .hero-wrap {
    flex: 1;
    min-height: 0;
    border: 1px solid rgba(200,152,31,.35);
    background: #0f2438;
    overflow: hidden;
    position: relative;
    margin-bottom: 0.12in;
  }
  .hero-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
  }
  .hero-cap {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    background: linear-gradient(transparent, rgba(12,17,23,.85));
    padding: 18px 8px 7px;
    font-family: 'DM Mono', monospace;
    font-size: 6.5px;
    letter-spacing: 1.4px;
    color: var(--gold-soft);
    text-align: center;
  }
  .feat {
    border: 1px solid rgba(200,152,31,.45);
    padding: 7px 8px;
    margin-bottom: 6px;
  }
  .feat:last-child { margin-bottom: 0; }
  .feat-t {
    font-family: 'Oswald', sans-serif;
    font-size: 10px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--gold-soft);
    line-height: 1.15;
  }
  .feat-s {
    font-size: 7.5px;
    color: rgba(255,255,255,.65);
    margin-top: 2px;
    line-height: 1.3;
  }

  /* ── MAIN ── */
  .main {
    grid-row: 1 / 2;
    padding: 0.28in 0.32in 0.16in 0.3in;
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: var(--cream);
  }
  .main-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 2px solid var(--ink);
    padding-bottom: 8px;
    margin-bottom: 10px;
  }
  .main-title {
    font-family: 'Oswald', sans-serif;
    font-size: 28px;
    font-weight: 700;
    color: var(--ink);
    line-height: 1;
    letter-spacing: 0.3px;
  }
  .main-meta {
    font-family: 'DM Mono', monospace;
    font-size: 7.5px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted);
    text-align: right;
    line-height: 1.5;
  }
  .main-meta strong { color: var(--gold2); }

  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    margin-bottom: 10px;
    border-bottom: 1px solid var(--line);
    padding-bottom: 8px;
  }
  .stat {
    padding: 0 10px;
    border-right: 1px solid var(--line);
  }
  .stat:first-child { padding-left: 0; }
  .stat:last-child { border-right: none; padding-right: 0; }
  .stat-v {
    font-family: 'Oswald', sans-serif;
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
    line-height: 1.1;
  }
  .stat-v .gold { color: var(--gold2); }
  .stat-l {
    font-family: 'DM Mono', monospace;
    font-size: 6.5px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--muted);
    margin-top: 3px;
  }

  .mid {
    display: grid;
    grid-template-columns: 1.05fr 1fr;
    gap: 12px;
    margin-bottom: 8px;
  }
  .sec-lbl {
    font-family: 'DM Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--gold2);
    margin-bottom: 5px;
  }
  .construction {
    width: 100%;
    border-collapse: collapse;
  }
  .construction td {
    font-size: 8px;
    padding: 4px 0;
    border-bottom: 1px solid var(--line2);
    vertical-align: top;
    line-height: 1.3;
  }
  .construction td:first-child {
    width: 1.05in;
    font-family: 'Oswald', sans-serif;
    font-size: 8px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    color: var(--navy);
    padding-right: 6px;
  }
  .construction td:last-child { color: var(--muted); }
  .apps {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 7px;
  }
  .chip {
    font-family: 'DM Mono', monospace;
    font-size: 6.5px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--navy);
    background: var(--soft);
    border: 1px solid var(--line);
    padding: 3px 6px;
  }

  .std-box {
    background: var(--paper);
    border: 1px solid var(--line);
    padding: 8px 9px;
  }
  .std-box h4 {
    font-family: 'Oswald', sans-serif;
    font-size: 10px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--ink);
    margin-bottom: 6px;
  }
  .std-row {
    display: flex;
    gap: 7px;
    margin-bottom: 5px;
    font-size: 7.5px;
    line-height: 1.3;
    color: var(--muted);
  }
  .std-row code {
    font-family: 'DM Mono', monospace;
    font-size: 7px;
    color: var(--gold2);
    white-space: nowrap;
    min-width: 1.15in;
  }
  .note {
    margin-top: 6px;
    padding-top: 5px;
    border-top: 1px solid var(--line2);
    font-size: 7px;
    color: var(--muted);
    line-height: 1.35;
  }

  .prod-lbl {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin: 2px 0 5px;
  }
  .prod-lbl .sec-lbl { margin-bottom: 0; }
  .prod-lbl span {
    font-family: 'DM Mono', monospace;
    font-size: 6.5px;
    letter-spacing: 1px;
    color: var(--muted);
    text-transform: uppercase;
  }

  table.prod {
    width: 100%;
    border-collapse: collapse;
    flex: 1;
  }
  table.prod th {
    font-family: 'DM Mono', monospace;
    font-size: 6.5px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--gold2);
    text-align: left;
    padding: 3px 4px 4px;
    border-bottom: 1.5px solid var(--ink);
    background: transparent;
  }
  table.prod td {
    padding: 3.5px 4px;
    border-bottom: 1px solid var(--line2);
    font-size: 7.5px;
    color: var(--ink);
    vertical-align: middle;
    line-height: 1.25;
  }
  table.prod tr:nth-child(even) td { background: rgba(26,51,80,.03); }
  .thumb {
    width: 0.28in;
    height: 0.28in;
    object-fit: contain;
  }
  .sku {
    font-family: 'DM Mono', monospace;
    font-size: 6.5px;
    color: var(--gold2);
  }
  .pname {
    font-family: 'Oswald', sans-serif;
    font-size: 8px;
    letter-spacing: 0.2px;
    text-transform: uppercase;
    color: var(--ink);
  }
  .sizes { color: var(--muted); font-size: 7px; }
  .pack {
    font-family: 'DM Mono', monospace;
    font-size: 7px;
    text-align: center;
    color: var(--navy);
  }
  .stds { color: var(--muted); font-size: 6.5px; }

  /* dense grid for many SKUs */
  .prod-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px 8px;
    flex: 1 1 0;
    align-content: start;
    min-height: 0;
  }
  .prod-grid.cols-3 {
    grid-template-columns: 1fr 1fr 1fr;
    gap: 2px 6px;
  }
  .prod-grid.ultra .pg-item {
    padding: 2px 3px;
    gap: 3px;
    grid-template-columns: 0.22in 1fr;
    align-items: start;
  }
  .prod-grid.ultra .thumb {
    width: 0.22in;
    height: 0.22in;
  }
  .prod-grid.ultra .pname { font-size: 7px; line-height: 1.1; }
  .prod-grid.ultra .sku { font-size: 5.5px; }
  .pg-item {
    display: grid;
    grid-template-columns: 0.28in 1fr;
    gap: 5px;
    align-items: start;
    padding: 3px 4px;
    border-bottom: 1px solid var(--line2);
  }
  .pg-item .pname { font-size: 7.5px; }
  .pg-item .sku { font-size: 6px; }
  .pg-item .sizes { font-size: 6.5px; }
  .main.compact-mid .mid { margin-bottom: 4px; }
  .main.compact-mid .construction td { padding: 2px 0; font-size: 7px; }
  .main.compact-mid .std-box { padding: 6px 7px; }
  .main.compact-mid .std-row { margin-bottom: 3px; font-size: 7px; }
  .main.compact-mid .apps { margin-top: 4px; gap: 3px; }
  .main.compact-mid .chip { font-size: 5.5px; padding: 2px 4px; }
  .main.compact-mid .stats { margin-bottom: 6px; padding-bottom: 5px; }
  .main.compact-mid .stat-v { font-size: 14px; }
  .main.compact-mid .order-bar { padding: 6px 8px; margin-top: 4px; }
  .main.compact-mid .order-bar .ob-t { font-size: 11px; }
  .main.compact-mid .prod-lbl { margin: 0 0 3px; }

  /* Large fill cards for sparse categories */
  .fill-grid {
    display: grid;
    gap: 8px;
    flex: 1 1 0;
    align-content: stretch;
    min-height: 0;
    grid-auto-rows: 1fr;
  }
  .fill-grid.cols-1 { grid-template-columns: 1fr; }
  .fill-grid.cols-2 { grid-template-columns: 1fr 1fr; }
  .fill-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
  .fill-card {
    background: var(--soft);
    border: 1px solid var(--line);
    padding: 10px 11px;
    display: grid;
    grid-template-columns: 0.85in 1fr;
    gap: 10px;
    align-items: center;
    min-height: 0;
    height: 100%;
  }
  .fill-card img {
    width: 0.85in;
    height: 0.85in;
    object-fit: contain;
    background: #fff;
    border: 1px solid var(--line);
  }
  .fill-grid.cols-1 .fill-card {
    grid-template-columns: 1.35in 1fr;
    padding: 14px 16px;
  }
  .fill-grid.cols-1 .fill-card img {
    width: 1.35in;
    height: 1.35in;
  }
  .fill-card .pname { font-size: 12px; margin-bottom: 3px; }
  .fill-card .sku { font-size: 8px; margin-bottom: 5px; }
  .fill-card .sizes-label {
    font-family: 'DM Mono', monospace;
    font-size: 7px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--gold2);
    margin: 4px 0 6px;
  }
  .fill-card .stds { margin-top: 8px; font-size: 7.5px; }
  .fill-body { display: flex; flex-direction: column; height: 100%; min-height: 0; }
  .size-chips {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(0.78in, 1fr));
    gap: 8px;
    margin-top: 2px;
    flex: 1;
    align-content: start;
  }
  .size-chips.compact {
    grid-template-columns: repeat(auto-fill, minmax(0.48in, 1fr));
    gap: 3px;
    margin-top: 2px;
  }
  .size-chip {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 0.52in;
    padding: 5px 3px 4px;
    font-family: 'DM Mono', monospace;
    font-weight: 500;
    letter-spacing: 0;
    line-height: 1.15;
    text-align: center;
    color: var(--navy);
    background: #fff;
    border: 1.5px solid var(--navy);
    box-sizing: border-box;
    gap: 2px;
  }
  .size-chip .sz {
    font-size: 8.5px;
    color: var(--navy);
  }
  .size-chip .pr {
    font-size: 8px;
    font-weight: 600;
    color: var(--gold2);
  }
  .size-chip .pr .u {
    font-size: 6px;
    font-weight: 400;
    color: var(--muted);
  }
  .size-chips.compact .size-chip {
    min-height: 0.34in;
    padding: 2px 1px;
    border-width: 1px;
    gap: 1px;
  }
  .size-chips.compact .size-chip .sz { font-size: 6px; }
  .size-chips.compact .size-chip .pr { font-size: 6px; }
  .size-chips.compact .size-chip .pr .u { font-size: 5px; }
  .prod-grid.ultra .size-chips.compact {
    grid-template-columns: repeat(auto-fill, minmax(0.40in, 1fr));
    gap: 2px;
  }
  .prod-grid.ultra .size-chips.compact .size-chip {
    min-height: 0.30in;
    padding: 1px;
  }
  .prod-grid.ultra .size-chips.compact .size-chip .sz { font-size: 5.5px; }
  .prod-grid.ultra .size-chips.compact .size-chip .pr { font-size: 5.5px; }
  .wholesale-banner {
    background: linear-gradient(90deg, rgba(200,152,31,.12), rgba(26,51,80,.06));
    border: 1px solid rgba(200,152,31,.35);
    border-left: 3px solid var(--gold);
    padding: 6px 10px;
    margin-bottom: 8px;
    font-size: 8.5px;
    line-height: 1.4;
    color: var(--navy);
  }
  .wholesale-banner strong {
    font-family: 'Oswald', sans-serif;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--gold2);
    font-size: 9px;
    margin-right: 6px;
  }
  .pg-item .size-chips {
    margin-top: 2px;
  }
  .order-bar {
    margin-top: 8px;
    flex-shrink: 0;
    background: var(--navy);
    color: #fff;
    padding: 8px 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .order-bar .ob-t {
    font-family: 'Oswald', sans-serif;
    font-size: 12px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .order-bar .ob-s {
    font-size: 8px;
    color: rgba(255,255,255,.7);
    margin-top: 2px;
  }
  .order-bar .ob-c {
    text-align: right;
    font-family: 'Oswald', sans-serif;
    font-size: 12px;
    color: var(--gold-soft);
    line-height: 1.35;
  }
  .order-bar .ob-c span {
    display: block;
    font-family: 'DM Mono', monospace;
    font-size: 6.5px;
    letter-spacing: 1px;
    color: rgba(255,255,255,.55);
    text-transform: uppercase;
  }

  /* ── FOOTER ── */
  .footer {
    grid-column: 1 / -1;
    background: var(--navy);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.28in;
    font-family: 'DM Mono', monospace;
    font-size: 7px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
  }
  .footer .mid-badges {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .badge {
    border: 1px solid rgba(200,152,31,.5);
    color: var(--gold-soft);
    padding: 3px 7px;
    font-size: 6.5px;
    letter-spacing: 1px;
  }
  .footer .right { color: rgba(255,255,255,.7); }
  .footer .right strong { color: var(--gold-soft); font-weight: 500; }

  /* ── CATALOG COVER ── */
  .index-page {
    width: 8.5in;
    height: 11in;
    background: var(--cream);
    page-break-after: always;
    display: grid;
    grid-template-columns: 2.35in 1fr;
    grid-template-rows: 1fr 0.42in;
    overflow: hidden;
  }
  .cover-sidebar {
    grid-row: 1 / 2;
    background: var(--navy);
    padding: 0.22in 0.16in;
    display: flex;
    flex-direction: column;
    gap: 0.12in;
  }
  .cover-collage {
    flex: 1;
    min-height: 0;
    border: 1px solid rgba(200,152,31,.4);
    overflow: hidden;
    background: #0f2438;
  }
  .cover-collage img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
    display: block;
  }
  .cover-side-feats .feat { margin-bottom: 6px; }
  .cover-side-feats .feat:last-child { margin-bottom: 0; }
  .index-main {
    padding: 0.28in 0.28in 0.16in 0.26in;
    display: flex;
    flex-direction: column;
  }
  .cover-brand-bar {
    text-align: center;
    border-bottom: 2px solid var(--ink);
    padding-bottom: 8px;
    margin-bottom: 8px;
    flex-shrink: 0;
  }
  .cover-brand-bar .brand-top {
    font-family: 'Oswald', sans-serif;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--ink);
    line-height: 1;
  }
  .cover-brand-bar .brand-top span { color: var(--gold2); }
  .cover-logo-wrap {
    display: flex;
    justify-content: center;
    margin: 6px 0 4px;
  }
  .cover-logo-wrap img {
    height: 0.72in;
    width: auto;
  }
  .cover-sub {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-style: italic;
    font-size: 14px;
    color: var(--navy);
    margin-top: 2px;
  }
  .cover-meta {
    font-family: 'DM Mono', monospace;
    font-size: 7.5px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted);
    margin-top: 4px;
  }
  .index-main > .wholesale-banner {
    flex-shrink: 0;
    margin-bottom: 8px;
    padding: 5px 9px;
  }
  .cat-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    flex: 1;
    align-content: stretch;
    grid-auto-rows: 1fr;
    min-height: 0;
  }
  a.cat-card {
    text-decoration: none;
    color: inherit;
  }
  .cat-card {
    background: var(--soft);
    border: 1px solid var(--line);
    border-left: 4px solid var(--gold);
    padding: 8px 9px;
    display: grid;
    grid-template-columns: 1.15in 1fr;
    gap: 9px;
    align-items: center;
    height: 100%;
    min-height: 0;
  }
  .cat-card img {
    width: 1.15in;
    height: 1.15in;
    object-fit: cover;
    border: 1px solid var(--line);
    background: #fff;
  }
  .cat-card h3 {
    font-family: 'Oswald', sans-serif;
    font-size: 15px;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: var(--ink);
    line-height: 1.1;
    margin-bottom: 3px;
  }
  .cat-card p {
    font-size: 8.5px;
    color: var(--muted);
    line-height: 1.3;
  }
  .cat-card .meta {
    font-family: 'DM Mono', monospace;
    font-size: 7.5px;
    letter-spacing: 0.8px;
    color: var(--gold2);
    margin-top: 4px;
    text-transform: uppercase;
  }
  .cat-card .jump {
    font-family: 'DM Mono', monospace;
    font-size: 7px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--navy);
    margin-top: 3px;
  }
`;

function wrapHtml(title, body, extraClass = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&family=Cormorant+Garamond:ital,wght@0,500;1,500;1,600&display=swap" rel="stylesheet"/>
<style>${SHARED_CSS}</style>
</head>
<body class="${extraClass}">
${body}
</body>
</html>`;
}

function renderSidebar(meta) {
  const logo = logoUrl();
  const hero = heroImgUrl(meta.hero);
  const feats = (meta.highlights || [])
    .slice(0, 3)
    .map(
      (h) => `<div class="feat"><div class="feat-t">${esc(h.title)}</div><div class="feat-s">${esc(h.sub)}</div></div>`
    )
    .join('');
  return `
  <aside class="sidebar">
    <div class="brand-block">
      ${logo ? `<img class="brand-logo" src="${logo}" alt="All Pro"/>` : ''}
      <div class="brand-name">${esc(COMPANY.short)}</div>
      <div class="brand-script">Building Supplies</div>
    </div>
    <div class="collection">${esc(meta.collection || meta.title)}</div>
    <div class="hero-wrap">
      ${hero ? `<img src="${hero}" alt="${esc(meta.title)}"/>` : ''}
      <div class="hero-cap">${esc(meta.heroCaption || meta.material)}</div>
    </div>
    ${feats}
  </aside>`;
}

function renderSizeChips(sizePrices, { compact = false } = {}) {
  const list = Array.isArray(sizePrices) ? sizePrices : [];
  if (!list.length) return '<div class="size-chips"><div class="size-chip"><span class="sz">—</span></div></div>';
  const chips = list
    .map((sp) => {
      const size = typeof sp === 'string' ? sp : sp.size;
      const price = typeof sp === 'string' ? null : sp.price;
      const unit = typeof sp === 'string' ? '' : sp.unit || '';
      const priceHtml =
        price == null || !Number.isFinite(Number(price))
          ? ''
          : `<span class="pr">${esc(fmtPrice(price))}<span class="u">${esc(unit)}</span></span>`;
      return `<div class="size-chip"><span class="sz">${esc(size)}</span>${priceHtml}</div>`;
    })
    .join('');
  return `<div class="size-chips${compact ? ' compact' : ''}">${chips}</div>`;
}

function renderProductTable(families, mode) {
  if (mode === 'dense' || mode === 'ultra') {
    const colsClass = mode === 'ultra' || families.length >= 18 ? ' cols-3 ultra' : '';
    const items = families
      .map((f) => {
        const url = productImgUrl(f.image);
        return `<div class="pg-item">
          ${url ? `<img class="thumb" src="${url}" alt=""/>` : '<div></div>'}
          <div>
            <div class="pname">${esc(f.family)}</div>
            <div class="sku">${esc(f.code)}${f.pack ? ` · Pk ${esc(f.pack)}` : ''} · ${esc(f.unit || '/ea')}</div>
            ${renderSizeChips(f.sizePrices, { compact: true })}
          </div>
        </div>`;
      })
      .join('');
    return `<div class="prod-grid${colsClass}">${items}</div>`;
  }

  if (mode === 'fill') {
    const cols = families.length <= 2 ? 1 : families.length <= 6 ? 2 : 3;
    const cards = families
      .map((f) => {
        const url = productImgUrl(f.image);
        return `<div class="fill-card">
          ${url ? `<img src="${url}" alt=""/>` : '<div></div>'}
          <div class="fill-body">
            <div class="pname">${esc(f.family)}</div>
            <div class="sku">${esc(f.code)} · ${esc(f.description)}</div>
            <div class="sizes-label">Sizes &amp; suggested wholesale · ${f.sizePrices.length} · ${esc(f.unit || '/ea')}</div>
            ${renderSizeChips(f.sizePrices)}
            <div class="stds">Pack ${esc(f.pack || '—')} · ${esc((f.standards || []).join(' · ') || '—')}</div>
          </div>
        </div>`;
      })
      .join('');
    return `<div class="fill-grid cols-${cols}">${cards}</div>`;
  }

  const rows = families
    .map((f) => {
      const url = productImgUrl(f.image);
      return `<tr>
        <td style="width:0.32in">${url ? `<img class="thumb" src="${url}" alt=""/>` : ''}</td>
        <td style="width:1.15in"><div class="sku">${esc(f.code)}</div><div class="pname">${esc(f.family)}</div></td>
        <td>${esc(f.description)}</td>
        <td style="width:2.3in">${renderSizeChips(f.sizePrices, { compact: true })}</td>
        <td class="pack" style="width:0.35in">${esc(f.pack || '—')}</td>
        <td class="stds" style="width:0.9in">${esc((f.standards || []).join(' · ') || '—')}</td>
      </tr>`;
    })
    .join('');

  return `<table class="prod">
    <thead>
      <tr>
        <th></th><th>Code / Type</th><th>Description</th><th>Size / Price</th><th>Pack</th><th>Standard</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/** Pack families onto pages by size-chip budget so dense grids never clip. */
function paginateFamilies(families) {
  // Small SKUs first so page 1 keeps construction/standards; large grids
  // (e.g. reducing tee) land on continuation pages without the mid block.
  const ordered = [...families].sort(
    (a, b) =>
      (a.sizePrices?.length || 0) - (b.sizePrices?.length || 0) ||
      a.family.localeCompare(b.family) ||
      a.code.localeCompare(b.code)
  );
  const pages = [];
  let bucket = [];
  let cost = 0;
  const maxForPage = () => (pages.length === 0 ? 28 : 48);
  for (const f of ordered) {
    const chipCost = Math.max(3, f.sizePrices?.length || 0);
    const limit = maxForPage();
    if (bucket.length && cost + chipCost > limit) {
      pages.push(bucket);
      bucket = [];
      cost = 0;
    }
    bucket.push(f);
    cost += chipCost;
    if (chipCost >= maxForPage() && bucket.length === 1) {
      pages.push(bucket);
      bucket = [];
      cost = 0;
    }
  }
  if (bucket.length) pages.push(bucket);
  return pages.length ? pages : [families];
}

function modeForFamilies(families) {
  const totalSizes = families.reduce((n, f) => n + (f.sizePrices?.length || 0), 0);
  if (families.length >= 12 || totalSizes >= 40 || families.some((f) => (f.sizePrices?.length || 0) >= 20)) {
    return 'ultra';
  }
  if (families.length >= 7 || totalSizes >= 18) return 'dense';
  return 'fill';
}

function renderCategoryPage(meta, families, rowCount) {
  const allSizes = [...new Set(families.flatMap((f) => f.sizes))];
  const construction = (meta.construction || [])
    .map((c) => `<tr><td>${esc(c.label)}</td><td>${esc(c.value)}</td></tr>`)
    .join('');
  const standards = (meta.standards || [])
    .map((s) => `<div class="std-row"><code>${esc(s.code)}</code><span>${esc(s.name)}</span></div>`)
    .join('');
  const apps = (meta.applications || [])
    .map((a) => `<span class="chip">${esc(a)}</span>`)
    .join('');
  const badges = (meta.standards || [])
    .slice(0, 4)
    .map((s) => `<span class="badge">${esc(s.code)}</span>`)
    .join('');

  const unitNote = families.some((f) => f.unit === '/ft')
    ? 'Pipe priced per foot; fittings & accessories per each.'
    : 'Priced per each unless noted.';

  const pages = paginateFamilies(families);
  const pageCount = pages.length;

  return pages
    .map((pageFamilies, idx) => {
      const mode = modeForFamilies(pageFamilies);
      const sectionLabel =
        idx === 0
          ? mode === 'fill'
            ? 'Products & Specs'
            : 'Product Line'
          : `${meta.title} · Continued`;
      const mainClass = mode === 'ultra' || mode === 'dense' ? 'main compact-mid' : 'main';
      const remaining = pages.slice(idx + 1).reduce((n, p) => n + p.length, 0);
      return renderCategoryPageSingle(meta, pageFamilies, rowCount, {
        mainClass,
        mode,
        sectionLabel,
        unitNote,
        allSizes,
        construction: idx === 0 ? construction : '',
        standards: idx === 0 ? standards : '',
        apps: idx === 0 ? apps : '',
        badges,
        pageLabel: pageCount > 1 ? `${idx + 1} / ${pageCount}` : '',
        hideMid: idx > 0,
        contNote:
          idx === 0 && remaining
            ? `Continued · ${remaining} more product type${remaining === 1 ? '' : 's'}`
            : '',
        pageSuffix: idx === 0 ? '' : `-${idx + 1}`,
      });
    })
    .join('\n');
}

function renderCategoryPageSingle(meta, families, rowCount, opts) {
  const {
    mainClass,
    mode,
    sectionLabel,
    unitNote,
    allSizes,
    construction,
    standards,
    apps,
    badges,
    pageLabel,
    hideMid,
    contNote,
    pageSuffix = '',
  } = opts;
  const productBlock = renderProductTable(families, mode);
  const mid = hideMid
    ? ''
    : `<div class="mid">
      <div>
        <div class="sec-lbl">Construction / Specs</div>
        <table class="construction">${construction}</table>
        <div class="apps">${apps}</div>
      </div>
      <div class="std-box">
        <h4>Applicable Standards</h4>
        ${standards}
        ${meta.notes ? `<div class="note">${esc(meta.notes)}</div>` : ''}
      </div>
    </div>`;

  return `
<section class="page" id="${esc(meta.slug)}${esc(pageSuffix)}">
  ${renderSidebar(meta)}
  <div class="${mainClass}">
    <div class="main-head">
      <h1 class="main-title">${esc(meta.title)}${hideMid ? ' <em style="color:var(--gold2);font-style:normal;font-size:18px">Cont.</em>' : ''}</h1>
      <div class="main-meta">Spec Sheet / Updated ${esc(COMPANY.updated)}${pageLabel ? ` · ${esc(pageLabel)}` : ''}<br/><strong>Suggested Wholesale</strong></div>
    </div>

    <div class="wholesale-banner">
      <strong>Suggested Wholesale</strong>
      These are suggested wholesale list prices. Call or email for bulk / volume quotes.
      ${esc(unitNote)}
    </div>

    ${hideMid ? '' : `<div class="stats">
      <div class="stat">
        <div class="stat-v">${families.length}</div>
        <div class="stat-l">${pageLabel ? 'On This Page' : 'Product Types'}</div>
      </div>
      <div class="stat">
        <div class="stat-v">${rowCount}</div>
        <div class="stat-l">SKU / Size Rows</div>
      </div>
      <div class="stat">
        <div class="stat-v">${esc(sizeRange(families))}</div>
        <div class="stat-l">Size Range · ${allSizes.length} sizes</div>
      </div>
      <div class="stat">
        <div class="stat-v"><span class="gold">Trade</span></div>
        <div class="stat-l">Bulk Quotes Available</div>
      </div>
    </div>`}

    ${mid}

    <div class="prod-lbl">
      <div class="sec-lbl">${esc(sectionLabel)} — ${families.length} Available${contNote ? ` · ${esc(contNote)}` : ''}</div>
      <span>${esc(COMPANY.phone)} · ${esc(COMPANY.email)}</span>
    </div>
    ${productBlock}
    <div class="order-bar">
      <div>
        <div class="ob-t">Ready to Order?</div>
        <div class="ob-s">Send item codes, sizes &amp; quantities — ask for bulk pricing.</div>
      </div>
      <div class="ob-c">
        <span>Direct Line</span>${esc(COMPANY.phone)}
        <span style="margin-top:2px">Email</span>${esc(COMPANY.email)}
      </div>
    </div>
  </div>
  <div class="footer">
    <div>Spec Sheet · Rev. ${esc(COMPANY.updated)}${pageLabel ? ` · ${esc(pageLabel)}` : ''}</div>
    <div class="mid-badges">${badges}</div>
    <div class="right"><strong>${esc(COMPANY.short)}</strong> · ${esc(meta.title)}</div>
  </div>
</section>`;
}

function renderIndex(categories, { linked = false } = {}) {
  const logo = logoUrl();
  const collage = heroImgUrl('cover-collage.jpg');
  const cards = categories
    .map((c) => {
      const hero = heroImgUrl(c.hero);
      const inner = `
        ${hero ? `<img src="${hero}" alt="${esc(c.title)}"/>` : '<div></div>'}
        <div>
          <h3>${esc(c.title)}</h3>
          <p>${esc(c.tagline)}</p>
          <div class="meta">${c.familyCount} types · ${c.rowCount} SKUs</div>
          ${linked ? `<div class="jump">Open section →</div>` : ''}
        </div>`;
      if (linked) {
        return `<a class="cat-card" href="#${esc(c.slug)}">${inner}</a>`;
      }
      return `<div class="cat-card">${inner}</div>`;
    })
    .join('');

  return `
<section class="index-page" id="catalog-cover">
  <aside class="cover-sidebar">
    <div class="cover-collage">
      ${collage ? `<img src="${collage}" alt="All Pro product lines"/>` : ''}
    </div>
    <div class="cover-side-feats">
      <div class="feat"><div class="feat-t">8 Categories</div><div class="feat-s">Full Plumbing Line</div></div>
      <div class="feat"><div class="feat-t">Suggested Wholesale</div><div class="feat-s">Call for Bulk Quotes</div></div>
      <div class="feat"><div class="feat-t">ASTM / NSF</div><div class="feat-s">Code-Ready Specs</div></div>
    </div>
  </aside>
  <div class="index-main">
    <div class="cover-brand-bar">
      <div class="brand-top">All Pro <span>Building Supplies</span></div>
      <div class="cover-logo-wrap">${logo ? `<img src="${logo}" alt="All Pro"/>` : ''}</div>
      <div class="cover-sub">Product Catalog · Spec Sheets &amp; Wholesale Pricing</div>
      <div class="cover-meta">Updated ${esc(COMPANY.updated)} · ${esc(COMPANY.web)} · ${esc(COMPANY.phone)}</div>
    </div>
    <div class="wholesale-banner">
      <strong>Suggested Wholesale</strong>
      Prices shown are suggested wholesale list pricing. Call or email for bulk / volume quotes.
      Pipe is priced per foot; fittings &amp; accessories per each.
    </div>
    <div class="cat-cards">${cards}</div>
  </div>
  <div class="footer">
    <div>Catalog Cover · Rev. ${esc(COMPANY.updated)}</div>
    <div class="mid-badges">
      <span class="badge">${esc(COMPANY.phone)}</span>
      <span class="badge">${esc(COMPANY.email)}</span>
    </div>
    <div class="right"><strong>${esc(COMPANY.short)}</strong> · Building Supplies</div>
  </div>
</section>`;
}

async function main() {
  fs.mkdirSync(htmlDir, { recursive: true });
  fs.mkdirSync(pdfDir, { recursive: true });

  if (!fs.existsSync(csvPath)) {
    console.error('Missing products.csv at', csvPath);
    process.exit(1);
  }

  const products = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  const byCat = groupByCategory(products);
  const indexMeta = [];
  const generated = [];

  for (const [catKey, rows] of [...byCat.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const meta = CATEGORY_META[catKey] || {
      slug: slugify(catKey),
      title: catKey,
      material: rows[0]?.Material || '',
      collection: String(catKey).toUpperCase(),
      hero: 'hero-pvc-pipes.jpg',
      heroCaption: catKey,
      tagline: `${catKey} from the All Pro catalog.`,
      overview: `Factory-sourced ${catKey}.`,
      standards: [],
      highlights: [
        { title: 'Factory Sourced', sub: 'Trade Ready' },
        { title: 'Call for Pricing', sub: COMPANY.phone },
        { title: 'New Jersey', sub: 'Fast Response' },
      ],
      construction: [{ label: 'Category', value: catKey }],
      applications: [],
      notes: '',
    };
    const families = productFamilies(rows);
    const html = wrapHtml(
      `${COMPANY.name} — ${meta.title} Spec Sheet`,
      renderCategoryPage(meta, families, rows.length)
    );
    const htmlName = `${meta.slug}-sell-sheet.html`;
    const pdfName = `${meta.slug}-sell-sheet.pdf`;
    const htmlPath = path.join(htmlDir, htmlName);
    fs.writeFileSync(htmlPath, html);
    generated.push({ meta, htmlPath, pdfName, families, rows });
    indexMeta.push({
      title: meta.title,
      tagline: meta.tagline,
      familyCount: families.length,
      rowCount: rows.length,
      pdfName,
      hero: meta.hero,
      slug: meta.slug,
      standards: meta.standards || [],
      pageHtml: renderCategoryPage(meta, families, rows.length),
    });
    console.log(
      `HTML: ${htmlName} (${families.length} types, ${rows.length} rows, ~${paginateFamilies(families).length} page(s))`
    );
  }

  const indexHtmlPath = path.join(htmlDir, '00-sell-sheet-index.html');
  fs.writeFileSync(
    indexHtmlPath,
    wrapHtml(`${COMPANY.name} — Catalog Cover`, renderIndex(indexMeta, { linked: false }))
  );

  // Full catalog: cover (with internal links) + every category page
  const catalogBody =
    renderIndex(indexMeta, { linked: true }) + indexMeta.map((c) => c.pageHtml).join('\n');
  const catalogHtmlPath = path.join(htmlDir, 'allpro-product-catalog.html');
  fs.writeFileSync(
    catalogHtmlPath,
    wrapHtml(`${COMPANY.name} — Product Catalog`, catalogBody)
  );

  const mdLines = [
    '# All Pro Building Supplies — Category Sell Sheets',
    '',
    'Suggested wholesale prices from `assets/products.csv`. Rebuild: `npm run sell-sheets` from `brochure/`.',
    '',
    '## Full catalog',
    '',
    '- `brochure/sell-sheets/pdf/allpro-product-catalog.pdf` — cover + all category sheets (tiles link to sections)',
    '',
    '## Individual PDFs',
    '',
    '| Category | PDF | Types | SKUs |',
    '|---|---|---:|---:|',
    ...indexMeta.map(
      (c) => `| ${c.title} | \`brochure/sell-sheets/pdf/${c.pdfName}\` | ${c.familyCount} | ${c.rowCount} |`
    ),
    '',
  ];
  fs.writeFileSync(path.join(outDir, 'README.md'), mdLines.join('\n'));

  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    console.error('Puppeteer not installed. Run: npm install (in brochure/)');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  async function htmlToPdf(htmlPath, pdfPath) {
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 180000 });
    await page.pdf({
      path: pdfPath,
      format: 'Letter',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    await page.close();
    console.log('PDF:', path.basename(pdfPath));
  }

  await htmlToPdf(indexHtmlPath, path.join(pdfDir, '00-sell-sheet-index.pdf'));
  for (const g of generated) {
    await htmlToPdf(g.htmlPath, path.join(pdfDir, g.pdfName));
  }
  await htmlToPdf(catalogHtmlPath, path.join(pdfDir, 'allpro-product-catalog.pdf'));
  await browser.close();
  console.log(`\nDone. ${generated.length} category sheets + cover + full catalog → ${pdfDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

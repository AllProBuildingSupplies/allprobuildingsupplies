/**
 * Generates category sell-sheet PDFs from assets/products.csv
 * Run from brochure/: npm run sell-sheets
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

function imageFileUrl(rel) {
  if (!rel) return null;
  const clean = rel.replace(/^\.\//, '').replace(/^images\//, '');
  const abs = path.join(imagesDir, clean);
  if (!fs.existsSync(abs)) return null;
  return `file://${abs}`;
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

/** Collapse size rows into product families by Code */
function productFamilies(rows) {
  const byCode = new Map();
  for (const r of rows) {
    const code = r.Code || 'UNKNOWN';
    if (!byCode.has(code)) {
      byCode.set(code, {
        code,
        description: r.Description,
        material: r.Material,
        image: r.Image,
        family: r.sub_sub_sub_category || r.Description,
        pack: r.Pack,
        tommur: r['Tommur-Code'] || '',
        lesso: r['Lesso-Code'] || '',
        sizes: [],
        standards: standardsForSku(r),
      });
    }
    const fam = byCode.get(code);
    if (r.Size && !fam.sizes.includes(r.Size)) fam.sizes.push(r.Size);
    if (r.Pack && (!fam.pack || fam.pack === '1')) fam.pack = r.Pack;
    if (r['Tommur-Code'] && !fam.tommur) fam.tommur = r['Tommur-Code'];
    if (r['Lesso-Code'] && !fam.lesso) fam.lesso = r['Lesso-Code'];
    if (r.Image && !fam.image) fam.image = r.Image;
  }
  // natural-ish size sort
  for (const fam of byCode.values()) {
    fam.sizes.sort(sizeSort);
  }
  return [...byCode.values()].sort((a, b) =>
    a.family.localeCompare(b.family) || a.code.localeCompare(b.code)
  );
}

/** Parse a trade size like 1-1/2", 3/4", 4" x 3" into a sortable number (first dimension). */
function sizeValue(s) {
  const first = String(s).split(/[x×]/i)[0].trim();
  const m = first.match(/(\d+)\s*-\s*(\d+)\s*\/\s*(\d+)/); // 1-1/2
  if (m) return parseInt(m[1], 10) + parseInt(m[2], 10) / parseInt(m[3], 10);
  const f = first.match(/(\d+)\s*\/\s*(\d+)/); // 3/4
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

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const SHARED_CSS = `
  :root {
    --ink: #0C1117;
    --ink2: #151D26;
    --ink3: #1E2A35;
    --gold: #C8981F;
    --gold2: #E2AF34;
    --silver: #8BA0B2;
    --smoke: #C8D4DC;
    --white: #FFFFFF;
  }
  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'DM Sans', sans-serif;
    background: #888;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 8.5in;
    height: 11in;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    background: var(--ink);
    color: var(--smoke);
  }
  .page:last-child { page-break-after: auto; }
  .topbar {
    background: var(--gold);
    padding: 9px 0.5in;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .topbar span {
    font-family: 'DM Mono', monospace;
    font-size: 8.5px;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    color: var(--ink);
    font-weight: 500;
  }
  .topbar .badge {
    background: var(--ink);
    color: var(--gold);
    padding: 3px 9px;
    font-size: 7.5px;
    letter-spacing: 2px;
  }
  .content {
    padding: 0.32in 0.48in 0.28in;
    height: calc(11in - 34px - 0.95in);
    display: flex;
    flex-direction: column;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.12in;
    border-bottom: 2px solid var(--gold);
    margin-bottom: 0.16in;
  }
  .header img { height: 0.42in; }
  .header-right {
    text-align: right;
    font-family: 'DM Mono', monospace;
    font-size: 7.5px;
    letter-spacing: 1.2px;
    color: var(--silver);
    line-height: 1.55;
  }
  .header-right strong { color: var(--gold); }
  .lbl {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: 'DM Mono', monospace;
    font-size: 7.5px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 4px;
  }
  .lbl::before {
    content: '';
    width: 16px;
    height: 1px;
    background: var(--gold);
  }
  h1.title {
    font-family: 'Oswald', sans-serif;
    font-size: 28px;
    font-weight: 700;
    color: var(--white);
    line-height: 1.05;
    margin-bottom: 6px;
  }
  h1.title em { font-style: normal; color: var(--gold2); }
  .tagline {
    font-size: 11px;
    color: var(--silver);
    font-weight: 300;
    line-height: 1.45;
    margin-bottom: 0.14in;
    max-width: 6.8in;
  }
  .meta-row {
    display: grid;
    grid-template-columns: 1.35fr 1fr;
    gap: 0.16in;
    margin-bottom: 0.14in;
  }
  .panel {
    background: var(--ink2);
    border: 1px solid rgba(200,152,31,.15);
    border-left: 3px solid var(--gold);
    padding: 10px 12px;
  }
  .panel h3 {
    font-family: 'Oswald', sans-serif;
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--white);
    margin-bottom: 6px;
  }
  .panel p {
    font-size: 9px;
    line-height: 1.45;
    color: var(--silver);
    font-weight: 300;
  }
  .std-list { list-style: none; }
  .std-list li {
    display: flex;
    gap: 8px;
    margin-bottom: 5px;
    font-size: 9px;
    color: var(--silver);
    line-height: 1.35;
  }
  .std-list code {
    font-family: 'DM Mono', monospace;
    font-size: 8px;
    color: var(--gold);
    white-space: nowrap;
    min-width: 1.5in;
  }
  .apps {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 8px;
  }
  .chip {
    font-family: 'DM Mono', monospace;
    font-size: 7px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--smoke);
    border: 1px solid rgba(139,160,178,.25);
    padding: 3px 7px;
  }
  .note {
    font-size: 8.5px;
    color: var(--silver);
    line-height: 1.4;
    margin-top: 8px;
    padding-top: 7px;
    border-top: 1px solid rgba(139,160,178,.15);
  }
  .stats {
    display: flex;
    gap: 0.35in;
    margin-bottom: 0.12in;
  }
  .stat-n {
    font-family: 'Oswald', sans-serif;
    font-size: 22px;
    color: var(--gold);
    line-height: 1;
  }
  .stat-l {
    font-family: 'DM Mono', monospace;
    font-size: 7px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--silver);
    margin-top: 2px;
  }
  table.prod {
    width: 100%;
    border-collapse: collapse;
    font-size: 8px;
  }
  table.prod th {
    font-family: 'DM Mono', monospace;
    font-size: 7px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--gold);
    text-align: left;
    padding: 5px 6px;
    border-bottom: 1px solid rgba(200,152,31,.35);
  }
  table.prod td {
    padding: 5px 6px;
    border-bottom: 1px solid rgba(139,160,178,.12);
    color: var(--smoke);
    vertical-align: top;
    line-height: 1.35;
  }
  table.prod tr:nth-child(even) td { background: rgba(255,255,255,.02); }
  .sku {
    font-family: 'DM Mono', monospace;
    font-size: 7.5px;
    color: var(--gold2);
  }
  .pname {
    font-family: 'Oswald', sans-serif;
    font-size: 9px;
    letter-spacing: 0.3px;
    color: var(--white);
    text-transform: uppercase;
  }
  .sizes { color: var(--silver); font-size: 7.5px; }
  .stds { color: var(--silver); font-size: 7px; }
  .thumb {
    width: 0.38in;
    height: 0.38in;
    object-fit: contain;
  }
  .cta {
    margin-top: auto;
    background: var(--gold);
    margin-left: -0.48in;
    margin-right: -0.48in;
    margin-bottom: -0.28in;
    padding: 0.16in 0.48in;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .cta-h {
    font-family: 'Oswald', sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: var(--ink);
  }
  .cta-s {
    font-size: 9px;
    color: rgba(12,17,23,.65);
    margin-top: 2px;
  }
  .cta-contact {
    text-align: right;
    font-family: 'Oswald', sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
    line-height: 1.45;
  }
  .cta-contact span {
    display: block;
    font-family: 'DM Mono', monospace;
    font-size: 7.5px;
    letter-spacing: 1.3px;
    font-weight: 400;
    color: rgba(12,17,23,.55);
    text-transform: uppercase;
  }
  .page-num {
    position: absolute;
    bottom: 0.12in;
    right: 0.48in;
    font-family: 'DM Mono', monospace;
    font-size: 7px;
    color: rgba(12,17,23,.45);
  }
  .footer-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 0.95in;
    background: var(--gold);
    padding: 0.16in 0.48in;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .fb-l {
    font-family: 'DM Mono', monospace;
    font-size: 7px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(12,17,23,.55);
  }
  .fb-v {
    font-family: 'Oswald', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink);
  }
`;

function renderCoverPage(catKey, meta, families, totalRows, pageLabel) {
  const standards = (meta.standards || [])
    .map((s) => `<li><code>${esc(s.code)}</code><span>${esc(s.name)}</span></li>`)
    .join('');
  const apps = (meta.applications || [])
    .map((a) => `<span class="chip">${esc(a)}</span>`)
    .join('');
  const previewImgs = [...new Set(families.map((f) => f.image).filter(Boolean))]
    .slice(0, 6)
    .map((img) => {
      const url = imageFileUrl(img);
      return url ? `<img class="thumb" src="${url}" alt=""/>` : '';
    })
    .join('');

  return `
<section class="page">
  <div class="topbar">
    <span>Sell Sheet · ${esc(meta.title)}</span>
    <span class="badge">${esc(COMPANY.tag)}</span>
  </div>
  <div class="content">
    <div class="header">
      <img src="${imageFileUrl('logo.png')}" alt="All Pro"/>
      <div class="header-right">
        <strong>${esc(COMPANY.name)}</strong><br/>
        ${esc(COMPANY.phone)} · ${esc(COMPANY.email)}
      </div>
    </div>
    <div class="lbl">Product Category · ${esc(meta.material)}</div>
    <h1 class="title">${esc(meta.title.split(' ')[0])} <em>${esc(meta.title.split(' ').slice(1).join(' ') || 'Line')}</em></h1>
    <p class="tagline">${esc(meta.tagline)}</p>
    <div class="stats">
      <div><div class="stat-n">${families.length}</div><div class="stat-l">Product Types</div></div>
      <div><div class="stat-n">${totalRows}</div><div class="stat-l">SKU / Size Rows</div></div>
      <div><div class="stat-n">${[...new Set(families.flatMap((f) => f.sizes))].length}</div><div class="stat-l">Unique Sizes</div></div>
    </div>
    <div class="meta-row">
      <div class="panel">
        <h3>Category Overview</h3>
        <p>${esc(meta.overview)}</p>
        <div class="apps">${apps}</div>
        ${meta.notes ? `<div class="note">${esc(meta.notes)}</div>` : ''}
      </div>
      <div class="panel">
        <h3>Applicable Standards</h3>
        <ul class="std-list">${standards}</ul>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">${previewImgs}</div>
      </div>
    </div>
    <div class="lbl">In This Sheet</div>
    <p class="tagline" style="margin-bottom:0;font-size:10px">
      Full product listing with item codes, available sizes, pack quantities, factory references, and per-item standards follows.
      Pricing available on request — call or email with your takeoff.
    </p>
  </div>
  <div class="footer-bar">
    <div><div class="fb-l">Call</div><div class="fb-v">${esc(COMPANY.phone)}</div></div>
    <div style="text-align:center"><div class="fb-l">Email</div><div class="fb-v" style="font-size:11px">${esc(COMPANY.email)}</div></div>
    <div style="text-align:right"><div class="fb-l">Web</div><div class="fb-v" style="font-size:11px">${esc(COMPANY.web)}</div></div>
    <div class="page-num">${esc(pageLabel)}</div>
  </div>
</section>`;
}

function renderTablePages(meta, families, startPage) {
  const perPage = 14;
  const pages = chunk(families, perPage);
  return pages
    .map((batch, idx) => {
      const pageNo = startPage + idx;
      const rows = batch
        .map((f) => {
          const url = imageFileUrl(f.image);
          const thumb = url ? `<img class="thumb" src="${url}" alt=""/>` : '';
          const factory = [f.tommur ? `Tommur: ${f.tommur}` : '', f.lesso ? `Lesso: ${f.lesso}` : '']
            .filter(Boolean)
            .join(' · ');
          return `<tr>
            <td style="width:0.45in">${thumb}</td>
            <td style="width:1.15in"><div class="sku">${esc(f.code)}</div><div class="pname">${esc(f.family)}</div></td>
            <td style="width:1.55in">${esc(f.description)}${factory ? `<div class="stds" style="margin-top:2px">${esc(factory)}</div>` : ''}</td>
            <td class="sizes">${esc(f.sizes.join(', '))}</td>
            <td style="width:0.45in;text-align:center">${esc(f.pack || '—')}</td>
            <td class="stds" style="width:1.35in">${esc((f.standards || []).join(' · ') || '—')}</td>
          </tr>`;
        })
        .join('');

      return `
<section class="page">
  <div class="topbar">
    <span>${esc(meta.title)} · Product Listing</span>
    <span class="badge">Call for Pricing</span>
  </div>
  <div class="content" style="height:calc(11in - 34px - 0.72in)">
    <div class="header">
      <img src="${imageFileUrl('logo.png')}" alt="All Pro"/>
      <div class="header-right">
        <strong>${esc(COMPANY.name)}</strong><br/>
        ${esc(meta.title)} Sell Sheet · Page ${pageNo}
      </div>
    </div>
    <div class="lbl">Products &amp; Specs</div>
    <h1 class="title" style="font-size:20px;margin-bottom:0.1in">${esc(meta.title)} <em>Catalog</em></h1>
    <table class="prod">
      <thead>
        <tr>
          <th></th>
          <th>Code / Type</th>
          <th>Description / Factory</th>
          <th>Available Sizes</th>
          <th>Pack</th>
          <th>Standards</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="cta">
      <div>
        <div class="cta-h">Need Pricing or Lead Times?</div>
        <div class="cta-s">Send item codes, sizes, and quantities — we respond fast.</div>
      </div>
      <div class="cta-contact">
        <span>Direct Line</span>${esc(COMPANY.phone)}
        <span style="margin-top:3px">Email</span>${esc(COMPANY.email)}
      </div>
    </div>
  </div>
</section>`;
    })
    .join('\n');
}

function wrapHtml(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<style>${SHARED_CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
}

function renderIndexHtml(categories) {
  const cards = categories
    .map(
      (c) => `<div class="panel" style="margin-bottom:8px">
      <h3>${esc(c.title)}</h3>
      <p>${esc(c.tagline)}</p>
      <p style="margin-top:6px;font-family:'DM Mono',monospace;font-size:8px;color:var(--gold)">
        ${c.familyCount} types · ${c.rowCount} SKUs · PDF: ${esc(c.pdfName)}
      </p>
      <div class="apps" style="margin-top:6px">${(c.standards || [])
        .slice(0, 3)
        .map((s) => `<span class="chip">${esc(s.code)}</span>`)
        .join('')}</div>
    </div>`
    )
    .join('');

  const body = `
<section class="page">
  <div class="topbar">
    <span>Factory-Sourced Catalog · Sell Sheet Index</span>
    <span class="badge">${esc(COMPANY.tag)}</span>
  </div>
  <div class="content">
    <div class="header">
      <img src="${imageFileUrl('logo.png')}" alt="All Pro"/>
      <div class="header-right">
        <strong>${esc(COMPANY.name)}</strong><br/>
        ${esc(COMPANY.phone)} · ${esc(COMPANY.email)}
      </div>
    </div>
    <div class="lbl">Complete Line Card</div>
    <h1 class="title">Category <em>Sell Sheets</em></h1>
    <p class="tagline">
      One sell sheet per product category from the factory-sourced catalog. Each sheet lists item codes,
      sizes, pack quantities, factory references, and the governing ASTM / ASME / NSF standards.
    </p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;overflow:hidden;max-height:6.2in">
      ${cards}
    </div>
  </div>
  <div class="footer-bar">
    <div><div class="fb-l">Call</div><div class="fb-v">${esc(COMPANY.phone)}</div></div>
    <div style="text-align:center"><div class="fb-l">Email</div><div class="fb-v" style="font-size:11px">${esc(COMPANY.email)}</div></div>
    <div style="text-align:right"><div class="fb-l">Web</div><div class="fb-v" style="font-size:11px">${esc(COMPANY.web)}</div></div>
  </div>
</section>`;
  return wrapHtml('All Pro — Sell Sheet Index', body);
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
      tagline: `${catKey} products from the All Pro catalog.`,
      overview: `Factory-sourced ${catKey} for contractor and trade accounts.`,
      standards: [],
      applications: [],
      notes: '',
    };
    const families = productFamilies(rows);
    const cover = renderCoverPage(catKey, meta, families, rows.length, '01');
    const tables = renderTablePages(meta, families, 2);
    const html = wrapHtml(`${COMPANY.name} — ${meta.title} Sell Sheet`, cover + tables);
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
      standards: meta.standards || [],
    });
    console.log(`HTML: ${htmlName} (${families.length} types, ${rows.length} rows)`);
  }

  const indexHtml = renderIndexHtml(indexMeta);
  const indexHtmlPath = path.join(htmlDir, '00-sell-sheet-index.html');
  fs.writeFileSync(indexHtmlPath, indexHtml);

  // Also write a markdown summary of standards / products for the repo
  const mdLines = [
    '# All Pro Building Supplies — Category Sell Sheets',
    '',
    'Generated from `assets/products.csv`. Rebuild with `npm run sell-sheets` from `brochure/`.',
    '',
    '## PDFs',
    '',
    '| Category | PDF | Product types | SKU rows |',
    '|---|---|---:|---:|',
    ...indexMeta.map(
      (c) => `| ${c.title} | \`brochure/sell-sheets/pdf/${c.pdfName}\` | ${c.familyCount} | ${c.rowCount} |`
    ),
    '',
    '## Category standards',
    '',
  ];
  for (const [key, meta] of Object.entries(CATEGORY_META)) {
    mdLines.push(`### ${meta.title}`);
    mdLines.push('');
    mdLines.push(meta.overview);
    mdLines.push('');
    mdLines.push('**Standards**');
    mdLines.push('');
    for (const s of meta.standards) mdLines.push(`- **${s.code}** — ${s.name}`);
    mdLines.push('');
    mdLines.push(`**Applications:** ${(meta.applications || []).join('; ')}`);
    mdLines.push('');
  }
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
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 120000 });
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

  await browser.close();
  console.log(`\nDone. ${generated.length} category sell sheets + index → ${pdfDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

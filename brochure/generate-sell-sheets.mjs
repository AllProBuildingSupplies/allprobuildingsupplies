/**
 * Customer-facing category sell sheets from assets/products.csv.
 * Cover → department covers → one sheet per sub_sub_category.
 * Run from brochure/: npm run sell-sheets
 */
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { CATEGORY_META, COMPANY, DEPARTMENT_META, standardsForSku } from './category-standards.js';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const csvPath = path.join(root, 'assets', 'products.csv');
const outDir = path.join(__dirname, 'sell-sheets');
const htmlDir = path.join(outDir, 'html');
const pdfDir = path.join(outDir, 'pdf');
const imagesDir = path.join(root, 'images');

const PAGE_H = 11;
const HDR_H = 0.46;
const FTR_H = 0.36;
const INTRO_H = 1.72;
const BODY_PAD = 0.16;
const BODY_FIRST = PAGE_H - HDR_H - FTR_H - INTRO_H - BODY_PAD;
const BODY_CONT = PAGE_H - HDR_H - FTR_H - BODY_PAD - 0.04;
const SIZE_COLS = 4;

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

function isLogoPath(rel) {
  return /logo(-email)?\.(png|jpe?g|webp|gif)$/i.test(String(rel || ''));
}

function realImagePath(rel) {
  if (!rel || isLogoPath(rel)) return null;
  const clean = String(rel).replace(/^\.\//, '').replace(/^images\//, '');
  const abs = path.join(imagesDir, clean);
  return fs.existsSync(abs) ? abs : null;
}

function imgUrl(rel) {
  const abs = realImagePath(rel);
  return abs ? `file://${abs}` : null;
}

function firstRealImage(rows) {
  for (const r of rows || []) {
    if (realImagePath(r.Image)) return r.Image;
  }
  return null;
}

function logoUrl() {
  const light = path.join(imagesDir, 'logo-email.png');
  const dark = path.join(imagesDir, 'logo.png');
  if (fs.existsSync(light)) return `file://${light}`;
  if (fs.existsSync(dark)) return `file://${dark}`;
  return null;
}

function displayPrice(raw) {
  const s = String(raw ?? '')
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .trim();
  if (s === '') return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n === 0) return null;
  return n;
}

function fmtPrice(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v === 0) return '';
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

function priceUnitFor(row) {
  const desc = (row.Description || '').toLowerCase();
  if (/\b\d+\s*ft\s+(stick|coil)\b/.test(desc) || /\b(100 ft coil|20 ft stick)\b/.test(desc)) {
    return '/ea';
  }
  const sub = (row.sub_category || '').toLowerCase();
  const ssc = (row.sub_sub_category || '').toLowerCase();
  if (sub === 'pipes' && !ssc.includes('pex')) return '/ft';
  return '/ea';
}

function plumbingTitle(row) {
  const style = (row.sub_sub_sub_category || row.Description || '').trim();
  const code = row.Code || '';
  if (/COPPER-K/i.test(code)) return `${style} · Type K`;
  if (/COPPER-L/i.test(code)) return `${style} · Type L`;
  return style;
}

function stripColorSuffix(code, color) {
  if (!code || !color) return code;
  const escColor = color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return code.replace(new RegExp(`[- ]${escColor}$`, 'i'), '');
}

function plumbingGroupKey(row) {
  const code = (row.Code || 'UNKNOWN').trim();
  const color = (row.Color || '').trim();
  const stripped = stripColorSuffix(code, color);
  if (color && stripped !== code) return `c:${stripped}`;
  return `k:${code}`;
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

function buildPlumbingBlocks(rows) {
  const byKey = new Map();
  for (const r of rows) {
    const key = plumbingGroupKey(r);
    const color = (r.Color || '').trim();
    const code = stripColorSuffix((r.Code || 'UNKNOWN').trim(), color);
    if (!byKey.has(key)) {
      byKey.set(key, {
        kind: 'fitting',
        title: plumbingTitle(r),
        code,
        description: r.Description,
        pack: r.Pack,
        unit: priceUnitFor(r),
        image: firstRealImage([r]),
        standards: standardsForSku(r),
        sizes: [],
      });
    }
    const b = byKey.get(key);
    const size = (r.Size || '').trim();
    if (!b.image) b.image = firstRealImage([r]);
    if (r.Pack) b.pack = r.Pack;
    const dup = b.sizes.some((s) => s.size === size && s.color === color);
    if ((size || color) && !dup) {
      b.sizes.push({ size, color, price: displayPrice(r.Price), unit: b.unit });
    }
  }
  const blocks = [];
  for (const b of byKey.values()) {
    b.sizes.sort((a, c) => sizeSort(a.size, c.size) || String(a.color).localeCompare(c.color));
    const colors = unique(b.sizes.map((s) => s.color));
    const sizes = unique(b.sizes.map((s) => s.size));
    let sizeOnly = sizes.length > 0;
    const priceBySize = new Map();
    for (const sz of sizes) {
      const prices = unique(b.sizes.filter((s) => s.size === sz).map((s) => String(s.price ?? '')));
      if (prices.length !== 1) sizeOnly = false;
      priceBySize.set(sz, b.sizes.find((s) => s.size === sz)?.price ?? null);
    }
    if (colors.length > 1 && sizeOnly) {
      blocks.push({
        kind: 'size-table',
        title: b.title,
        code: b.code,
        description: b.description,
        pack: b.pack,
        unit: b.unit,
        image: b.image,
        continuation: false,
        colors,
        sizes: sizes.map((size) => ({ size, price: priceBySize.get(size), unit: b.unit })),
      });
      continue;
    }
    b.showColor = colors.length > 1;
    if (!b.showColor) b.sizes = b.sizes.map((s) => ({ ...s, color: '' }));
    blocks.push(b);
  }
  blocks.sort((a, b) => a.title.localeCompare(b.title) || a.code.localeCompare(b.code));
  return blocks;
}

function buildStyleBlocks(rows) {
  const byStyle = new Map();
  for (const r of rows) {
    const key = (r.sub_sub_sub_category || r.Code || r.Description || 'Item').trim();
    if (!byStyle.has(key)) byStyle.set(key, []);
    byStyle.get(key).push(r);
  }
  const blocks = [];
  for (const [title, group] of [...byStyle.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const unit = priceUnitFor(group[0]);
    const variants = [];
    for (const r of group) {
      const size = (r.Size || '').trim();
      const color = (r.Color || '').trim();
      if (!size && !color) continue;
      if (variants.some((v) => v.size === size && v.color === color)) continue;
      variants.push({
        size,
        color,
        price: displayPrice(r.Price),
        unit,
        image: r.Image,
      });
    }
    variants.sort((a, b) => sizeSort(a.size, b.size) || String(a.color).localeCompare(b.color));
    const sizes = unique(variants.map((v) => v.size));
    const colors = unique(variants.map((v) => v.color));
    const priceBySize = new Map();
    let sizeOnly = sizes.length > 0;
    for (const sz of sizes) {
      const prices = unique(variants.filter((v) => v.size === sz).map((v) => String(v.price ?? '')));
      if (prices.length !== 1) sizeOnly = false;
      priceBySize.set(sz, variants.find((v) => v.size === sz)?.price ?? null);
    }
    const pricesAll = unique(variants.map((v) => String(v.price ?? '')));
    const onePrice = pricesAll.length === 1;
    const pack = group.find((r) => r.Pack)?.Pack || '';
    const code = group[0].Code || '';
    const description = group[0].Description || '';
    const image = firstRealImage(group);
    const base = { title, code, description, pack, unit, image, continuation: false };

    if (variants.length && sizes.length <= 1 && colors.length <= 1) {
      blocks.push({
        ...base,
        kind: 'size-table',
        colors: [],
        sizes: [{ size: sizes[0] || colors[0] || variants[0].size, price: variants[0].price, unit }],
      });
      continue;
    }

    if (colors.length >= 2 && sizes.length <= 1) {
      const swatches = colors.map((color) => {
        const v = variants.find((x) => x.color === color);
        return {
          color,
          image: firstRealImage(group.filter((r) => (r.Color || '').trim() === color)),
          price: onePrice ? null : v?.price ?? null,
          unit,
        };
      });
      blocks.push({
        ...base,
        kind: 'color-grid',
        size: sizes[0] || '',
        price: onePrice ? variants[0]?.price ?? null : null,
        swatches,
      });
      continue;
    }

    if (sizeOnly && sizes.length >= 1 && colors.length >= 1) {
      blocks.push({
        ...base,
        kind: 'size-table',
        colors,
        sizes: sizes.map((size) => ({ size, price: priceBySize.get(size), unit })),
      });
      continue;
    }

    blocks.push({
      ...base,
      kind: 'matrix',
      rows: variants,
    });
  }
  return blocks;
}

function fittingCols(sizes, showColor) {
  if (showColor) return 3;
  const long = (sizes || []).some((s) => String(s.size || s).length > 8 || /x/i.test(String(s.size || s)));
  return long ? 3 : 5;
}

function fittingHeight(b) {
  const n = b.sizes.length;
  const perRow = fittingCols(b.sizes, b.showColor);
  const rows = Math.max(1, Math.ceil(n / perRow));
  return 0.1 + Math.max(0.88, 0.38 + 0.22 * rows);
}

function sizeTableHeight(nSizes, continuation) {
  const head = continuation ? 0.38 : 1.28;
  return head + 0.22 * Math.ceil(Math.max(1, nSizes) / SIZE_COLS);
}

function colorGridHeight(n, continuation) {
  const head = continuation ? 0.38 : 0.52;
  return head + 1.18 * Math.ceil(Math.max(1, n) / 6);
}

function matrixHeight(n, continuation) {
  const head = continuation ? 0.38 : 1.18;
  return head + 0.24 * Math.max(1, n);
}

function blockHeight(b) {
  if (b.kind === 'fitting') return fittingHeight(b);
  if (b.kind === 'size-table') return sizeTableHeight(b.sizes.length, b.continuation);
  if (b.kind === 'color-grid') return colorGridHeight(b.swatches.length, b.continuation);
  if (b.kind === 'matrix') return matrixHeight(b.rows.length, b.continuation);
  return 1.2;
}

function splitBlock(b, remaining) {
  if (blockHeight(b) <= remaining) return { take: b, rest: null };
  const minKeep = 1.35;
  if (remaining < minKeep) return { take: null, rest: b };

  if (b.kind === 'fitting') {
    const perRow = fittingCols(b.sizes, b.showColor);
    const rowH = 0.22;
    const head = 0.48;
    const availRows = Math.max(1, Math.floor((remaining - head) / rowH));
    const avail = Math.min(b.sizes.length - 1, availRows * perRow);
    if (avail < 1) return { take: null, rest: b };
    const take = { ...b, sizes: b.sizes.slice(0, avail) };
    if (blockHeight(take) > remaining) return { take: null, rest: b };
    return {
      take,
      rest: { ...b, sizes: b.sizes.slice(avail), continuation: true },
    };
  }

  if (b.kind === 'size-table') {
    const head = b.continuation ? 0.38 : 1.28;
    const rowsAvail = Math.max(1, Math.floor((remaining - head) / 0.22));
    const avail = Math.min(b.sizes.length - 1, rowsAvail * SIZE_COLS);
    if (avail < 1) return { take: null, rest: b };
    const take = { ...b, sizes: b.sizes.slice(0, avail) };
    if (blockHeight(take) > remaining) return { take: null, rest: b };
    return {
      take,
      rest: { ...b, sizes: b.sizes.slice(avail), continuation: true, image: null },
    };
  }

  if (b.kind === 'color-grid') {
    const head = b.continuation ? 0.38 : 0.52;
    const rowsAvail = Math.max(1, Math.floor((remaining - head) / 1.18));
    const avail = Math.min(b.swatches.length - 1, rowsAvail * 6);
    if (avail < 1) return { take: null, rest: b };
    const take = { ...b, swatches: b.swatches.slice(0, avail) };
    if (blockHeight(take) > remaining) return { take: null, rest: b };
    return {
      take,
      rest: { ...b, swatches: b.swatches.slice(avail), continuation: true, image: null },
    };
  }

  if (b.kind === 'matrix') {
    const head = b.continuation ? 0.38 : 1.18;
    const avail = Math.min(b.rows.length - 1, Math.max(1, Math.floor((remaining - head) / 0.24)));
    if (avail < 1) return { take: null, rest: b };
    const take = { ...b, rows: b.rows.slice(0, avail) };
    if (blockHeight(take) > remaining) return { take: null, rest: b };
    return {
      take,
      rest: { ...b, rows: b.rows.slice(avail), continuation: true, image: null },
    };
  }

  return { take: null, rest: b };
}

function packBlocks(blocks) {
  const pages = [];
  let bucket = [];
  let used = 0;
  let limit = BODY_FIRST;
  const queue = [...blocks];

  const flush = () => {
    if (bucket.length) pages.push(bucket);
    bucket = [];
    used = 0;
    limit = BODY_CONT;
  };

  while (queue.length) {
    const b = queue.shift();
    const h = blockHeight(b);
    if (!bucket.length && h <= limit) {
      bucket.push(b);
      used += h;
      continue;
    }
    if (bucket.length && used + h <= limit - 0.06) {
      bucket.push(b);
      used += h;
      continue;
    }
    const room = bucket.length ? limit - used : limit;
    const { take, rest } = splitBlock(b, room);
    if (take) {
      bucket.push(take);
      flush();
      if (rest) queue.unshift(rest);
    } else if (bucket.length) {
      flush();
      queue.unshift(b);
    } else {
      bucket.push(b);
      flush();
    }
  }
  if (bucket.length) pages.push(bucket);
  return pages.length ? pages : [[]];
}

const SHARED_CSS = `
  :root {
    --ink: #0C1117;
    --navy: #1A3350;
    --gold: #C8981F;
    --gold2: #B8871A;
    --gold-soft: #E8C56A;
    --muted: #5C6B7A;
    --line: #D8DEE6;
    --soft: #F4F6F8;
    --paper: #FFFFFF;
  }
  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'DM Sans', sans-serif;
    background: #cfcfcf;
    color: var(--ink);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet, .cover {
    width: 8.5in;
    height: 11in;
    background: var(--paper);
    page-break-after: always;
    overflow: hidden;
    position: relative;
  }
  .sheet:last-child, .cover:last-child { page-break-after: auto; }

  .hdr {
    height: 0.46in;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.28in;
    border-bottom: 3px solid var(--navy);
    flex-shrink: 0;
  }
  .hdr-brand { display: flex; align-items: center; gap: 8px; }
  .hdr-brand img { height: 0.32in; width: auto; }
  .hdr-brand span {
    font-family: 'Oswald', sans-serif;
    font-size: 13px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: var(--navy);
  }
  .hdr h1 {
    font-family: 'Oswald', sans-serif;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.4px;
    line-height: 1;
  }
  .hdr h1 em { color: var(--gold2); font-style: normal; font-size: 14px; margin-left: 6px; }
  .hdr-meta {
    text-align: right;
    font-family: 'DM Mono', monospace;
    font-size: 7.5px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .hdr-meta strong { color: var(--gold2); display: block; font-size: 8px; margin-top: 2px; }

  .hero-band {
    height: 1.38in;
    margin: 0.12in 0.28in 0;
    overflow: hidden;
    background: #fff;
    border: 1px solid var(--line);
    flex-shrink: 0;
  }
  .hero-band img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
  }
  .hero-band.contain img { object-fit: contain; }
  .intro {
    display: grid;
    grid-template-columns: 2.35in 1fr;
    height: 1.52in;
    margin: 0.1in 0.28in 0.06in;
    gap: 10px;
    flex-shrink: 0;
  }
  .intro.no-pic { grid-template-columns: 1fr; height: auto; min-height: 0.7in; }
  .intro-pic {
    background: #fff;
    border: 1px solid var(--line);
    overflow: hidden;
  }
  .intro-pic img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
  }
  .intro-pic.contain img { object-fit: contain; }
  .intro .spec-band { margin: 0; height: 100%; }
  .spec-band {
    margin: 0.1in 0.28in 0.08in;
    padding: 8px 10px;
    border: 1px solid var(--line);
    background: var(--soft);
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 10px;
    flex-shrink: 0;
  }
  .spec-band p { font-size: 9px; line-height: 1.35; color: var(--navy); }
  .spec-band .note { font-size: 8px; color: var(--muted); margin-top: 4px; }
  .spec-stds { display: flex; flex-wrap: wrap; gap: 4px; align-content: start; }
  .badge {
    font-family: 'DM Mono', monospace;
    font-size: 7px;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    border: 1px solid rgba(200,152,31,.55);
    color: var(--gold2);
    padding: 3px 6px;
    background: #fff;
  }

  .body {
    flex: 1;
    min-height: 0;
    padding: 0.08in 0.28in 0.08in;
    overflow: hidden;
  }
  .sheet { display: flex; flex-direction: column; }

  .ftr {
    height: 0.36in;
    background: var(--navy);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.28in;
    font-family: 'DM Mono', monospace;
    font-size: 7px;
    letter-spacing: 1.1px;
    text-transform: uppercase;
    flex-shrink: 0;
  }
  .ftr strong { color: var(--gold-soft); font-weight: 500; }

  .fit {
    display: grid;
    grid-template-columns: 0.88in 1fr;
    gap: 10px;
    padding: 6px 0;
    border-bottom: 1px solid var(--line);
    align-items: start;
  }
  .fit .ph, .ph {
    width: 0.88in;
    height: 0.88in;
    background: #fff;
    border: 1px solid var(--line);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .ph img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
    display: block;
  }
  .fit-name {
    font-family: 'Oswald', sans-serif;
    font-size: 13px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    line-height: 1.1;
  }
  .fit-code {
    font-family: 'DM Mono', monospace;
    font-size: 7.5px;
    color: var(--muted);
    margin: 2px 0 6px;
    letter-spacing: 0.4px;
  }
  .size-list {
    display: flex;
    flex-wrap: wrap;
    gap: 5px 16px;
  }
  .size-item {
    font-size: 10.5px;
    line-height: 1.25;
    min-width: 1.2in;
  }
  .size-item .sz { font-family: 'DM Mono', monospace; font-weight: 500; color: var(--navy); }
  .size-item .pr { font-weight: 600; color: var(--gold2); margin-left: 6px; white-space: nowrap; }
  .size-item .u { font-size: 8px; color: var(--muted); font-weight: 400; margin-left: 2px; }

  .style {
    padding: 8px 0 10px;
    border-bottom: 1px solid var(--line);
  }
  .style-top {
    display: grid;
    grid-template-columns: 1.55in 1fr;
    gap: 12px;
    margin-bottom: 6px;
  }
  .style-top.no-photo { grid-template-columns: 1fr; }
  .style-photo {
    width: 1.55in;
    height: 1.05in;
    background: #fff;
    border: 1px solid var(--line);
    overflow: hidden;
  }
  .style-photo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
    display: block;
  }
  .style-name {
    font-family: 'Oswald', sans-serif;
    font-size: 16px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    line-height: 1.1;
  }
  .style-code {
    font-family: 'DM Mono', monospace;
    font-size: 7.5px;
    color: var(--muted);
    margin: 3px 0 6px;
  }
  .colors-line { font-size: 10px; line-height: 1.35; color: var(--navy); }
  .colors-line strong { font-family: 'Oswald', sans-serif; font-size: 9px; letter-spacing: 0.6px; color: var(--gold2); margin-right: 6px; }
  .meta-line { font-size: 9px; color: var(--muted); margin-top: 4px; }

  .sz-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
  }
  .sz-table td {
    width: 25%;
    padding: 3px 6px 3px 0;
    font-size: 10px;
    line-height: 1.2;
    vertical-align: top;
  }
  .sz-table .s { font-family: 'DM Mono', monospace; font-weight: 500; color: var(--navy); }
  .sz-table .p { color: var(--gold2); font-weight: 600; margin-left: 8px; white-space: nowrap; }
  .sz-table .p .u { font-size: 8px; color: var(--muted); font-weight: 400; margin-left: 3px; }

  .mx { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .mx th {
    text-align: left;
    font-family: 'Oswald', sans-serif;
    font-size: 8px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--muted);
    border-bottom: 1px solid var(--line);
    padding: 3px 8px 3px 0;
  }
  .mx td {
    font-size: 10px;
    padding: 3px 8px 3px 0;
    border-bottom: 1px solid var(--soft);
  }
  .mx .p { color: var(--gold2); font-weight: 600; white-space: nowrap; }

  .swatches {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px 8px;
    margin-top: 6px;
  }
  .swatch { min-width: 0; }
  .swatch .ph {
    width: 100%;
    height: 0.85in;
    margin-bottom: 3px;
  }
  .swatch .ph img { object-fit: cover; }
  .swatch .nm {
    font-size: 8px;
    line-height: 1.2;
    color: var(--navy);
    text-align: center;
  }
  .swatch .sp { font-size: 8px; color: var(--gold2); font-weight: 600; text-align: center; margin-top: 1px; }

  /* covers */
  .cover { display: grid; grid-template-columns: 2.3in 1fr; grid-template-rows: 1fr 0.36in; }
  .cover-side {
    grid-row: 1;
    background: var(--navy);
    padding: 0.18in 0.14in;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .cover .ftr { grid-column: 1 / -1; }
  .cover-photos { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 6px; }
  .cover-photos img, .cover-photos .slot {
    flex: 1;
    min-height: 0;
    width: 100%;
    object-fit: cover;
    object-position: center;
    border: 1px solid rgba(200,152,31,.35);
    background: #0f2438;
  }
  .cover-feat {
    border: 1px solid rgba(200,152,31,.45);
    padding: 7px 8px;
  }
  .cover-feat .t { font-family: 'Oswald', sans-serif; font-size: 10px; color: var(--gold-soft); letter-spacing: 0.6px; text-transform: uppercase; }
  .cover-feat .s { font-size: 7.5px; color: rgba(255,255,255,.65); margin-top: 2px; }
  .cover-main { padding: 0.26in 0.26in 0.12in; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
  .cover-brand { text-align: center; border-bottom: 2px solid var(--ink); padding-bottom: 8px; margin-bottom: 8px; }
  .cover-brand .nm {
    font-family: 'Oswald', sans-serif;
    font-size: 22px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
  }
  .cover-brand .nm span { color: var(--gold2); }
  .cover-brand img { height: 0.62in; width: auto; margin: 6px 0 4px; }
  .cover-brand .sub {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-style: italic;
    font-size: 14px;
    color: var(--navy);
  }
  .cover-brand .meta {
    font-family: 'DM Mono', monospace;
    font-size: 7.5px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: var(--muted);
    margin-top: 4px;
  }
  .banner {
    font-size: 8.5px;
    line-height: 1.35;
    color: var(--navy);
    border: 1px solid rgba(200,152,31,.35);
    border-left: 3px solid var(--gold);
    background: linear-gradient(90deg, rgba(200,152,31,.12), rgba(26,51,80,.05));
    padding: 6px 9px;
    margin-bottom: 8px;
  }
  .banner strong {
    font-family: 'Oswald', sans-serif;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--gold2);
    font-size: 9px;
    margin-right: 5px;
  }
  .tiles {
    flex: 1;
    min-height: 0;
    display: grid;
    gap: 7px;
    align-content: stretch;
  }
  .tiles.cols-1 { grid-template-columns: 1fr; }
  .tiles.cols-2 { grid-template-columns: 1fr 1fr; }
  .tiles.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
  .tile {
    border: 1px solid var(--line);
    border-left: 4px solid var(--gold);
    background: var(--soft);
    padding: 6px;
    display: flex;
    flex-direction: column;
    min-height: 0;
    text-decoration: none;
    color: inherit;
  }
  .tile .pic {
    flex: 1;
    min-height: 0.62in;
    height: auto;
    background: #fff;
    border: 1px solid var(--line);
    overflow: hidden;
    margin-bottom: 5px;
  }
  .tiles.cols-3 .tile .pic { min-height: 0.62in; }
  .tiles.cols-1 .tile {
    flex-direction: row;
    gap: 12px;
    padding: 8px;
    align-items: stretch;
  }
  .tiles.cols-1 .tile .pic {
    width: 2.15in;
    height: auto;
    min-height: 1.35in;
    margin-bottom: 0;
    flex: 0 0 2.15in;
  }
  .tile .pic img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
  }
  .tiles.cols-1 .tile .copy { display: flex; flex-direction: column; justify-content: center; }
  .tile h3 {
    font-family: 'Oswald', sans-serif;
    font-size: 12px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    line-height: 1.15;
  }
  .tiles.cols-1 .tile h3 { font-size: 18px; }
  .tile .tg { font-size: 8px; color: var(--muted); margin-top: 2px; line-height: 1.25; }
  .tile .ct {
    font-family: 'DM Mono', monospace;
    font-size: 7.5px;
    color: var(--gold2);
    letter-spacing: 0.6px;
    text-transform: uppercase;
    margin-top: auto;
    padding-top: 4px;
  }
`;

function wrapHtml(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&family=Cormorant+Garamond:ital,wght@1,500;1,600&display=swap" rel="stylesheet"/>
<style>${SHARED_CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
}

function renderHeader(meta, pageLabel, continued) {
  const logo = logoUrl();
  return `<div class="hdr">
    <div class="hdr-brand">${logo ? `<img src="${logo}" alt="All Pro"/>` : ''}<span>${esc(COMPANY.short)}</span></div>
    <h1>${esc(meta.title)}${continued ? ' <em>Cont.</em>' : ''}</h1>
    <div class="hdr-meta">Spec Sheet · ${esc(COMPANY.updated)}${pageLabel ? ` · ${esc(pageLabel)}` : ''}<strong>Suggested Wholesale</strong></div>
  </div>`;
}

function renderFooter(meta, pageLabel) {
  return `<div class="ftr">
    <div>${esc(meta.title)}${pageLabel ? ` · ${esc(pageLabel)}` : ''}</div>
    <div>${esc(COMPANY.phone)} · ${esc(COMPANY.email)}</div>
    <div><strong>${esc(COMPANY.short)}</strong> · ${esc(COMPANY.web)}</div>
  </div>`;
}

function renderSizeList(sizes) {
  return `<div class="size-list">${sizes
    .map((s) => {
      const label = [s.size, s.color].filter(Boolean).join(' · ');
      const pr = fmtPrice(s.price);
      return `<div class="size-item"><span class="sz">${esc(label)}</span>${pr ? `<span class="pr">${esc(pr)}<span class="u">${esc(s.unit || '')}</span></span>` : ''}</div>`;
    })
    .join('')}</div>`;
}

function renderFitting(b) {
  const url = imgUrl(b.image);
  return `<div class="fit">
    ${url ? `<div class="ph"><img src="${url}" alt=""/></div>` : '<div></div>'}
    <div>
      <div class="fit-name">${esc(b.title)}${b.continuation ? ' · Cont.' : ''}</div>
      <div class="fit-code">${esc(b.code)}${b.pack ? ` · Pack ${esc(b.pack)}` : ''} · ${esc(b.unit || '/ea')}${b.standards?.length ? ` · ${esc(b.standards.join(' · '))}` : ''}</div>
      ${renderSizeList(b.sizes)}
    </div>
  </div>`;
}

function sizePriceCells(sizes) {
  const rows = [];
  for (let i = 0; i < sizes.length; i += SIZE_COLS) rows.push(sizes.slice(i, i + SIZE_COLS));
  return rows
    .map((row) => {
      const cells = row
        .map((s) => {
          const pr = fmtPrice(s.price);
          return `<td><span class="s">${esc(s.size)}</span>${pr ? `<span class="p">${esc(pr)} <span class="u">${esc(s.unit || '')}</span></span>` : ''}</td>`;
        })
        .join('');
      return `<tr>${cells}${'<td></td>'.repeat(Math.max(0, SIZE_COLS - row.length))}</tr>`;
    })
    .join('');
}

function renderSizeTable(b) {
  const url = !b.continuation && imgUrl(b.image);
  const colors = (b.colors || []).filter(Boolean);
  const photo = url
    ? `<div class="style-photo"><img src="${url}" alt=""/></div>`
    : '';
  return `<div class="style">
    <div class="style-top${url ? '' : ' no-photo'}">
      ${photo}
      <div>
        <div class="style-name">${esc(b.title)}${b.continuation ? ' · Cont.' : ''}</div>
        <div class="style-code">${esc(b.code)}${b.pack ? ` · Pack ${esc(b.pack)}` : ''} · ${esc(b.unit || '/ea')}</div>
        ${colors.length ? `<div class="colors-line"><strong>Colors</strong>${esc(colors.join(' · '))}</div>` : ''}
      </div>
    </div>
    <table class="sz-table"><tbody>${sizePriceCells(b.sizes)}</tbody></table>
  </div>`;
}

function renderColorGrid(b) {
  const swatches = (b.swatches || [])
    .map((s) => {
      const url = imgUrl(s.image);
      const pr = fmtPrice(s.price);
      return `<div class="swatch">
        <div class="ph">${url ? `<img src="${url}" alt=""/>` : ''}</div>
        <div class="nm">${esc(s.color)}</div>
        ${pr ? `<div class="sp">${esc(pr)}</div>` : ''}
      </div>`;
    })
    .join('');
  const headPrice = fmtPrice(b.price);
  return `<div class="style">
    <div class="style-name">${esc(b.title)}${b.continuation ? ' · Cont.' : ''}</div>
    <div class="style-code">${esc(b.code)}${b.pack ? ` · Pack ${esc(b.pack)}` : ''}${b.size ? ` · ${esc(b.size)}` : ''}${headPrice ? ` · ${esc(headPrice)}${b.unit ? ` ${esc(b.unit)}` : ''}` : ''}</div>
    <div class="swatches">${swatches}</div>
  </div>`;
}

function renderMatrix(b) {
  const url = !b.continuation && imgUrl(b.image);
  const rows = (b.rows || [])
    .map((r) => {
      const pr = fmtPrice(r.price);
      return `<tr>
        <td>${esc(r.size || '—')}</td>
        <td>${esc(r.color || '—')}</td>
        <td class="p">${pr ? `${esc(pr)} ${esc(r.unit || '')}` : ''}</td>
      </tr>`;
    })
    .join('');
  return `<div class="style">
    <div class="style-top${url ? '' : ' no-photo'}">
      ${url ? `<div class="style-photo"><img src="${url}" alt=""/></div>` : ''}
      <div>
        <div class="style-name">${esc(b.title)}${b.continuation ? ' · Cont.' : ''}</div>
        <div class="style-code">${esc(b.code)}${b.pack ? ` · Pack ${esc(b.pack)}` : ''}</div>
      </div>
    </div>
    <table class="mx">
      <thead><tr><th>Size</th><th>Color</th><th>Price</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderBlock(b) {
  if (b.kind === 'fitting') return renderFitting(b);
  if (b.kind === 'size-table') return renderSizeTable(b);
  if (b.kind === 'color-grid') return renderColorGrid(b);
  return renderMatrix(b);
}

function renderCategoryPages(meta, blocks, rows) {
  const pages = packBlocks(blocks);
  const total = pages.length;
  const hero = imgUrl(firstRealImage(rows));
  const stds = (meta.standards || []).slice(0, 4);
  return pages
    .map((pageBlocks, idx) => {
      const label = total > 1 ? `${idx + 1} / ${total}` : '';
      const continued = idx > 0;
      const intro =
        idx === 0
          ? `<div class="intro${hero ? '' : ' no-pic'}">
          ${hero ? `<div class="intro-pic${['Windows', 'Flooring'].includes(meta.material) ? '' : ' contain'}"><img src="${hero}" alt=""/></div>` : ''}
        <div class="spec-band">
          <div>
            <p>${esc(meta.tagline || meta.overview || meta.title)}</p>
            ${meta.notes ? `<div class="note">${esc(meta.notes)}</div>` : ''}
          </div>
          <div class="spec-stds">${stds.map((s) => `<span class="badge">${esc(s.code)}</span>`).join('')}</div>
        </div>
        </div>`
          : '';
      return `<section class="sheet">
        ${renderHeader(meta, label, continued)}
        ${intro}
        <div class="body">${pageBlocks.map(renderBlock).join('')}</div>
        ${renderFooter(meta, label)}
      </section>`;
    })
    .join('\n');
}

function renderCover({ id, photos, feats, subtitle, footerLabel, cards, linked, priceNote }) {
  const logo = logoUrl();
  const photoHtml = (photos || [])
    .slice(0, 3)
    .map((p) => {
      const u = imgUrl(p) || (p && String(p).startsWith('file:') ? p : null);
      return u ? `<img src="${u}" alt=""/>` : `<div class="slot"></div>`;
    })
    .join('');
  const featHtml = (feats || [])
    .map((f) => `<div class="cover-feat"><div class="t">${esc(f.title)}</div><div class="s">${esc(f.sub)}</div></div>`)
    .join('');
  const cols = cards.length <= 3 ? 1 : cards.length <= 6 ? 2 : 3;
  const tiles = cards
    .map((c) => {
      const u = imgUrl(c.image);
      const inner = `
        ${u ? `<div class="pic"><img src="${u}" alt=""/></div>` : ''}
        <div class="copy">
        <h3>${esc(c.title)}</h3>
        ${c.tagline && cols === 1 ? `<div class="tg">${esc(c.tagline)}</div>` : ''}
        <div class="ct">${c.familyCount} types · ${c.rowCount} SKUs</div>
        </div>`;
      if (linked) return `<a class="tile" href="#${esc(c.slug)}">${inner}</a>`;
      return `<div class="tile">${inner}</div>`;
    })
    .join('');
  return `<section class="cover" id="${esc(id)}">
    <aside class="cover-side">
      <div class="cover-photos">${photoHtml}</div>
      ${featHtml}
    </aside>
    <div class="cover-main">
      <div class="cover-brand">
        <div class="nm">All Pro <span>Building Supplies</span></div>
        ${logo ? `<img src="${logo}" alt="All Pro"/>` : ''}
        <div class="sub">${esc(subtitle)}</div>
        <div class="meta">Updated ${esc(COMPANY.updated)} · ${esc(COMPANY.web)} · ${esc(COMPANY.phone)}</div>
      </div>
      <div class="banner"><strong>Suggested Wholesale</strong>${esc(priceNote)}</div>
      <div class="tiles cols-${cols}">${tiles}</div>
    </div>
    <div class="ftr">
      <div>${esc(footerLabel)} · ${esc(COMPANY.updated)}</div>
      <div>${esc(COMPANY.phone)} · ${esc(COMPANY.email)}</div>
      <div><strong>${esc(COMPANY.short)}</strong> · Building Supplies</div>
    </div>
  </section>`;
}

function metaFor(catKey, rows) {
  return (
    CATEGORY_META[catKey] || {
      slug: slugify(catKey),
      title: catKey,
      material: rows[0]?.Material || '',
      collection: String(catKey).toUpperCase(),
      tagline: `${catKey} from the All Pro catalog.`,
      overview: `${catKey} from the All Pro catalog.`,
      standards: [],
      construction: [],
      notes: '',
    }
  );
}

function isPlumbing(dept) {
  return dept === 'Plumbing';
}

async function main() {
  fs.mkdirSync(htmlDir, { recursive: true });
  fs.mkdirSync(pdfDir, { recursive: true });
  if (!fs.existsSync(csvPath)) {
    console.error('Missing products.csv at', csvPath);
    process.exit(1);
  }

  const products = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  const deptOrder = ['Plumbing', 'Windows', 'Flooring'];
  const byDept = new Map();
  for (const p of products) {
    const dept = (p.main_category || 'Other').trim() || 'Other';
    const cat = (p.sub_sub_category || p.Material || 'Other').trim() || 'Other';
    if (!byDept.has(dept)) byDept.set(dept, new Map());
    const cats = byDept.get(dept);
    if (!cats.has(cat)) cats.set(cat, []);
    cats.get(cat).push(p);
  }

  const generated = [];
  const deptCovers = [];
  const allCategoryMeta = [];

  for (const dept of [...deptOrder, ...[...byDept.keys()].filter((d) => !deptOrder.includes(d))]) {
    const cats = byDept.get(dept);
    if (!cats) continue;
    const dmeta = DEPARTMENT_META[dept] || {
      slug: `dept-${slugify(dept)}`,
      title: dept,
      subtitle: dept,
      feats: [
        { title: dept, sub: 'Catalog Section' },
        { title: 'Suggested Wholesale', sub: 'Call for Bulk Quotes' },
        { title: 'Trade Ready', sub: 'Spec Sheets' },
      ],
    };
    const catCards = [];
    const deptPhotos = [];
    for (const [catKey, rows] of [...cats.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const meta = metaFor(catKey, rows);
      const blocks = isPlumbing(dept) ? buildPlumbingBlocks(rows) : buildStyleBlocks(rows);
      const pageHtml = renderCategoryPages(meta, blocks, rows);
      const htmlName = `${meta.slug}-sell-sheet.html`;
      const pdfName = `${meta.slug}-sell-sheet.pdf`;
      const htmlPath = path.join(htmlDir, htmlName);
      fs.writeFileSync(htmlPath, wrapHtml(`${COMPANY.name} — ${meta.title}`, pageHtml));
      const image = firstRealImage(rows);
      if (image && deptPhotos.length < 3) deptPhotos.push(image);
      const card = {
        title: meta.title,
        tagline: meta.tagline,
        familyCount: blocks.length,
        rowCount: rows.length,
        pdfName,
        image,
        slug: meta.slug,
        pageHtml,
      };
      catCards.push(card);
      generated.push({ meta, htmlPath, pdfName, dept, blocks, rows });
      allCategoryMeta.push({ ...card, dept });
      console.log(`HTML: ${htmlName} (${dept} / ${blocks.length} types, ${rows.length} rows, ${packBlocks(blocks).length} page(s))`);
    }

    const priceNote = isPlumbing(dept)
      ? 'Prices shown are suggested wholesale. Items without a list price show size only. Pipe is per foot except packaged coils / sticks, which are per each.'
      : 'Prices shown are suggested wholesale. Items without a list price show size and color only.';
    const coverOpts = {
      id: dmeta.slug,
      photos: deptPhotos.slice(0, 1),
      feats: dmeta.feats,
      subtitle: `${dmeta.title} · ${dmeta.subtitle}`,
      footerLabel: `${dmeta.title} Cover`,
      cards: catCards,
      priceNote,
    };
    const deptHtml = renderCover({ ...coverOpts, linked: false });
    const deptHtmlLinked = renderCover({ ...coverOpts, linked: true });
    const deptHtmlPath = path.join(htmlDir, `${dmeta.slug}-cover.html`);
    fs.writeFileSync(deptHtmlPath, wrapHtml(`${COMPANY.name} — ${dmeta.title}`, deptHtml));
    deptCovers.push({
      dmeta,
      htmlPath: deptHtmlPath,
      pdfName: `${dmeta.slug}-cover.pdf`,
      linkedHtml: deptHtmlLinked,
      catCards,
      photos: deptPhotos,
    });
  }

  const deptCards = deptCovers.map((d) => ({
    title: d.dmeta.title,
    tagline: d.dmeta.subtitle,
    familyCount: d.catCards.length,
    rowCount: d.catCards.reduce((n, c) => n + c.rowCount, 0),
    image: d.photos[0] || d.catCards[0]?.image,
    slug: d.dmeta.slug,
  }));
  const mainPhotos = deptCovers.map((d) => d.photos[0]).filter(Boolean);
  const indexOpts = {
    id: 'catalog-cover',
    photos: mainPhotos,
    feats: [
      { title: '3 Departments', sub: 'Plumbing · Windows · Flooring' },
      { title: 'Suggested Wholesale', sub: 'Call for Bulk Quotes' },
      { title: 'Trade Catalog', sub: 'Every Size & Color Listed' },
    ],
    subtitle: 'Product Catalog · Spec Sheets & Wholesale Pricing',
    footerLabel: 'Catalog Cover',
    cards: deptCards,
    priceNote:
      'Prices shown are suggested wholesale. Items without a list price show size and color only. Pipe is per foot except packaged coils / sticks, which are per each.',
  };
  const indexHtml = renderCover({ ...indexOpts, linked: false });
  const indexHtmlLinked = renderCover({ ...indexOpts, linked: true });
  const indexHtmlPath = path.join(htmlDir, '00-sell-sheet-index.html');
  fs.writeFileSync(indexHtmlPath, wrapHtml(`${COMPANY.name} — Catalog Cover`, indexHtml));

  const catalogBody =
    indexHtmlLinked + deptCovers.map((d) => d.linkedHtml + d.catCards.map((c) => c.pageHtml).join('\n')).join('\n');
  const catalogHtmlPath = path.join(htmlDir, 'allpro-product-catalog.html');
  fs.writeFileSync(catalogHtmlPath, wrapHtml(`${COMPANY.name} — Product Catalog`, catalogBody));

  const forbidden = /tommur|lesso|tomex|bluefin|alibaba|factory sku|factory code|4B200B/i;
  const htmlFiles = [indexHtmlPath, catalogHtmlPath, ...generated.map((g) => g.htmlPath), ...deptCovers.map((d) => d.htmlPath)];
  for (const hp of htmlFiles) {
    const text = fs.readFileSync(hp, 'utf8');
    if (forbidden.test(text)) throw new Error(`Factory / internal term leaked into ${path.basename(hp)}`);
  }

  const md = [
    '# All Pro Building Supplies — Category Sell Sheets',
    '',
    'Suggested wholesale from `assets/products.csv`. Rebuild: `npm run sell-sheets` from `brochure/`.',
    '',
    'Customer-facing PDFs never include factory, supplier, or internal sourcing names.',
    '',
    'Layout: plumbing is one photo + wrapping size/price row per fitting. Blinds and shades are a size/price table plus a color list (price is by size). Tiles, mats, and planks are a color photo grid with size and price once. Mixed size×color prices use a Size | Color | Price table. SKUs without photos are text only — the logo is never used as product art. Blank or $0 prices are omitted.',
    '',
    '## Full catalog',
    '',
    '- `brochure/sell-sheets/pdf/allpro-product-catalog.pdf`',
    '',
    '## Department covers',
    '',
    ...deptCovers.map((d) => `- \`brochure/sell-sheets/pdf/${d.pdfName}\``),
    '',
    '## Individual PDFs',
    '',
    '| Department | Category | PDF | Types | SKUs |',
    '|---|---|---|---:|---:|',
    ...allCategoryMeta.map(
      (c) => `| ${c.dept} | ${c.title} | \`brochure/sell-sheets/pdf/${c.pdfName}\` | ${c.familyCount} | ${c.rowCount} |`
    ),
    '',
  ];
  fs.writeFileSync(path.join(outDir, 'README.md'), md.join('\n'));

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
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 300000 });
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
  for (const d of deptCovers) await htmlToPdf(d.htmlPath, path.join(pdfDir, d.pdfName));
  for (const g of generated) await htmlToPdf(g.htmlPath, path.join(pdfDir, g.pdfName));
  await htmlToPdf(catalogHtmlPath, path.join(pdfDir, 'allpro-product-catalog.pdf'));
  await browser.close();
  console.log(`\nDone. ${generated.length} category sheets + ${deptCovers.length} department covers + catalog → ${pdfDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Generates All-Pro-Building-Supplies-Brochure.pdf from brochure.html
 * Run: node generate-pdf.mjs   (from brochure/ folder, after npm install)
 */
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'brochure.html');
const outPath = path.join(__dirname, 'All-Pro-Building-Supplies-Brochure.pdf');

if (!fs.existsSync(htmlPath)) {
  console.error('Missing brochure.html');
  process.exit(1);
}

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, {
  waitUntil: 'networkidle0',
});
await page.pdf({
  path: outPath,
  format: 'Letter',
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});
await browser.close();
console.log('Created:', outPath);

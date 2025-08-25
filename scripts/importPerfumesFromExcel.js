import fs from 'fs';
import path from 'path';
import 'dotenv/config';
// Use ESM build and set fs for Node
import * as XLSX from 'xlsx/xlsx.mjs';
XLSX.set_fs(fs);

function parseArgs(argv) {
  const args = { file: null, dryRun: false, batchSize: 200 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file' && argv[i + 1]) { args.file = argv[++i]; continue; }
    if (a === '--dry-run') { args.dryRun = true; continue; }
    if (a === '--batch' && argv[i + 1]) { args.batchSize = Math.max(10, parseInt(argv[++i], 10) || 200); continue; }
  }
  return args;
}

function getLatestSpreadsheetPath(baseDir) {
  const candidates = [];
  const exts = new Set(['.xlsx', '.xls', '.csv']);
  for (const name of fs.readdirSync(baseDir)) {
    const p = path.join(baseDir, name);
    const stat = fs.statSync(p);
    if (!stat.isFile()) continue;
    const ext = path.extname(name).toLowerCase();
    if (!exts.has(ext)) continue;
    candidates.push({ path: p, mtimeMs: stat.mtimeMs, ext });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  // Prefer Excel over CSV when modified at same time
  const bestTime = candidates[0].mtimeMs;
  const sameTime = candidates.filter(c => c.mtimeMs === bestTime);
  const preferred = sameTime.find(c => c.ext === '.xlsx') || sameTime.find(c => c.ext === '.xls') || candidates[0];
  return preferred.path;
}

function readRowsFromFile(filePath) {
  const wb = XLSX.readFile(filePath, { cellDates: false });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  // Return as array of objects, with raw values
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  return rows;
}

function toNumberOrNull(value) {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const str = String(value).replace(/\u00A0/g, ' ').trim();
  // Extract first number with optional decimal
  const match = str.replace(/[,\sZAR$€£R]/gi, '').match(/^-?\d*(?:\.\d+)?/);
  if (!match) return null;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) ? n : null;
}

function inferBrandFromName(name) {
  if (!name) return null;
  const raw = String(name).trim();
  // Many Amazon titles start with Brand then product series
  // Take first token before a dash or comma as a heuristic, but allow two words if second is in ALL CAPS (e.g., YVES SAINT → Yves Saint)
  const stopIdx = Math.min(
    ...[" - ", "–", "—", ",", ":", " for ", " by "]
      .map(s => raw.toLowerCase().indexOf(s.trim().toLowerCase()))
      .filter(i => i > 0)
      .concat([raw.length])
  );
  const head = raw.slice(0, stopIdx).trim();
  const parts = head.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  // If first two words are capitalized, join them (e.g., "Tom Ford")
  const isCap = (w) => /^[A-Z][a-zA-Z\-'.]*$/.test(w);
  if (parts.length >= 2 && isCap(parts[0]) && isCap(parts[1])) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0];
}

function mapRowToPerfume(row) {
  // Flexible header mapping
  const get = (...keys) => {
    for (const k of keys) {
      if (k in row && row[k] != null && row[k] !== '') return row[k];
      const found = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.trim().toLowerCase());
      if (found && row[found] != null && row[found] !== '') return row[found];
    }
    return null;
  };

  const name = get('name', 'product-name', 'title', 'Product Name');
  const brandRaw = get('brand', 'Brand');
  const brand = brandRaw || inferBrandFromName(name);
  const amazon_url = get('amazon_url', 'amazon-product-link', 'product link', 'URL', 'Link');
  const image_url = get('image_url', 'product-image-source', 'image', 'image src', 'img', 's-image src (2)');
  const price = toNumberOrNull(get('price', 'Price', 'a-offscreen', 'a-price', 'a-price-whole'));
  const amazon_asin = get('asin', 'ASIN', 'amazon_asin');

  if (!name || !brand) return null; // Required by schema

  /** @type {import('../src/integrations/supabase/types').Database['public']['Tables']['perfumes']['Insert']} */
  const payload = {
    name: String(name).trim(),
    brand: String(brand).trim(),
    amazon_url: amazon_url ? String(amazon_url).trim() : null,
    amazon_asin: amazon_asin ? String(amazon_asin).trim() : null,
    image_url: image_url ? String(image_url).trim() : null,
    price: price ?? null,
    currency: 'ZAR',
    is_available: true,
    last_scraped_at: new Date().toISOString(),
  };
  return payload;
}

async function deleteAllPerfumes(supabaseAdmin) {
  // Delete all rows; PostgREST requires a filter, so delete where id IS NOT NULL
  const { error } = await supabaseAdmin
    .from('perfumes')
    .delete()
    .not('id', 'is', null);
  if (error) throw error;
}

async function insertPerfumesInBatches(supabaseAdmin, rows, batchSize) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error, count } = await supabaseAdmin
      .from('perfumes')
      .insert(batch, { count: 'exact' });
    if (error) throw error;
    inserted += count || batch.length;
  }
  return inserted;
}

async function main() {
  const { file, dryRun, batchSize } = parseArgs(process.argv);

  const baseDir = path.resolve(process.cwd(), 'amazon_web_scrapes');
  const filePath = file ? path.resolve(process.cwd(), file) : getLatestSpreadsheetPath(baseDir);
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('No spreadsheet found. Provide with --file or place one under amazon_web_scrapes/.');
    process.exit(1);
  }

  console.log(`Reading: ${filePath}`);
  const rawRows = readRowsFromFile(filePath);
  const mapped = rawRows.map(mapRowToPerfume).filter(Boolean);
  console.log(`Parsed rows: ${rawRows.length}, valid perfumes: ${mapped.length}`);

  if (dryRun) {
    const sample = mapped.slice(0, 3);
    console.log('Sample mapped rows (first 3):');
    console.log(JSON.stringify(sample, null, 2));
    console.log('Dry-run complete. No changes applied.');
    return;
  }

  // Import admin client only when needed to avoid requiring env vars for dry-run
  const { supabaseAdmin } = await import('./supabaseClient.js');

  console.log('Deleting existing perfumes...');
  await deleteAllPerfumes(supabaseAdmin);
  console.log('Inserting new perfumes in batches...');
  const inserted = await insertPerfumesInBatches(supabaseAdmin, mapped, batchSize);
  console.log(`Done. Inserted ${inserted} perfumes.`);
}

main().catch((e) => { console.error(e); process.exit(1); });


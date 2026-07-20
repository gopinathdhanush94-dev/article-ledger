/**
 * Re-imports an edited CSV export back into Supabase, UPDATING existing rows
 * by matching on their "id" column (does not create new rows or duplicates).
 *
 * Workflow:
 *   1. In Supabase: Table Editor -> products -> (top-right ⋯ menu) -> Export data -> CSV
 *   2. Open that CSV in Excel, fix spellings/colors/etc. DO NOT touch or delete the "id" column
 *      (that's how this script knows which row to update). DO NOT touch "image_url" unless
 *      you're intentionally replacing an image.
 *   3. Save it as CSV, and put the file at: scripts/data/products-edited.csv
 *      (or pass a different path as an argument, see below)
 *   4. Run:  npm run reimport
 *      or:   npm run reimport -- path/to/your-file.csv
 *
 * Requires the same .env setup as scripts/migrate.mjs (VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
 */
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('\nMissing env vars. Make sure .env has VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n');
  process.exit(1);
}

const csvPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, 'data', 'products-edited.csv');

if (!fs.existsSync(csvPath)) {
  console.error(`\nCan't find file: ${csvPath}`);
  console.error('Export the products table as CSV from Supabase, edit it, and save it there');
  console.error('(or pass the path as an argument: npm run reimport -- path/to/file.csv)\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ---- read the CSV ----
const fileBuffer = fs.readFileSync(csvPath);
const workbook = XLSX.read(fileBuffer, { type: 'buffer', raw: true });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

console.log(`Loaded ${rows.length} rows from ${csvPath}`);

// Columns that are safe to write back (matches the DB schema exactly).
// "id" is used only to find the row, not written.
const NUMERIC_FIELDS = [
  'mrp', 'sp', 'master_qty', 'inner_qty',
  'sku_l', 'sku_w', 'sku_h', 'sku_nw', 'sku_gw',
  'master_l', 'master_w', 'master_h', 'master_nw', 'master_gw',
  'inner_l', 'inner_w', 'inner_h', 'inner_nw', 'inner_gw',
];
const TEXT_FIELDS = [
  'month', 'category', 'brand', 'model', 'description', 'hsn',
  'article_no', 'marketed_by', 'image_url',
  'sku_dim_unit', 'sku_wt_unit', 'master_dim_unit', 'master_wt_unit', 'inner_dim_unit', 'inner_wt_unit',
];

function clean(val) {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') {
    const t = val.trim();
    return t === '' ? null : t;
  }
  return val;
}

// EAN must satisfy the database's ean_13_digits check (exactly 13 digits, or null).
// Anything else Excel may have left behind (stray spaces, partial values, text) is
// normalized to null rather than sent through and rejected by the database.
function normalizeEan(val) {
  const c = clean(val);
  if (c === null) return null;
  const digits = String(c).replace(/\D/g, '');
  return /^\d{13}$/.test(digits) ? digits : null;
}

async function main() {
  let updated = 0, skippedNoId = 0, failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const id = r.id;
    if (!id) { skippedNoId++; continue; }

    const patch = {};
    for (const f of TEXT_FIELDS) if (f in r) patch[f] = clean(r[f]) === null ? null : String(clean(r[f]));
    if ('ean' in r) patch.ean = normalizeEan(r.ean);
    for (const f of NUMERIC_FIELDS) {
      if (f in r) {
        const v = clean(r[f]);
        patch[f] = v === null ? null : Number(v);
      }
    }

    const { error } = await supabase.from('products').update(patch).eq('id', id);
    if (error) {
      console.warn(`  ! update failed for id ${id} ("${r.description || ''}"): ${error.message}`);
      failed++;
    } else {
      updated++;
    }

    if ((i + 1) % 50 === 0) console.log(`  ...${i + 1}/${rows.length} processed`);
  }

  console.log('\n---- Re-import complete ----');
  console.log(`Updated:            ${updated}`);
  console.log(`Skipped (no id):    ${skippedNoId}`);
  console.log(`Failed:             ${failed}`);
}

main().catch(err => {
  console.error('Re-import failed:', err);
  process.exit(1);
});

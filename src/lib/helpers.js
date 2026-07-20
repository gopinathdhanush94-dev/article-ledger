export const MONTH_ORDER = ['DEC-25','JAN-26','FEB-26','MAR-26','APR-26','MAY-26','JUN-26','JUL-26'];
export const MONTH_LABEL = {
  'DEC-25':'Dec 2025','JAN-26':'Jan 2026','FEB-26':'Feb 2026','MAR-26':'Mar 2026',
  'APR-26':'Apr 2026','MAY-26':'May 2026','JUN-26':'Jun 2026','JUL-26':'Jul 2026'
};

export function fmtINR(n) {
  return n == null ? '—' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function discountPct(mrp, sp) {
  if (!mrp || sp == null) return null;
  const pct = ((mrp - sp) / mrp) * 100;
  if (!isFinite(pct) || pct <= 0) return null;
  return Math.round(pct);
}

export function isValidEan(v) {
  return /^\d{13}$/.test(v);
}

const CATEGORY_ICON_RULES = [
  [/bag|backpack|trolley|sling|beackpack/, '🎒'],
  [/bottle|flask/, '🍶'],
  [/mug|cup|glass/, '☕'],
  [/kitchen|cutter|slicer|grater|spatula/, '🍳'],
  [/clock|watch/, '⏰'],
  [/lock/, '🔒'],
  [/basket/, '🧺'],
  [/towel/, '🧻'],
  [/blanket/, '🛏️'],
  [/mat/, '🟫'],
  [/umbrella/, '☂️'],
  [/cap|hat/, '🧢'],
  [/mirror/, '🪞'],
  [/hook/, '🪝'],
  [/mop|broom|clean/, '🧹'],
  [/led|light|lamp/, '💡'],
  [/stationary|stationery|pen|pencil/, '✏️'],
  [/beauty|cosmetic/, '💄'],
  [/dispenser/, '🧴'],
  [/stapler|clip/, '📎'],
  [/bin/, '🗑️'],
];
export function categoryIcon(name) {
  const n = (name || '').toLowerCase();
  for (const [re, icon] of CATEGORY_ICON_RULES) if (re.test(n)) return icon;
  return '📦';
}

export function uniqueSorted(rows, key) {
  return [...new Set(rows.map(r => r[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

const GARMENT_TYPE_ICON_RULES = [
  [/jacket|puffer|coat/, '🧥'],
  [/track\s*pant|jogger|trouser|pant/, '👖'],
  [/short/, '🩳'],
  [/sweat\s*shirt|hoodie/, '👕'],
  [/t[-\s]?shirt|tee|top/, '👕'],
  [/dress|frock/, '👗'],
  [/skirt/, '👗'],
  [/velour|thermal|inner/, '🧦'],
  [/night\s*wear|nighty|pajama|pyjama/, '🌙'],
  [/set|combo/, '🧺'],
  [/fleece|sweater|pullover/, '🧶'],
];
export function garmentTypeIcon(name) {
  const n = (name || '').toLowerCase();
  for (const [re, icon] of GARMENT_TYPE_ICON_RULES) if (re.test(n)) return icon;
  return '👕';
}

export function monthOptions(rows) {
  const extra = uniqueSorted(rows, 'month').filter(m => !MONTH_ORDER.includes(m));
  return [...new Set([...MONTH_ORDER, ...extra])];
}

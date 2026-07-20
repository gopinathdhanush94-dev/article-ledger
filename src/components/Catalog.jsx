import React, { useMemo, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { fmtINR, discountPct, MONTH_LABEL, uniqueSorted, monthOptions } from '../lib/helpers.js';
import ProductModal from './ProductModal.jsx';

export default function Catalog({ products, initialFilters, onEdit, onDelete }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [brand, setBrand] = useState('');
  const [month, setMonth] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (initialFilters) {
      setCat(initialFilters.category || '');
      setBrand(initialFilters.brand || '');
      setMonth(initialFilters.month || '');
      setQ('');
    }
  }, [initialFilters]);

  const categories = uniqueSorted(products, 'category');
  const brands = uniqueSorted(products, 'brand');
  const months = monthOptions(products);

  const brandsForCat = cat ? uniqueSorted(products.filter(p => p.category === cat), 'brand') : brands;
  const catsForBrand = brand ? uniqueSorted(products.filter(p => p.brand === brand), 'category') : categories;

  useEffect(() => { if (cat && !catsForBrand.includes(cat)) setCat(''); }, [brand]); // eslint-disable-line
  useEffect(() => { if (brand && !brandsForCat.includes(brand)) setBrand(''); }, [cat]); // eslint-disable-line

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return products.filter(p => {
      if (cat && p.category !== cat) return false;
      if (brand && p.brand !== brand) return false;
      if (month && p.month !== month) return false;
      if (query) {
        const hay = [p.ean, p.brand, p.category, p.description, p.model, p.article_no, p.hsn]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [products, q, cat, brand, month]);

  function resetFilters() {
    setQ(''); setCat(''); setBrand(''); setMonth('');
  }

  function downloadXlsx() {
    const headers = ['ID', 'Month', 'Category', 'Brand', 'Model', 'Description', 'EAN', 'MRP', 'SP', 'Discount %', 'HSN', 'Article No', 'Marketed By',
      'Master Qty', 'Inner Qty',
      'SKU L', 'SKU W', 'SKU H', 'SKU Dim Unit', 'SKU Net Wt', 'SKU Gross Wt', 'SKU Weight Unit',
      'Master L', 'Master W', 'Master H', 'Master Dim Unit', 'Master Net Wt', 'Master Gross Wt', 'Master Weight Unit',
      'Inner L', 'Inner W', 'Inner H', 'Inner Dim Unit', 'Inner Net Wt', 'Inner Gross Wt', 'Inner Weight Unit'];
    const aoa = [headers];
    filtered.forEach(p => {
      const off = discountPct(p.mrp, p.sp);
      aoa.push([
        p.id, MONTH_LABEL[p.month] || p.month, p.category, p.brand, p.model, p.description,
        p.ean, p.mrp ?? '', p.sp ?? '', off ?? '', p.hsn, p.article_no, p.marketed_by,
        p.master_qty ?? '', p.inner_qty ?? '',
        p.sku_l ?? '', p.sku_w ?? '', p.sku_h ?? '', p.sku_dim_unit ?? '', p.sku_nw ?? '', p.sku_gw ?? '', p.sku_wt_unit ?? '',
        p.master_l ?? '', p.master_w ?? '', p.master_h ?? '', p.master_dim_unit ?? '', p.master_nw ?? '', p.master_gw ?? '', p.master_wt_unit ?? '',
        p.inner_l ?? '', p.inner_w ?? '', p.inner_h ?? '', p.inner_dim_unit ?? '', p.inner_nw ?? '', p.inner_gw ?? '', p.inner_wt_unit ?? '',
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = headers.map(() => ({ wch: 14 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Articles');
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `article-ledger-filtered-${stamp}.xlsx`);
  }

  return (
    <>
      <div className="controls">
        <div className="controls-row">
          <div className="search-box">
            <input placeholder="Search by EAN, brand, category, model or description…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All categories</option>
            {catsForBrand.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">All brands</option>
            {brandsForCat.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">All months</option>
            {months.filter(m => products.some(p => p.month === m)).map(m => <option key={m} value={m}>{MONTH_LABEL[m] || m}</option>)}
          </select>
          <button className="btn btn-rust" onClick={resetFilters}>Reset filters</button>
          <button className="btn btn-teal" onClick={downloadXlsx}>⬇ Download filtered (.xlsx)</button>
        </div>
        <div className="result-count"><b>{filtered.length}</b> articles found</div>
      </div>

      <main>
        {filtered.length === 0 ? (
          <div className="empty">
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, color: 'var(--ink)', fontWeight: 600, marginBottom: 8 }}>
              No matching articles
            </div>
            Try a different EAN, brand, or category — or clear filters.
          </div>
        ) : (
          <div className="grid">
            {filtered.map(p => {
              const off = discountPct(p.mrp, p.sp);
              return (
                <article key={p.id} className="card" onClick={() => setSelected(p)}>
                  {p.custom && <div className="custom-flag">Added</div>}
                  <div className="card-img">
                    {p.image_url ? <img src={p.image_url} alt={p.description} loading="lazy" /> : <div className="no-img">NO IMAGE<br />ON FILE</div>}
                  </div>
                  <div className="card-body">
                    <span className="cat-tag">{p.category}</span>
                    <h3 className="card-title">{p.description || p.model || 'Unnamed article'}</h3>
                    <div className="card-brand">{p.brand}{p.model ? ` · ${p.model}` : ''}</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: 'var(--ink-soft)' }}>{p.ean || 'EAN N/A'}</div>
                    <div className="price-row">
                      <span className="sp">{fmtINR(p.sp)}</span>
                      {p.mrp ? <span className="mrp">{fmtINR(p.mrp)}</span> : null}
                      {off ? <span className="off-badge">{off}% OFF</span> : null}
                    </div>
                    <div className="meta-line"><span>HSN {p.hsn || '—'}</span><span>{MONTH_LABEL[p.month] || p.month || '—'}</span></div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {selected && (
        <ProductModal
          product={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { const p = selected; setSelected(null); onEdit(p); }}
          onDelete={() => { const p = selected; setSelected(null); onDelete(p); }}
        />
      )}
    </>
  );
}

import React, { useMemo, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { fmtINR, discountPct, formatMonthLabel, normalizeMonthValue, extractYear, yearOptions, uniqueSorted, monthOptions } from '../lib/helpers.js';
import ProductModal from './ProductModal.jsx';
import { ResetIcon, DownloadIcon } from './Icons.jsx';
import { useHideOnScroll } from '../lib/useHideOnScroll.js';

export default function Catalog({ products, initialFilters, onEdit, onDelete, isAuthed }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [brand, setBrand] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [selected, setSelected] = useState(null);
  const [autoOpenPending, setAutoOpenPending] = useState(false);
  const controlsHidden = useHideOnScroll();

  useEffect(() => {
    if (initialFilters) {
      setCat(initialFilters.category || '');
      setBrand(initialFilters.brand || '');
      setMonth(initialFilters.month || '');
      setYear(initialFilters.year || '');
      setQ(initialFilters.search || '');
      setAutoOpenPending(!!initialFilters.autoOpen);
    }
  }, [initialFilters]);

  // Each filter's dropdown is calculated from the other active filters.
  // This keeps the choices mutually consistent instead of showing the full
  // database when a year/month/brand/category has already been selected.
  const rowsForFilter = (exclude) => products.filter(p => {
    if (exclude !== 'category' && cat && p.category !== cat) return false;
    if (exclude !== 'brand' && brand && p.brand !== brand) return false;
    if (exclude !== 'month' && month && normalizeMonthValue(p.month) !== month) return false;
    if (exclude !== 'year' && year && extractYear(p.month) !== year) return false;
    return true;
  });

  const categories = uniqueSorted(rowsForFilter('category'), 'category');
  const brands = uniqueSorted(rowsForFilter('brand'), 'brand');
  const months = monthOptions(rowsForFilter('month'));
  const years = yearOptions(rowsForFilter('year'));

  // If a newly selected filter makes another existing selection impossible,
  // clear only that now-invalid selection. The dropdowns then recalculate.
  useEffect(() => {
    if (cat && !categories.includes(cat)) setCat('');
  }, [cat, categories.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (brand && !brands.includes(brand)) setBrand('');
  }, [brand, brands.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (month && !months.includes(month)) setMonth('');
  }, [month, months.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (year && !years.includes(year)) setYear('');
  }, [year, years.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return products.filter(p => {
      if (cat && p.category !== cat) return false;
      if (brand && p.brand !== brand) return false;
      if (month && normalizeMonthValue(p.month) !== month) return false;
      if (year && extractYear(p.month) !== year) return false;
      if (query) {
        const hay = [p.ean, p.brand, p.category, p.description, p.model, p.article_no, p.hsn]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [products, q, cat, brand, month, year]);

  useEffect(() => {
    if (autoOpenPending && filtered.length >= 1) {
      setSelected(filtered[0]);
      setAutoOpenPending(false);
    }
  }, [autoOpenPending, filtered]);

  useEffect(() => {
    if (!selected) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setSelected(null);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const list = filtered;
        const idx = list.findIndex(p => p.id === selected.id);
        if (idx === -1) return;
        const nextIdx = e.key === 'ArrowLeft' ? idx - 1 : idx + 1;
        if (nextIdx >= 0 && nextIdx < list.length) {
          e.preventDefault();
          setSelected(list[nextIdx]);
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected, filtered]);

  function resetFilters() {
    setQ(''); setCat(''); setBrand(''); setMonth(''); setYear('');
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
        p.id, formatMonthLabel(p.month), p.category, p.brand, p.model, p.description,
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
      <div className={`controls${controlsHidden ? ' controls-hidden' : ''}`}>
        <div className="controls-row">
          <div className="search-box">
            <input placeholder="Search by EAN, brand, category, model or description…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">All brands</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">All months</option>
            {months.map(m => <option key={m} value={m}>{formatMonthLabel(m)}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">All years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="icon-btn-group">
            <button className="btn btn-rust icon-btn" onClick={resetFilters} title="Reset filters" aria-label="Reset filters"><ResetIcon /></button>
            <button className="btn btn-teal icon-btn" onClick={downloadXlsx} title="Download filtered (.xlsx)" aria-label="Download filtered (.xlsx)"><DownloadIcon /></button>
          </div>
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
                      {p.sp != null ? (
                        <>
                          <span className="sp">{fmtINR(p.sp)}</span>
                          {p.mrp ? <span className="mrp">{fmtINR(p.mrp)}</span> : null}
                          {off ? <span className="off-badge">{off}% OFF</span> : null}
                        </>
                      ) : (
                        p.mrp != null && <span className="sp">{fmtINR(p.mrp)}</span>
                      )}
                    </div>
                    <div className="meta-line"><span>HSN {p.hsn || '—'}</span><span>{formatMonthLabel(p.month)}</span></div>
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
          isAuthed={isAuthed}
          onClose={() => setSelected(null)}
          onEdit={() => { const p = selected; setSelected(null); onEdit(p); }}
          onDelete={() => { const p = selected; setSelected(null); onDelete(p); }}
          onPrev={(() => {
            const idx = filtered.findIndex(p => p.id === selected.id);
            return idx > 0 ? () => setSelected(filtered[idx - 1]) : null;
          })()}
          onNext={(() => {
            const idx = filtered.findIndex(p => p.id === selected.id);
            return idx !== -1 && idx < filtered.length - 1 ? () => setSelected(filtered[idx + 1]) : null;
          })()}
        />
      )}
    </>
  );
}

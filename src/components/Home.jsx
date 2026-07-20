import React, { useMemo, useState, useEffect, useRef } from 'react';
import { MONTH_ORDER, MONTH_LABEL, categoryIcon, garmentTypeIcon, uniqueSorted } from '../lib/helpers.js';

export default function Home({ products, garments, onGoToCatalog, onGoToGarments }) {
  const [catQuery, setCatQuery] = useState('');
  const [styleQuery, setStyleQuery] = useState('');
  const [animate, setAnimate] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimate(true), 30); return () => clearTimeout(t); }, [products, garments]);

  const categories = uniqueSorted(products, 'category');
  const brands = uniqueSorted(products, 'brand');

  const catCounts = useMemo(() => {
    const c = {};
    products.forEach(p => { c[p.category] = (c[p.category] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [products]);

  const filteredCats = catQuery
    ? catCounts.filter(([name]) => name.toLowerCase().includes(catQuery.trim().toLowerCase()))
    : catCounts;

  const monthCounts = useMemo(() => {
    const c = {};
    products.forEach(p => { const m = p.month || 'CUSTOM'; c[m] = (c[m] || 0) + 1; });
    return Object.keys(c)
      .sort((a, b) => {
        const ia = MONTH_ORDER.indexOf(a), ib = MONTH_ORDER.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      })
      .map(m => [m, c[m]]);
  }, [products]);
  const monthMax = monthCounts.length ? Math.max(...monthCounts.map(([, c]) => c)) : 1;

  const garmentBrands = uniqueSorted(garments || [], 'brand');
  const garmentStyles = uniqueSorted(garments || [], 'model_name');

  const garmentBrandCounts = useMemo(() => {
    const c = {};
    (garments || []).forEach(g => { c[g.brand] = (c[g.brand] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [garments]);
  const garmentBrandMax = garmentBrandCounts.length ? garmentBrandCounts[0][1] : 1;

  const garmentStyleCounts = useMemo(() => {
    const c = {};
    (garments || []).forEach(g => { c[g.model_name] = (c[g.model_name] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [garments]);
  const filteredStyles = styleQuery
    ? garmentStyleCounts.filter(([name]) => (name || '').toLowerCase().includes(styleQuery.trim().toLowerCase()))
    : garmentStyleCounts;

  return (
    <div className="home-wrap">
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, margin: 0 }}>Overview</h2>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
          Live snapshot of the article ledger.
        </div>
      </div>

      <div className="stat-cards">
        <div className="stat-card"><div className="num">{products.length}</div><div className="lbl">Total Products</div></div>
        <div className="stat-card teal"><div className="num">{categories.length}</div><div className="lbl">Categories</div></div>
        <div className="stat-card"><div className="num">{brands.length}</div><div className="lbl">Brands</div></div>
      </div>

      <div className="panel">
        <h3>Categories <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: 'var(--ink-soft)', fontWeight: 500 }}>{catCounts.length} categories</span></h3>
        <div className="panel-hint">Search or click a category to view its articles</div>
        <div className="cat-search-box">
          <input placeholder="Search categories…" value={catQuery} onChange={(e) => setCatQuery(e.target.value)} />
        </div>
        {filteredCats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'var(--ink-soft)' }}>
            No categories match your search.
          </div>
        ) : (
          <div className="cat-tile-grid">
            {filteredCats.map(([name, count]) => (
              <div key={name} className="cat-tile" onClick={() => onGoToCatalog({ category: name })}>
                <div className="icon">{categoryIcon(name)}</div>
                <div className="name" title={name}>{name}</div>
                <div className="count">{count}</div>
                <div className="count-lbl">articles</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Articles by Month <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: 'var(--ink-soft)', fontWeight: 500 }}>{monthCounts.length} months</span></h3>
        <div className="panel-hint">Click a month to view its articles</div>
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {monthCounts.map(([m, count], i) => (
            <div key={m} className="bar-row" onClick={() => onGoToCatalog({ month: m })}>
              <div className="bar-rank">{i + 1}</div>
              <div className="bar-label" title={MONTH_LABEL[m] || m}>{MONTH_LABEL[m] || m}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: animate ? `${(count / monthMax * 100).toFixed(0)}%` : '0%' }} />
              </div>
              <div className="bar-num">{count}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ margin: '36px 0 22px' }}>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, margin: 0 }}>Garments</h2>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
          Separate dataset from the article catalog above.
        </div>
      </div>

      <div className="stat-cards">
        <div className="stat-card"><div className="num">{(garments || []).length}</div><div className="lbl">Total Garments</div></div>
        <div className="stat-card teal"><div className="num">{garmentStyles.length}</div><div className="lbl">Styles</div></div>
        <div className="stat-card"><div className="num">{garmentBrands.length}</div><div className="lbl">Brands</div></div>
      </div>

      <div className="panel">
        <h3>Garment Styles <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: 'var(--ink-soft)', fontWeight: 500 }}>{garmentStyleCounts.length} styles</span></h3>
        <div className="panel-hint">Search or click a style to view its garments</div>
        <div className="cat-search-box">
          <input placeholder="Search styles…" value={styleQuery} onChange={(e) => setStyleQuery(e.target.value)} />
        </div>
        {filteredStyles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'var(--ink-soft)' }}>
            {garmentStyleCounts.length === 0 ? 'No garment data yet.' : 'No styles match your search.'}
          </div>
        ) : (
          <div className="cat-tile-grid">
            {filteredStyles.map(([name, count]) => (
              <div key={name} className="cat-tile" onClick={() => onGoToGarments({ modelName: name })}>
                <div className="icon">{garmentTypeIcon(name)}</div>
                <div className="name" title={name}>{name || 'Unspecified'}</div>
                <div className="count">{count}</div>
                <div className="count-lbl">garments</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Garments by Brand <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: 'var(--ink-soft)', fontWeight: 500 }}>{garmentBrandCounts.length} brands</span></h3>
        <div className="panel-hint">Click a brand to view its garments</div>
        {garmentBrandCounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'var(--ink-soft)' }}>
            No garment data yet.
          </div>
        ) : (
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {garmentBrandCounts.map(([b, count], i) => (
              <div key={b} className="bar-row" onClick={() => onGoToGarments({ brand: b })}>
                <div className="bar-rank">{i + 1}</div>
                <div className="bar-label" title={b}>{b}</div>
                <div className="bar-track">
                  <div className="bar-fill teal" style={{ width: animate ? `${(count / garmentBrandMax * 100).toFixed(0)}%` : '0%' }} />
                </div>
                <div className="bar-num">{count}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { formatMonthLabel, normalizeMonthValue, monthSortKey, categoryIcon, garmentTypeIcon, uniqueSorted } from '../lib/helpers.js';

export default function Home({ products, garments, onGoToCatalog, onGoToGarments }) {
  const [catQuery, setCatQuery] = useState('');
  const [styleQuery, setStyleQuery] = useState('');
  const [productsView, setProductsView] = useState('categories'); // 'categories' | 'products' | 'brands'
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [brandQuery, setBrandQuery] = useState('');
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

  const brandCounts = useMemo(() => {
    const c = {};
    products.forEach(p => { c[p.brand] = (c[p.brand] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [products]);

  const filteredBrands = brandQuery
    ? brandCounts.filter(([name]) => (name || '').toLowerCase().includes(brandQuery.trim().toLowerCase()))
    : brandCounts;

  const filteredAllProducts = useMemo(() => {
    const q = productSearchQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 100);
    return products.filter(p => {
      const hay = [p.description, p.brand, p.category, p.ean, p.model, p.article_no, p.hsn].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    }).slice(0, 200);
  }, [products, productSearchQuery]);

  const monthCounts = useMemo(() => {
    const c = {};
    products.forEach(p => { const m = normalizeMonthValue(p.month) || 'CUSTOM'; c[m] = (c[m] || 0) + 1; });
    return Object.keys(c)
      .sort((a, b) => {
        const ka = monthSortKey(a), kb = monthSortKey(b);
        if (ka === Infinity && kb === Infinity) return a.localeCompare(b);
        return kb - ka; // descending — most recent month first
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
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
          Live snapshot of the article ledger.
        </div>
      </div>

      <div className="stat-cards">
        <div className={`stat-card stat-card-clickable${productsView === 'products' ? ' active' : ''}`} onClick={() => setProductsView('products')}>
          <div className="num">{products.length}</div><div className="lbl">Total Products</div>
        </div>
        <div className={`stat-card teal stat-card-clickable${productsView === 'categories' ? ' active' : ''}`} onClick={() => setProductsView('categories')}>
          <div className="num">{categories.length}</div><div className="lbl">Categories</div>
        </div>
        <div className={`stat-card stat-card-clickable${productsView === 'brands' ? ' active' : ''}`} onClick={() => setProductsView('brands')}>
          <div className="num">{brands.length}</div><div className="lbl">Brands</div>
        </div>
      </div>

      {productsView === 'categories' && (
        <div className="panel">
          <h3>Categories <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10.5, color: 'var(--ink-soft)', fontWeight: 500 }}>{catCounts.length} categories</span></h3>
          <div className="panel-hint">Search or click a category to view its articles</div>
          <div className="cat-search-box">
            <input placeholder="Search categories…" value={catQuery} onChange={(e) => setCatQuery(e.target.value)} />
          </div>
          {filteredCats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', fontFamily: "'Inter',sans-serif", fontSize: 12, color: 'var(--ink-soft)' }}>
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
      )}

      {productsView === 'brands' && (
        <div className="panel">
          <h3>Brands <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10.5, color: 'var(--ink-soft)', fontWeight: 500 }}>{brandCounts.length} brands</span></h3>
          <div className="panel-hint">Search or click a brand to view its articles</div>
          <div className="cat-search-box">
            <input placeholder="Search brands…" value={brandQuery} onChange={(e) => setBrandQuery(e.target.value)} />
          </div>
          {filteredBrands.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', fontFamily: "'Inter',sans-serif", fontSize: 12, color: 'var(--ink-soft)' }}>
              No brands match your search.
            </div>
          ) : (
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {filteredBrands.map(([b, count], i) => (
                <div key={b} className="bar-row" onClick={() => onGoToCatalog({ brand: b })}>
                  <div className="bar-rank">{i + 1}</div>
                  <div className="bar-label" title={b}>{b}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: animate ? `${(count / (brandCounts[0]?.[1] || 1) * 100).toFixed(0)}%` : '0%' }} />
                  </div>
                  <div className="bar-num">{count}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {productsView === 'products' && (
        <div className="panel">
          <h3>All Products <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10.5, color: 'var(--ink-soft)', fontWeight: 500 }}>{products.length} total</span></h3>
          <div className="panel-hint">Search, or click any product to open it in the catalog</div>
          <div className="cat-search-box">
            <input placeholder="Search by EAN, brand, category, model or description…" value={productSearchQuery} onChange={(e) => setProductSearchQuery(e.target.value)} />
          </div>
          {!productSearchQuery && (
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
              Showing the first 100 of {products.length} — type to search all of them.
            </div>
          )}
          {filteredAllProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', fontFamily: "'Inter',sans-serif", fontSize: 12, color: 'var(--ink-soft)' }}>
              No products match your search.
            </div>
          ) : (
            <div style={{ maxHeight: 460, overflowY: 'auto' }}>
              {filteredAllProducts.map(p => (
                <div
                  key={p.id}
                  className="bar-row"
                  style={{ justifyContent: 'space-between' }}
                  onClick={() => onGoToCatalog({ search: p.ean || p.description })}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.description || p.model || 'Unnamed article'}
                    </span>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: 'var(--text-soft)' }}>{p.brand} · {p.category}</span>
                  </div>
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--primary)', flex: 'none', marginLeft: 10 }}>
                    {p.sp != null ? `₹${p.sp}` : p.mrp != null ? `₹${p.mrp}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="panel">
        <h3>Articles by Month <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10.5, color: 'var(--ink-soft)', fontWeight: 500 }}>{monthCounts.length} months</span></h3>
        <div className="panel-hint">Click a month to view its articles</div>
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {monthCounts.map(([m, count], i) => (
            <div key={m} className="bar-row" onClick={() => onGoToCatalog({ month: m })}>
              <div className="bar-rank">{i + 1}</div>
              <div className="bar-label" title={formatMonthLabel(m)}>{formatMonthLabel(m)}</div>
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
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
          Separate dataset from the article catalog above.
        </div>
      </div>

      <div className="stat-cards">
        <div className="stat-card"><div className="num">{(garments || []).length}</div><div className="lbl">Total Garments</div></div>
        <div className="stat-card teal"><div className="num">{garmentStyles.length}</div><div className="lbl">Styles</div></div>
        <div className="stat-card"><div className="num">{garmentBrands.length}</div><div className="lbl">Brands</div></div>
      </div>

      <div className="panel">
        <h3>Garment Styles <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10.5, color: 'var(--ink-soft)', fontWeight: 500 }}>{garmentStyleCounts.length} styles</span></h3>
        <div className="panel-hint">Search or click a style to view its garments</div>
        <div className="cat-search-box">
          <input placeholder="Search styles…" value={styleQuery} onChange={(e) => setStyleQuery(e.target.value)} />
        </div>
        {filteredStyles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', fontFamily: "'Inter',sans-serif", fontSize: 12, color: 'var(--ink-soft)' }}>
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
        <h3>Garments by Brand <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10.5, color: 'var(--ink-soft)', fontWeight: 500 }}>{garmentBrandCounts.length} brands</span></h3>
        <div className="panel-hint">Click a brand to view its garments</div>
        {garmentBrandCounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', fontFamily: "'Inter',sans-serif", fontSize: 12, color: 'var(--ink-soft)' }}>
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

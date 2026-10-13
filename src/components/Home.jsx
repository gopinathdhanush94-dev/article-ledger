import React, { useMemo, useState, useEffect } from 'react';
import { formatMonthLabel, normalizeMonthValue, monthSortKey, categoryIcon, garmentTypeIcon } from '../lib/helpers.js';

function recentProducts(products) {
  return [...products]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 6);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

function countBy(rows, key) {
  return Object.entries((rows || []).reduce((acc, row) => {
    const value = row?.[key] || 'Unspecified';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
}

export default function Home({ products, garments, onGoToCatalog, onGoToGarments }) {
  const [greeting, setGreeting] = useState(getGreeting);
  const [catQuery, setCatQuery] = useState('');
  const [brandQuery, setBrandQuery] = useState('');

  useEffect(() => {
    const update = () => setGreeting(getGreeting());
    const timer = setInterval(update, 30000);
    window.addEventListener('focus', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', update);
    };
  }, []);

  const categories = useMemo(() => countBy(products, 'category'), [products]);
  const brands = useMemo(() => countBy(products, 'brand'), [products]);
  const months = useMemo(() => {
    const map = {};
    (products || []).forEach(p => {
      const month = normalizeMonthValue(p.month) || 'CUSTOM';
      map[month] = (map[month] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => monthSortKey(b[0]) - monthSortKey(a[0]));
  }, [products]);
  const recent = useMemo(() => recentProducts(products || []), [products]);
  const garmentStyles = useMemo(() => countBy(garments, 'model_name'), [garments]);
  const garmentBrands = useMemo(() => countBy(garments, 'brand'), [garments]);
  const filteredCats = categories.filter(([name]) => name.toLowerCase().includes(catQuery.toLowerCase()));
  const filteredBrands = brands.filter(([name]) => name.toLowerCase().includes(brandQuery.toLowerCase()));

  const totalArticles = products?.length || 0;
  const totalGarments = garments?.length || 0;

  return (
    <main className="ledger-home">
      <section className="ledger-hero">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="hero-dot" /> ARTICLE LEDGER</div>
          <h2>{greeting},<br /><span>manage your catalogue.</span></h2>
          <p>One clean workspace for your articles, garments, brands and product master.</p>
          <div className="hero-actions">
            <button className="hero-primary" onClick={() => onGoToCatalog({})}>Explore articles <span>→</span></button>
            <button className="hero-secondary" onClick={() => onGoToGarments({})}>Explore garments</button>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-card hero-card-main">
            <span className="hero-card-label">CATALOGUE</span>
            <strong>{totalArticles.toLocaleString()}</strong>
            <small>articles managed</small>
            <div className="hero-mini-bars"><i /><i /><i /><i /><i /></div>
          </div>
          <div className="hero-floating-card"><span>●</span> Live catalogue</div>
        </div>
      </section>

      <section className="ledger-stats">
        <button className="ledger-stat" onClick={() => onGoToCatalog({})}>
          <span className="stat-symbol">◈</span><span><b>{totalArticles.toLocaleString()}</b><small>General articles</small></span><em>→</em>
        </button>
        <button className="ledger-stat" onClick={() => onGoToGarments({})}>
          <span className="stat-symbol garment">◇</span><span><b>{totalGarments.toLocaleString()}</b><small>Garment rows</small></span><em>→</em>
        </button>
        <div className="ledger-stat"><span className="stat-symbol">⌘</span><span><b>{categories.length}</b><small>Categories</small></span></div>
        <div className="ledger-stat"><span className="stat-symbol">◎</span><span><b>{brands.length}</b><small>Brands</small></span></div>
      </section>

      <section className="ledger-section-head">
        <div><span className="section-kicker">PRODUCT MASTER</span><h3>Recently added</h3><p>The latest records in your catalogue.</p></div>
        <button className="section-link" onClick={() => onGoToCatalog({})}>View all <span>→</span></button>
      </section>

      <section className="recent-products">
        {recent.map((p, index) => (
          <button className="product-preview" key={p.id || index} onClick={() => onGoToCatalog({ search: p.ean || p.description, autoOpen: true })}>
            <div className="preview-image">
              {p.image_url ? <img src={p.image_url} alt="" loading="lazy" /> : <span>{categoryIcon(p.category)}</span>}
              <i>{String(index + 1).padStart(2, '0')}</i>
            </div>
            <div className="preview-info"><small>{p.brand || 'ARTICLE'}{p.category ? ` · ${p.category}` : ''}</small><strong>{p.description || p.model || 'Unnamed article'}</strong><span>{p.article_no || p.ean || 'No article number'}</span></div>
            <div className="preview-arrow">↗</div>
          </button>
        ))}
        {recent.length === 0 && <div className="ledger-empty">No articles available yet.</div>}
      </section>

      <section className="ledger-two-col">
        <div className="ledger-panel">
          <div className="panel-top"><div><span className="section-kicker">DISCOVER</span><h3>Shop by category</h3></div><span className="panel-count">{categories.length} total</span></div>
          <div className="ledger-search"><span>⌕</span><input value={catQuery} onChange={e => setCatQuery(e.target.value)} placeholder="Search category" /></div>
          <div className="category-grid">
            {filteredCats.slice(0, 12).map(([name, count]) => (
              <button key={name} onClick={() => onGoToCatalog({ category: name })}><span className="category-icon">{categoryIcon(name)}</span><span className="category-name">{name}</span><b>{count}</b></button>
            ))}
          </div>
        </div>

        <div className="ledger-panel">
          <div className="panel-top"><div><span className="section-kicker">COLLECTION</span><h3>Top brands</h3></div><span className="panel-count">{brands.length} total</span></div>
          <div className="ledger-search"><span>⌕</span><input value={brandQuery} onChange={e => setBrandQuery(e.target.value)} placeholder="Search brand" /></div>
          <div className="brand-list">
            {filteredBrands.slice(0, 8).map(([name, count], index) => (
              <button key={name} onClick={() => onGoToCatalog({ brand: name })}><span>{String(index + 1).padStart(2, '0')}</span><strong>{name}</strong><i><em style={{ width: `${Math.max(10, (count / Math.max(brands[0]?.[1] || 1, 1)) * 100)}%` }} /></i><b>{count}</b></button>
            ))}
          </div>
        </div>
      </section>

      <section className="ledger-month-strip">
        <div><span className="section-kicker">CATALOGUE ACTIVITY</span><h3>Articles by month</h3></div>
        <div className="month-items">
          {months.slice(0, 6).map(([month, count]) => <button key={month} onClick={() => onGoToCatalog({ month })}><strong>{count}</strong><span>{formatMonthLabel(month)}</span></button>)}
        </div>
      </section>

      <section className="garment-spotlight">
        <div className="garment-copy"><span className="section-kicker">GARMENT MASTER</span><h3>A dedicated space for your garment collection.</h3><p>Manage styles, sizes, colours, fabric and garment brands without mixing them with general articles.</p><button className="hero-primary" onClick={() => onGoToGarments({})}>Open garment master <span>→</span></button></div>
        <div className="garment-metrics"><div><b>{totalGarments}</b><span>Rows</span></div><div><b>{garmentStyles.length}</b><span>Styles</span></div><div><b>{garmentBrands.length}</b><span>Brands</span></div></div>
      </section>
    </main>
  );
}

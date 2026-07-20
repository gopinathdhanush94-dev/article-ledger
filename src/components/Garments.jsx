import React, { useMemo, useState } from 'react';
import { fmtINR, uniqueSorted } from '../lib/helpers.js';

function groupGarments(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = [r.source_file, r.excel_name, r.color, r.customer_model].join('|');
    if (!map.has(key)) {
      map.set(key, {
        key,
        excel_name: r.excel_name,
        model_name: r.model_name,
        model1: r.model1,
        brand: r.brand,
        description: r.description,
        color: r.color,
        customer_model: r.customer_model,
        origin: r.origin,
        moi: r.moi,
        mfd: r.mfd,
        master_ean: r.master_ean,
        master_article: r.master_article,
        image_url: r.image_url,
        mrp: r.mrp,
        rrp: r.rrp,
        source_file: r.source_file,
        sizes: [],
      });
    }
    const g = map.get(key);
    if (!g.image_url && r.image_url) g.image_url = r.image_url;
    g.sizes.push(r);
  }
  return [...map.values()];
}

export default function Garments({ garments }) {
  const [q, setQ] = useState('');
  const [brand, setBrand] = useState('');
  const [modelName, setModelName] = useState('');
  const [selected, setSelected] = useState(null);

  const brands = uniqueSorted(garments, 'brand');
  const modelNames = uniqueSorted(garments, 'model_name');

  const grouped = useMemo(() => groupGarments(garments), [garments]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return grouped.filter(g => {
      if (brand && g.brand !== brand) return false;
      if (modelName && g.model_name !== modelName) return false;
      if (query) {
        const hay = [
          g.excel_name, g.model_name, g.brand, g.color, g.customer_model, g.model1,
          ...g.sizes.map(s => s.ean), ...g.sizes.map(s => s.article),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [grouped, q, brand, modelName]);

  return (
    <>
      <div className="controls">
        <div className="controls-row">
          <div className="search-box">
            <input
              placeholder="Search by style, brand, color, EAN or article…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">All brands</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={modelName} onChange={(e) => setModelName(e.target.value)}>
            <option value="">All garment types</option>
            {modelNames.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="btn btn-rust" onClick={() => { setQ(''); setBrand(''); setModelName(''); }}>
            Reset filters
          </button>
        </div>
        <div className="result-count">
          <b>{filtered.length}</b> garment styles found <span style={{ opacity: 0.6 }}>({garments.length} total size/color SKUs)</span>
        </div>
      </div>

      <main>
        {filtered.length === 0 ? (
          <div className="empty">
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, color: 'var(--ink)', fontWeight: 600, marginBottom: 8 }}>
              No matching garments
            </div>
            Try a different brand, color, or search term.
          </div>
        ) : (
          <div className="grid">
            {filtered.map(g => {
              const sizeList = g.sizes.map(s => s.size).filter(Boolean).join(', ');
              return (
                <article key={g.key} className="card" onClick={() => setSelected(g)}>
                  <div className="card-img">
                    {g.image_url ? <img src={g.image_url} alt={g.excel_name} loading="lazy" /> : <div className="no-img">NO IMAGE<br />ON FILE</div>}
                  </div>
                  <div className="card-body">
                    <span className="cat-tag">{g.model_name || 'Garment'}</span>
                    <h3 className="card-title">{g.excel_name || g.customer_model || 'Unnamed style'}</h3>
                    <div className="card-brand">{g.brand}{g.color ? ` · ${g.color}` : ''}</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: 'var(--ink-soft)' }}>
                      {sizeList || 'No sizes listed'}
                    </div>
                    <div className="price-row">
                      <span className="sp">{fmtINR(g.rrp)}</span>
                      {g.mrp ? <span className="mrp">{fmtINR(g.mrp)}</span> : null}
                    </div>
                    <div className="meta-line"><span>{g.sizes.length} size{g.sizes.length === 1 ? '' : 's'}</span><span>{g.source_file}</span></div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {selected && <GarmentModal garment={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function GarmentModal({ garment: g, onClose }) {
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-grid">
          <div className="modal-img">
            {g.image_url ? <img src={g.image_url} alt={g.excel_name} /> : <div className="no-img">NO IMAGE ON FILE</div>}
          </div>
          <div className="modal-body">
            <span className="cat-tag">{g.model_name || 'Garment'}</span>
            <h2 className="modal-title">{g.excel_name || g.customer_model}</h2>
            <div className="modal-brand">{g.brand}{g.color ? ` · ${g.color}` : ''}</div>
            <table className="detail-table">
              <tbody>
                <tr><td>Customer Model</td><td>{g.customer_model || '—'}</td></tr>
                <tr><td>Internal Model</td><td>{g.model1 || '—'}</td></tr>
                <tr><td>Description</td><td>{g.description || '—'}</td></tr>
                <tr><td>Origin</td><td>{g.origin || '—'}</td></tr>
                <tr><td>MOI / MFD</td><td>{[g.moi, g.mfd].filter(Boolean).join(' / ') || '—'}</td></tr>
                <tr><td>Master EAN</td><td>{g.master_ean || '—'}</td></tr>
                <tr><td>Master Article</td><td>{g.master_article || '—'}</td></tr>
                <tr><td>Source</td><td>{g.source_file || '—'}</td></tr>
              </tbody>
            </table>

            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
              Size run ({g.sizes.length})
            </div>
            <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--rule)', borderRadius: 6 }}>
              <table className="detail-table" style={{ marginBottom: 0 }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--ink)' }}>
                    <td style={{ fontWeight: 700 }}>Size</td>
                    <td style={{ fontWeight: 700 }}>Set Qty</td>
                    <td style={{ fontWeight: 700 }}>EAN</td>
                    <td style={{ fontWeight: 700 }}>Article</td>
                    <td style={{ fontWeight: 700 }}>MRP</td>
                    <td style={{ fontWeight: 700 }}>RRP</td>
                  </tr>
                </thead>
                <tbody>
                  {g.sizes.map((s, i) => (
                    <tr key={i}>
                      <td>{s.size || '—'}</td>
                      <td>{s.ratio ?? '—'}</td>
                      <td>{s.ean || '—'}</td>
                      <td>{s.article || '—'}</td>
                      <td>{fmtINR(s.mrp)}</td>
                      <td>{fmtINR(s.rrp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

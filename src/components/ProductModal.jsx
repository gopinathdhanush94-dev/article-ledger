import React from 'react';
import { fmtINR, discountPct, MONTH_LABEL } from '../lib/helpers.js';

function dims(l, w, h, unit) {
  return (l || w || h) ? `${l ?? '—'} × ${w ?? '—'} × ${h ?? '—'} ${(unit || 'CM').toLowerCase()}` : '—';
}
function wt(nw, gw, unit) {
  if (nw == null && gw == null) return '—';
  const u = (unit || 'KG').toLowerCase();
  return `N.W ${nw ?? '—'} ${u} · G.W ${gw ?? '—'} ${u}`;
}

export default function ProductModal({ product: p, onClose, onEdit, onDelete }) {
  const off = discountPct(p.mrp, p.sp);
  const rows = [
    ['EAN Code', p.ean || '—'],
    ['Model', p.model || '—'],
    ['HSN Code', p.hsn || '—'],
    ['Article No.', p.article_no || '—'],
    ['Master Ctn Qty', p.master_qty ?? '—'],
    ['Inner Ctn Qty', p.inner_qty ?? '—'],
    ['Marketed By', p.marketed_by || '—'],
    ['PO Month', MONTH_LABEL[p.month] || p.month || '—'],
    ['SKU Dimensions', dims(p.sku_l, p.sku_w, p.sku_h, p.sku_dim_unit)],
    ['SKU Weight', wt(p.sku_nw, p.sku_gw, p.sku_wt_unit)],
    ['Master Ctn Dimensions', dims(p.master_l, p.master_w, p.master_h, p.master_dim_unit)],
    ['Master Ctn Weight', wt(p.master_nw, p.master_gw, p.master_wt_unit)],
    ['Inner Ctn Dimensions', dims(p.inner_l, p.inner_w, p.inner_h, p.inner_dim_unit)],
    ['Inner Ctn Weight', wt(p.inner_nw, p.inner_gw, p.inner_wt_unit)],
  ];

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-grid">
          <div className="modal-img">
            {p.image_url ? <img src={p.image_url} alt={p.description} /> : <div className="no-img">NO IMAGE ON FILE</div>}
          </div>
          <div className="modal-body">
            <span className="cat-tag">{p.category}</span>
            <h2 className="modal-title">{p.description || p.model}</h2>
            <div className="modal-brand">{p.brand}</div>
            <div className="price-row" style={{ marginBottom: 16 }}>
              <span className="sp" style={{ fontSize: 26 }}>{fmtINR(p.sp)}</span>
              {p.mrp ? <span className="mrp" style={{ fontSize: 14 }}>{fmtINR(p.mrp)}</span> : null}
              {off ? <span className="off-badge">{off}% OFF</span> : null}
            </div>
            <table className="detail-table">
              <tbody>
                {rows.map(([label, val]) => (
                  <tr key={label}><td>{label}</td><td>{val}</td></tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn" onClick={onEdit}>✎ Edit</button>
              <button className="btn btn-danger" onClick={onDelete}>🗑 Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

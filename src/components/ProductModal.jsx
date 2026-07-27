import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { fmtINR, discountPct, MONTH_LABEL } from '../lib/helpers.js';

function dims(l, w, h, unit) {
  return (l || w || h) ? `${l ?? '—'} × ${w ?? '—'} × ${h ?? '—'} ${(unit || 'CM').toLowerCase()}` : '—';
}
function wt(nw, gw, unit) {
  if (nw == null && gw == null) return '—';
  const u = (unit || 'KG').toLowerCase();
  return `N.W ${nw ?? '—'} ${u} · G.W ${gw ?? '—'} ${u}`;
}

const FIELD_LABELS = {
  mrp: 'MRP', sp: 'Selling Price',
  master_qty: 'Master Ctn Qty', inner_qty: 'Inner Ctn Qty',
  master_l: 'Master Length', master_w: 'Master Width', master_h: 'Master Height', master_dim_unit: 'Master Dim Unit',
  inner_l: 'Inner Length', inner_w: 'Inner Width', inner_h: 'Inner Height', inner_dim_unit: 'Inner Dim Unit',
};

function formatWhen(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ProductModal({ product: p, isAuthed, onClose, onEdit, onDelete, onPrev, onNext }) {
  const off = discountPct(p.mrp, p.sp);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!isAuthed || !p?.id) { setHistory([]); return; }
    let cancelled = false;
    setHistoryLoading(true);
    supabase
      .from('product_field_changes')
      .select('*')
      .eq('product_id', p.id)
      .order('changed_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        setHistory(error ? [] : (data || []));
        setHistoryLoading(false);
      });
    return () => { cancelled = true; };
  }, [p?.id, isAuthed]);

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
      {onPrev && <button className="modal-nav-btn prev" onClick={onPrev} title="Previous">‹</button>}
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
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              <button className="btn" onClick={onEdit}>✎ Edit</button>
              <button className="btn btn-danger" onClick={onDelete}>🗑 Delete</button>
            </div>

            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 13.5, color: 'var(--text)', marginBottom: 8 }}>
              Change History
            </div>
            {!isAuthed ? (
              <div style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>Sign in to view price, quantity, and dimension change history.</div>
            ) : historyLoading ? (
              <div style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>Loading history…</div>
            ) : history.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>No changes recorded yet — this is the original data.</div>
            ) : (
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                <table className="detail-table" style={{ marginBottom: 0, fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--border-strong)' }}>
                      <td style={{ fontWeight: 700 }}>Field</td>
                      <td style={{ fontWeight: 700 }}>Old → New</td>
                      <td style={{ fontWeight: 700 }}>By</td>
                      <td style={{ fontWeight: 700 }}>When</td>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id}>
                        <td>{FIELD_LABELS[h.field_name] || h.field_name}</td>
                        <td>{h.old_value ?? '—'} → {h.new_value ?? '—'}</td>
                        <td>{h.changed_by_email || 'Bulk import/script'}</td>
                        <td>{formatWhen(h.changed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      {onNext && <button className="modal-nav-btn next" onClick={onNext} title="Next">›</button>}
    </div>
  );
}

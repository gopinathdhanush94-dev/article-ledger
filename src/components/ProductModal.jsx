import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { fmtINR, discountPct, formatMonthLabel } from '../lib/helpers.js';

function dims(l,w,h,unit){ return (l||w||h) ? `${l??'—'} × ${w??'—'} × ${h??'—'} ${(unit||'CM').toLowerCase()}` : '—'; }
function wt(nw,gw,unit){ if(nw==null&&gw==null)return '—'; const u=(unit||'KG').toLowerCase(); return `N.W ${nw??'—'} ${u} · G.W ${gw??'—'} ${u}`; }
const FIELD_LABELS={ean:'EAN Code',hsn:'HSN Code',mrp:'MRP',sp:'Selling Price',master_qty:'Master Ctn Qty',inner_qty:'Inner Ctn Qty',master_l:'Master Length',master_w:'Master Width',master_h:'Master Height',master_dim_unit:'Master Dim Unit',inner_l:'Inner Length',inner_w:'Inner Width',inner_h:'Inner Height',inner_dim_unit:'Inner Dim Unit',description:'Description',brand:'Brand',category:'Category',model:'Model',article_no:'Article No.',marketed_by:'Marketed By',month:'Month',image_url:'Product Image'};
function formatWhen(iso){ if(!iso)return '—'; return new Date(iso).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }

function InfoCard({label,value,accent=false}){
  return <div className={`compact-info-card${accent?' calculated-card':''}`}>
    <small>{label}</small>
    <strong>{value??'—'}</strong>
  </div>;
}

function cartonMrp(qty,mrp){
  const q=Number(qty), m=Number(mrp);
  return Number.isFinite(q) && Number.isFinite(m) ? fmtINR(q*m) : '—';
}

export default function ProductModal({product:p,isAuthed,onClose,onEdit,onDelete,onPrev,onNext}){
  const off=discountPct(p.mrp,p.sp);
  const [history,setHistory]=useState([]);
  const [historyLoading,setHistoryLoading]=useState(false);
  const [historyError,setHistoryError]=useState(null);
  const [section,setSection]=useState('details');

  useEffect(()=>{
    if(!isAuthed||!p?.id){setHistory([]);return;}
    let cancelled=false;
    setHistoryLoading(true); setHistoryError(null);
    supabase.from('product_field_changes').select('*').eq('product_id',p.id).order('changed_at',{ascending:false}).then(({data,error})=>{
      if(cancelled)return;
      if(error){setHistoryError(error.message);setHistory([]);}else setHistory(data||[]);
      setHistoryLoading(false);
    });
    return()=>{cancelled=true;};
  },[p?.id,isAuthed]);

  // Four compact fields in one row. Description is intentionally omitted from the detail grid.
  const productInfo=[
    ['Model',p.model],
    ['Brand',p.brand],
    ['Category',p.category],
    ['Marketed By',p.marketed_by]
  ];

  // First packaging row is designed for the quantities and their calculated carton MRP.
  const logistics=[
    ['Master Ctn Qty',p.master_qty],
    ['Inner Ctn Qty',p.inner_qty],
    ['Master Ctn MRP',cartonMrp(p.master_qty,p.mrp)],
    ['Inner Ctn MRP',cartonMrp(p.inner_qty,p.mrp)],
    ['SKU Dimensions',dims(p.sku_l,p.sku_w,p.sku_h,p.sku_dim_unit)],
    ['SKU Weight',wt(p.sku_nw,p.sku_gw,p.sku_wt_unit)],
    ['Master Ctn Dimensions',dims(p.master_l,p.master_w,p.master_h,p.master_dim_unit)],
    ['Master Ctn Weight',wt(p.master_nw,p.master_gw,p.master_wt_unit)],
    ['Inner Ctn Dimensions',dims(p.inner_l,p.inner_w,p.inner_h,p.inner_dim_unit)],
    ['Inner Ctn Weight',wt(p.inner_nw,p.inner_gw,p.inner_wt_unit)]
  ];

  return <div className="overlay product-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="product-modal-shell">
      {onPrev&&<button className="modal-nav-btn prev" onClick={onPrev} title="Previous">‹</button>}
      <div className="modal product-modal product-modal-compact" onMouseDown={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="product-modal-layout">
          <div className="product-modal-image product-modal-image-compact">
            {p.image_url?<img src={p.image_url} alt={p.description||'Product'}/>:<div className="image-placeholder-large"><span>NO IMAGE</span><small>Upload an image from Edit</small></div>}
          </div>
          <div className="product-modal-main">
            <div className="product-modal-heading">
              <div>
                <span className="cat-tag">{p.category||'Uncategorized'}</span>
                <h2 className="modal-title">{p.description||p.model||'Unnamed article'}</h2>
                <div className="modal-brand">{p.brand||'No brand'} {p.model&&<span>· {p.model}</span>}</div>
              </div>
              <div className="product-price-block">
                <div className="price-row product-price">
                  {p.sp!=null?<><span className="sp">{fmtINR(p.sp)}</span>{p.mrp?<span className="mrp">{fmtINR(p.mrp)}</span>:null}</>:p.mrp!=null&&<span className="sp">{fmtINR(p.mrp)}</span>}
                  {off?<span className="off-badge">{off}% OFF</span>:null}
                </div>
              </div>
            </div>

            <div className="product-quick-grid compact-quick-grid">
              <InfoCard label="EAN" value={p.ean}/>
              <InfoCard label="Article No." value={p.article_no}/>
              <InfoCard label="PI Month" value={formatMonthLabel(p.month)}/>
              <InfoCard label="HSN" value={p.hsn}/>
            </div>

            <div className="compact-all-details">
              <div className="compact-section-label">PRODUCT INFORMATION</div>
              <div className="compact-info-grid product-info-grid">
                {productInfo.map(([label,val])=><InfoCard key={label} label={label} value={val}/>) }
              </div>

              <div className="compact-section-label">COMMERCIAL</div>
              <div className="compact-info-grid commercial-grid">
                <InfoCard label="MRP" value={p.mrp!=null?fmtINR(p.mrp):'—'}/>
                <InfoCard label="Selling Price" value={p.sp!=null?fmtINR(p.sp):'—'}/>
                <InfoCard label="Discount" value={off?`${off}%`:'—'}/>
              </div>

              <div className="compact-section-label">PACKAGING & LOGISTICS</div>
              <div className="compact-info-grid logistics-grid">
                {logistics.map(([label,val],i)=><InfoCard key={label} label={label} value={val} accent={i===2||i===3}/>) }
              </div>
            </div>

            <div className="product-modal-actions compact-actions">
              <button className="btn btn-primary" onClick={onEdit}>✎ Edit Article</button>
              <button className="btn btn-secondary compact-history-button" onClick={()=>setSection(section==='history'?'details':'history')}>🕒 History {history.length>0&&<span>({history.length})</span>}</button>
              <button className="btn btn-danger" onClick={onDelete}>🗑 Delete</button>
            </div>

            {section==='history' && <div className="history-popover compact-history-panel">
              {!isAuthed?<div className="inline-notice">Sign in to view the product change history.</div>:
              historyLoading?<div className="quality-empty">Loading history…</div>:
              historyError?<div className="inline-notice danger">Could not load history: {historyError}</div>:
              history.length===0?<div className="quality-empty">No changes recorded yet.</div>:
              <div className="history-timeline">{history.slice(0,8).map(h=><div className="history-entry" key={h.id}><div className="history-dot"/><div className="history-entry-body"><div className="history-entry-top"><strong>{FIELD_LABELS[h.field_name]||h.field_name}</strong><time>{formatWhen(h.changed_at)}</time></div><div className="history-change"><span>{h.old_value??'—'}</span><b>→</b><span>{h.new_value??'—'}</span></div>{h.reason&&<p>{h.reason}</p>}<small>{h.changed_by_email||'Bulk import/script'}</small></div></div>)}</div>}
            </div>}
          </div>
        </div>
      </div>
      {onNext&&<button className="modal-nav-btn next" onClick={onNext} title="Next">›</button>}
    </div>
  </div>;
}

import React, { useMemo, useState, useEffect } from 'react';
import { formatMonthLabel, normalizeMonthValue, monthSortKey, categoryIcon, garmentTypeIcon, uniqueSorted } from '../lib/helpers.js';

function getTimeOfDay(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

const GREETING = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
  night: 'Good night',
};

function recentProducts(products) {
  return [...products].sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 8);
}


export default function Home({ products, garments, onGoToCatalog, onGoToGarments }) {
  const [catQuery, setCatQuery] = useState('');
  const [brandQuery, setBrandQuery] = useState('');
  const [animate, setAnimate] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState(() => getTimeOfDay());
  useEffect(() => { const t = setTimeout(() => setAnimate(true), 30); return () => clearTimeout(t); }, [products, garments]);
  useEffect(() => {
    const tick = () => setTimeOfDay(getTimeOfDay());
    const id = setInterval(tick, 60 * 1000);
    tick();
    return () => clearInterval(id);
  }, []);

  const categories = uniqueSorted(products, 'category');
  const brands = uniqueSorted(products, 'brand');
  const catCounts = useMemo(() => Object.entries(products.reduce((a,p)=>(a[p.category]=(a[p.category]||0)+1,a),{})).sort((a,b)=>b[1]-a[1]), [products]);
  const brandCounts = useMemo(() => Object.entries(products.reduce((a,p)=>(a[p.brand]=(a[p.brand]||0)+1,a),{})).sort((a,b)=>b[1]-a[1]), [products]);
  const filteredCats = catQuery ? catCounts.filter(([n]) => (n||'').toLowerCase().includes(catQuery.toLowerCase())) : catCounts;
  const filteredBrands = brandQuery ? brandCounts.filter(([n]) => (n||'').toLowerCase().includes(brandQuery.toLowerCase())) : brandCounts;
  const monthCounts = useMemo(() => {
    const c={}; products.forEach(p=>{const m=normalizeMonthValue(p.month)||'CUSTOM'; c[m]=(c[m]||0)+1;});
    return Object.entries(c).sort((a,b)=>monthSortKey(b[0])-monthSortKey(a[0]));
  }, [products]);
  const recent = useMemo(()=>recentProducts(products),[products]);


  const garmentBrands = uniqueSorted(garments || [], 'brand');
  const garmentStyles = uniqueSorted(garments || [], 'model_name');
  const garmentStyleCounts = useMemo(()=>Object.entries((garments||[]).reduce((a,g)=>(a[g.model_name]=(a[g.model_name]||0)+1,a),{})).sort((a,b)=>b[1]-a[1]),[garments]);
  const garmentBrandCounts = useMemo(()=>Object.entries((garments||[]).reduce((a,g)=>(a[g.brand]=(a[g.brand]||0)+1,a),{})).sort((a,b)=>b[1]-a[1]),[garments]);

  return (
    <div className={`home-wrap home-${timeOfDay}`}>
      <section className="dashboard-hero glass-panel">
        <div>
          <span className="eyebrow">PRODUCT CONTROL CENTER</span>
          <h2>{GREETING[timeOfDay]}. Here’s your catalogue at a glance.</h2>
          <p>Search, maintain and publish your product master from one place.</p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={()=>onGoToCatalog({})}>Browse Articles</button>
          <button className="btn btn-teal" onClick={()=>onGoToGarments({})}>Browse Garments</button>
        </div>
      </section>

      <section className="dashboard-metrics">
        <button className="metric-card" onClick={()=>onGoToCatalog({})}><span className="metric-icon">◈</span><strong>{products.length}</strong><span>Total Articles</span></button>
        <button className="metric-card" onClick={()=>onGoToGarments({})}><span className="metric-icon teal">♢</span><strong>{garments.length}</strong><span>Garment Rows</span></button>
        <div className="metric-card"><span className="metric-icon">◌</span><strong>{categories.length}</strong><span>Categories</span></div>
        <div className="metric-card"><span className="metric-icon teal">◎</span><strong>{brands.length}</strong><span>Brands</span></div>
      </section>

      <section className="dashboard-grid two-equal">

        <div className="panel glass-panel recent-panel">
          <div className="panel-heading-row"><div><h3>Recently Added</h3><div className="panel-hint">Newest records first.</div></div><button className="text-button" onClick={()=>onGoToCatalog({})}>View all</button></div>
          <div className="recent-list">{recent.map(p=><button className="recent-row" key={p.id} onClick={()=>onGoToCatalog({search:p.ean||p.description,autoOpen:true})}><div className="recent-thumb">{p.image_url?<img src={p.image_url} alt=""/>:<span>IMG</span>}</div><div><strong>{p.description||p.model||'Unnamed article'}</strong><small>{p.brand||'—'} · {p.article_no||'No Article No.'}</small></div><b>{p.sp!=null?`₹${p.sp}`:p.mrp!=null?`₹${p.mrp}`:'—'}</b></button>)}</div>
        </div>

        <div className="panel glass-panel">
          <div className="panel-heading-row"><div><h3>Articles by Month</h3><div className="panel-hint">Latest production/import periods first.</div></div></div>
          <div className="rank-list">{monthCounts.slice(0,12).map(([m,count],i)=><button className="rank-row" key={m} onClick={()=>onGoToCatalog({month:m})}><span>{String(i+1).padStart(2,'0')}</span><strong>{formatMonthLabel(m)}</strong><i><em style={{width:`${animate?count/Math.max(...monthCounts.map(x=>x[1]),1)*100:0}%`}}/></i><b>{count}</b></button>)}</div>
        </div>
      </section>



      <section className="dashboard-grid two-equal">
        <div className="panel glass-panel"><div className="panel-heading-row"><div><h3>Categories</h3><div className="panel-hint">Search and open a category.</div></div></div><div className="smart-search"><span>⌕</span><input placeholder="Search categories…" value={catQuery} onChange={e=>setCatQuery(e.target.value)}/></div><div className="cat-tile-grid compact-tiles">{filteredCats.slice(0,18).map(([name,count])=><button className="cat-tile" key={name} onClick={()=>onGoToCatalog({category:name})}><div className="icon">{categoryIcon(name)}</div><div className="name">{name}</div><div className="count">{count}</div><div className="count-lbl">articles</div></button>)}</div></div>
        <div className="panel glass-panel"><div className="panel-heading-row"><div><h3>Brands</h3><div className="panel-hint">Highest article counts first.</div></div></div><div className="smart-search"><span>⌕</span><input placeholder="Search brands…" value={brandQuery} onChange={e=>setBrandQuery(e.target.value)}/></div><div className="rank-list">{filteredBrands.slice(0,12).map(([b,count],i)=><button className="rank-row" key={b} onClick={()=>onGoToCatalog({brand:b})}><span>{String(i+1).padStart(2,'0')}</span><strong>{b}</strong><i><em style={{width:`${animate?Math.max(8,count/(brandCounts[0]?.[1]||1)*100):0}%`}}/></i><b>{count}</b></button>)}</div></div>
      </section>

      <div className="section-title-row"><div><h2>Garments</h2><p>Separate garment master with style and brand navigation.</p></div><button className="btn btn-teal" onClick={()=>onGoToGarments({})}>Open Garments</button></div>
      <section className="dashboard-metrics compact"><div className="metric-card"><strong>{garments.length}</strong><span>Rows</span></div><div className="metric-card"><strong>{garmentStyles.length}</strong><span>Styles</span></div><div className="metric-card"><strong>{garmentBrands.length}</strong><span>Brands</span></div></section>
      <section className="dashboard-grid two-equal"><div className="panel glass-panel"><h3>Top Garment Styles</h3><div className="cat-tile-grid compact-tiles">{garmentStyleCounts.slice(0,12).map(([name,count])=><button className="cat-tile" key={name} onClick={()=>onGoToGarments({modelName:name})}><div className="icon">{garmentTypeIcon(name)}</div><div className="name">{name||'Unspecified'}</div><div className="count">{count}</div><div className="count-lbl">rows</div></button>)}</div></div><div className="panel glass-panel"><h3>Garment Brands</h3><div className="rank-list">{garmentBrandCounts.slice(0,12).map(([b,count],i)=><button className="rank-row" key={b} onClick={()=>onGoToGarments({brand:b})}><span>{String(i+1).padStart(2,'0')}</span><strong>{b}</strong><i><em style={{width:`${count/Math.max(garmentBrandCounts[0]?.[1]||1,1)*100}%`}}/></i><b>{count}</b></button>)}</div></div></section>
    </div>
  );
}

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient.js';
import { useAuth } from './lib/useAuth.js';
import { DialogProvider, useDialogs } from './components/Dialogs.jsx';
import LoginModal from './components/LoginModal.jsx';
import Home from './components/Home.jsx';
import Catalog from './components/Catalog.jsx';
import AddProductForm from './components/AddProductForm.jsx';
import Garments from './components/Garments.jsx';
import GarmentForm from './components/GarmentForm.jsx';

const BrandIconSVG = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="2" width="14" height="20" rx="2" stroke="#E9B98C" strokeWidth="1.6" />
    <path d="M7 7H13" stroke="#F4F1E6" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M7 11H13" stroke="#F4F1E6" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M7 15H10.5" stroke="#F4F1E6" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="18" cy="17" r="4" fill="#C1622B" stroke="#17233B" strokeWidth="1" />
    <path d="M16.6 17L17.6 18L19.6 15.6" stroke="#F4F1E6" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function AppInner() {
  const { isAuthed, signIn, signOut } = useAuth();
  const dialogs = useDialogs();

  const [view, setViewState] = useState('home');
  const [products, setProducts] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [catalogFilters, setCatalogFilters] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const [garments, setGarments] = useState([]);
  const [garmentsLoading, setGarmentsLoading] = useState(true);
  const [garmentsError, setGarmentsError] = useState(null);
  const [garmentFilters, setGarmentFilters] = useState(null);
  const [editingGarmentGroup, setEditingGarmentGroup] = useState(null);

  // ---------------- browser back/forward support ----------------
  const isPopRef = useRef(false);
  useEffect(() => {
    window.history.replaceState({ view: 'home' }, '', '#home');
    function onPop(e) {
      isPopRef.current = true;
      setViewState(e.state?.view || 'home');
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function navigate(nextView) {
    if (!isPopRef.current) {
      window.history.pushState({ view: nextView }, '', '#' + nextView);
    }
    isPopRef.current = false;
    setViewState(nextView);
  }

  // ---------------- data loading ----------------
  // Supabase/PostgREST caps a single select() response at 1000 rows by default,
  // regardless of how many rows actually exist — so anything past the first
  // 1000 silently gets cut off unless we page through with .range().
  async function fetchAllRows(table) {
    const pageSize = 1000;
    let all = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      all = all.concat(data || []);
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }
    return all;
  }

  const loadProducts = useCallback(async () => {
    setDataLoading(true);
    try {
      const data = await fetchAllRows('products');
      setProducts(data);
      setDataError(null);
    } catch (err) {
      setDataError(err.message);
    }
    setDataLoading(false);
  }, []);

  const loadGarments = useCallback(async () => {
    setGarmentsLoading(true);
    try {
      const data = await fetchAllRows('garments');
      setGarments(data);
      setGarmentsError(null);
    } catch (err) {
      setGarmentsError(err.message);
    }
    setGarmentsLoading(false);
  }, []);

  useEffect(() => { loadProducts(); loadGarments(); }, [loadProducts, loadGarments]);

  function requireAuth(action) {
    if (isAuthed) { action(); return; }
    setPendingAction(() => action);
    setShowLogin(true);
  }

  async function handleLoginSubmit(email, password) {
    const err = await signIn(email, password);
    if (!err) {
      setShowLogin(false);
      if (pendingAction) { pendingAction(); setPendingAction(null); }
    }
    return err;
  }

  // ---------------- navigation actions ----------------
  function goHome() { navigate('home'); }

  function goToCatalog(filters) {
    setCatalogFilters({ ...filters, _t: Date.now() });
    navigate('catalog');
  }

  function goToGarments(filters) {
    setGarmentFilters({ ...filters, _t: Date.now() });
    navigate('garments');
  }

  function openAddChoice() {
    requireAuth(() => {
      dialogs.choiceDialog({
        title: 'What would you like to add?',
        message: 'Choose which catalog this new entry belongs to.',
        options: [
          { label: 'General Article', icon: '📦', onClick: () => { setEditingProduct(null); navigate('add-product'); } },
          { label: 'Garment', icon: '👕', onClick: () => { setEditingGarmentGroup(null); navigate('add-garment'); } },
        ],
      });
    });
  }

  function openEditForm(product) {
    requireAuth(() => { setEditingProduct(product); navigate('add-product'); });
  }

  function deleteProduct(product) {
    requireAuth(() => {
      dialogs.confirmDialog({
        title: 'Delete this article?',
        message: `"${product.description || product.model || 'This article'}" will be permanently removed.`,
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: async () => {
          const { error } = await supabase.from('products').delete().eq('id', product.id);
          if (error) dialogs.alertDialog({ title: 'Could not delete', message: error.message });
          else loadProducts();
        },
      });
    });
  }

  function handleProductSaved() {
    setEditingProduct(null);
    navigate('catalog');
    loadProducts();
  }

  function openEditGarment(group) {
    requireAuth(() => { setEditingGarmentGroup(group); navigate('add-garment'); });
  }

  function deleteGarment(group) {
    requireAuth(() => {
      dialogs.confirmDialog({
        title: 'Delete this garment style?',
        message: `"${group.excel_name || group.customer_model}" (${group.sizes.length} size${group.sizes.length === 1 ? '' : 's'}) will be permanently removed.`,
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: async () => {
          const ids = group.sizes.map(s => s.id);
          const { error } = await supabase.from('garments').delete().in('id', ids);
          if (error) dialogs.alertDialog({ title: 'Could not delete', message: error.message });
          else loadGarments();
        },
      });
    });
  }

  function handleGarmentSaved() {
    setEditingGarmentGroup(null);
    navigate('garments');
    loadGarments();
  }

  return (
    <>
      <header>
        <div className="header-inner">
          <button className="brand-mark" onClick={goHome} title="Go to Home">
            <div className="brand-icon"><BrandIconSVG /></div>
            <div>
              <p className="eyebrow">G-Records</p>
              <h1>Article Ledger</h1>
            </div>
          </button>
          <div className="header-actions">
            {isAuthed ? (
              <>
                <span className="who">Signed in</span>
                <button className="btn" onClick={signOut}>Sign out</button>
              </>
            ) : (
              <button className="btn" onClick={() => setShowLogin(true)}>Admin sign-in</button>
            )}
          </div>
        </div>
        <nav className="tabs">
          <button className={view === 'home' ? 'active' : ''} onClick={goHome}>🏠 Home</button>
          <button className={view === 'catalog' ? 'active' : ''} onClick={() => { setCatalogFilters(null); navigate('catalog'); }}>General</button>
          <button className={view === 'garments' ? 'active' : ''} onClick={() => { setGarmentFilters(null); navigate('garments'); }}>Garments</button>
          <button className={(view === 'add-product' || view === 'add-garment') ? 'active' : ''} onClick={openAddChoice}>+ Add Product</button>
        </nav>
      </header>

      {dataLoading && (
        <div style={{ padding: 60, textAlign: 'center', fontFamily: "'JetBrains Mono',monospace", color: 'var(--ink-soft)' }}>
          Loading catalog…
        </div>
      )}

      {dataError && (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: "'JetBrains Mono',monospace", color: 'var(--danger)' }}>
          Could not load products: {dataError}
          <br /><br />
          Check that VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set and that supabase/schema.sql has been run.
        </div>
      )}

      {!dataLoading && !dataError && (
        <>
          {view === 'home' && (
            <Home products={products} garments={garments} onGoToCatalog={goToCatalog} onGoToGarments={goToGarments} />
          )}
          {view === 'catalog' && (
            <Catalog
              products={products}
              initialFilters={catalogFilters}
              onEdit={openEditForm}
              onDelete={deleteProduct}
            />
          )}
          {view === 'add-product' && (
            <AddProductForm
              products={products}
              editingProduct={editingProduct}
              onSaved={handleProductSaved}
              onCancel={() => navigate('catalog')}
            />
          )}
          {view === 'garments' && (
            <>
              {garmentsLoading && (
                <div style={{ padding: 60, textAlign: 'center', fontFamily: "'JetBrains Mono',monospace", color: 'var(--ink-soft)' }}>
                  Loading garments…
                </div>
              )}
              {garmentsError && (
                <div style={{ padding: 40, textAlign: 'center', fontFamily: "'JetBrains Mono',monospace", color: 'var(--danger)' }}>
                  Could not load garments: {garmentsError}
                  <br /><br />
                  Check that supabase/garments_schema.sql has been run and the migration completed.
                </div>
              )}
              {!garmentsLoading && !garmentsError && (
                <Garments garments={garments} initialFilters={garmentFilters} onEdit={openEditGarment} onDelete={deleteGarment} />
              )}
            </>
          )}
          {view === 'add-garment' && (
            <GarmentForm
              garments={garments}
              editingGroup={editingGarmentGroup}
              onSaved={handleGarmentSaved}
              onCancel={() => navigate('garments')}
            />
          )}
        </>
      )}

      <footer>Article Ledger — built with React + Supabase</footer>

      {showLogin && (
        <LoginModal
          onClose={() => { setShowLogin(false); setPendingAction(null); }}
          onSubmit={handleLoginSubmit}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <DialogProvider>
      <AppInner />
    </DialogProvider>
  );
}

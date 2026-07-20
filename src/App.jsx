import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient.js';
import { useAuth } from './lib/useAuth.js';
import { DialogProvider, useDialogs } from './components/Dialogs.jsx';
import LoginModal from './components/LoginModal.jsx';
import Home from './components/Home.jsx';
import Catalog from './components/Catalog.jsx';
import AddProductForm from './components/AddProductForm.jsx';

function AppInner() {
  const { isAuthed, loading: authLoading, signIn, signOut } = useAuth();
  const dialogs = useDialogs();

  const [view, setView] = useState('home');
  const [products, setProducts] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [catalogFilters, setCatalogFilters] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // function to run after successful login

  const loadProducts = useCallback(async () => {
    setDataLoading(true);
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: true });
    if (error) setDataError(error.message);
    else { setProducts(data || []); setDataError(null); }
    setDataLoading(false);
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

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

  function goToCatalog(filters) {
    setCatalogFilters({ ...filters, _t: Date.now() });
    setView('catalog');
  }

  function openAddForm() {
    requireAuth(() => { setEditingProduct(null); setView('add'); });
  }

  function openEditForm(product) {
    requireAuth(() => { setEditingProduct(product); setView('add'); });
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
          if (error) {
            dialogs.alertDialog({ title: 'Could not delete', message: error.message });
          } else {
            loadProducts();
          }
        },
      });
    });
  }

  function handleSaved() {
    setEditingProduct(null);
    setView('catalog');
    loadProducts();
  }

  const categories = new Set(products.map(p => p.category)).size;
  const brands = new Set(products.map(p => p.brand)).size;

  return (
    <>
      <header>
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--paper)', border: '2px dashed rgba(244,241,230,0.5)' }} />
            <div>
              <p className="eyebrow">Purchase Register</p>
              <h1>Article Ledger</h1>
            </div>
          </div>
          <div className="stats-strip">
            <span><b>{products.length}</b> articles</span>
            <span><b>{categories}</b> categories</span>
            <span><b>{brands}</b> brands</span>
          </div>
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
          <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>Home</button>
          <button className={view === 'catalog' ? 'active' : ''} onClick={() => { setCatalogFilters(null); setView('catalog'); }}>Catalog</button>
          <button className={view === 'add' ? 'active' : ''} onClick={openAddForm}>Add Product</button>
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
          {view === 'home' && <Home products={products} onGoToCatalog={goToCatalog} />}
          {view === 'catalog' && (
            <Catalog
              products={products}
              initialFilters={catalogFilters}
              onEdit={openEditForm}
              onDelete={deleteProduct}
            />
          )}
          {view === 'add' && (
            <AddProductForm
              products={products}
              editingProduct={editingProduct}
              onSaved={handleSaved}
              onCancel={() => setView('catalog')}
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

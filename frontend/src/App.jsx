// App.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE || '/api/products';
const CATEGORIES = [
  'Electronics', 'Books', 'Fashion', 'Sports', 'Furniture',
  'Beauty', 'Food', 'Toys', 'Automotive', 'Other'
];

export default function App() {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('');
  const [cursor, setCursor] = useState(null);
  const [snapshotTime, setSnapshotTime] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const observerRef = useRef();

  const fetchProducts = useCallback(async (fresh = false) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (category) params.append('category', category);
      if (!fresh && cursor) params.append('cursor', cursor);
      if (!fresh && snapshotTime) params.append('snapshotTime', snapshotTime);

      const res = await fetch(`${API_BASE}?${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Fetch error');
      }
      const data = await res.json();
      setProducts(prev => fresh ? data.data : [...prev, ...data.data]);
      setCursor(data.nextCursor);
      setSnapshotTime(data.snapshotTime);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [cursor, snapshotTime, category, loading]);

  useEffect(() => {
    fetchProducts(true);
  }, [category]);

  const lastProductRef = useCallback(node => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) fetchProducts(false);
    });
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, fetchProducts]);

  const handleRefresh = () => {
    setCursor(null);
    setSnapshotTime(null);
    fetchProducts(true);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-accent">Product</span> Catalog
        </h1>
        <div className="controls">
          <div className="select-wrapper">
            <select
              className="category-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button className="refresh-btn" onClick={handleRefresh}>
            <span className="refresh-icon">↻</span> Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠</span> {error}
        </div>
      )}

      <ul className="product-list">
        {products.map((p, idx) => {
          const isLast = idx === products.length - 1;
          return (
            <li
              key={p._id}
              ref={isLast ? lastProductRef : null}
              className="product-card"
            >
              <div className="card-content">
                <h3 className="product-name">{p.name}</h3>
                <div className="product-meta">
                  <span className="product-category">{p.category}</span>
                  <span className="product-price">${p.price.toFixed(2)}</span>
                </div>
              </div>
              <div className="card-glow"></div>
            </li>
          );
        })}
      </ul>

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Discovering products…</p>
        </div>
      )}

      {!hasMore && products.length > 0 && (
        <div className="end-message">
          <span className="end-line"></span>
          <span>You've seen it all</span>
          <span className="end-line"></span>
        </div>
      )}
    </div>
  );
}
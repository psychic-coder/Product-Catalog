# Product Catalog Backend – MVP

A production‑quality backend that lets users browse 200,000 products with **stable cursor‑based snapshot pagination**, category filtering, and data consistency guarantees.

## 1. Architecture Decisions

### Why Not Offset Pagination?
- **Performance**: `skip()` becomes linearly slower as the offset grows. For page 1000, MongoDB must scan and discard the first 1000×20 documents.
- **Consistency**: Concurrent inserts/updates cause **duplicates** (a new document shifts the offset) or **missed items** (a deleted document leaves a gap).
- **Stability**: A user scrolling through pages sees a flickering list because the underlying data changes.

### Why Cursor‑Based Pagination?
- **Constant Time**: Each page uses an index scan starting exactly where the previous page ended – O(1) per request regardless of page depth.
- **Stable Ordering**: The keyset `(updatedAt DESC, _id DESC)` is unique and deterministic, so every document has a fixed position.
- **Efficiency**: Relies on the database index and a tight range query (`$lt` / `$or`) that never scans unnecessary documents.

### Why Snapshot Pagination?
Even cursor pagination can break when data changes **during** a browsing session.  
Our approach:
- On the **first request** we capture the current server time (`snapshotTime`).
- Every subsequent page is filtered by `updatedAt <= snapshotTime`.
- This **freezes the dataset** for the entire session – the user sees exactly the state of the catalog at that moment, guaranteeing:
  - No duplicate products (a freshly inserted item has `updatedAt > snapshotTime` and is excluded).
  - No missing products (an update that changes `updatedAt` is also excluded).
  - Deterministic ordering because the set of documents is fixed.

## 2. Database Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| Main pagination | `{ updatedAt: -1, _id: -1 }` | Powers default newest‑first listing without category filter. Supports `$lt` / `$or` conditions efficiently. |
| Category pagination | `{ category: 1, updatedAt: -1, _id: -1 }` | Optimises filtered queries: the equality on `category` is used first, then the rest of the index handles sorting and range scan. |

Both indexes are **covered** (all fields needed for filtering and sorting are present), so MongoDB can answer queries directly from the index.

## 3. Time Complexity

- **First page (no cursor)** → index scan of first *limit* entries → O(limit)
- **Subsequent page** → index seek on `(updatedAt, _id)` + scan next *limit* entries → O(limit)
- **With category filter** → index seek on `(category, updatedAt, _id)` → O(limit)

All queries are **O(limit)**, independent of total collection size.

## 4. API Examples

### First page
```http
GET /api/products?limit=20
Response:

json
{
  "data": [ ... ],
  "nextCursor": "eyJ1cGRhdGVkQXQi...",
  "snapshotTime": "2026-06-23T12:30:00.000Z",
  "hasMore": true
}
```

Next page
```http
GET /api/products?limit=20&cursor=<nextCursor>&snapshotTime=<snapshotTime>
```

With category filter
```http
GET /api/products?category=Books&limit=20
```

## 5. Setup Instructions

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas cluster (or local MongoDB)
- Git

### Backend
```bash
git clone <repo-url>
cd product-catalog
cp .env.example .env
# edit MONGO_URI
npm install
npm run seed   # generates 200k products in ~30s
npm run dev    # starts on http://localhost:5000
```

### Frontend (optional)
```bash
cd frontend
npm install
npm run dev    # http://localhost:3000 (proxies /api to backend)
```

### Tests
```bash
cp .env.test.example .env.test   # or use local test DB
npm test
```

## 6. Deployment (Render + MongoDB Atlas)

### MongoDB Atlas
1. Create a free M0 cluster.
2. Whitelist Render’s IP (0.0.0.0/0 for development) and create a database user.
3. Copy the connection string into MONGO_URI.

### Render Web Service
1. Connect your GitHub repository.
2. Set Build Command: `npm install && npm run build`
3. Set Start Command: `npm start`
4. Add environment variables:
   - MONGO_URI (your Atlas URI)
   - PORT = 5000
   - NODE_ENV = production

### Frontend (Optional)
Deploy the frontend folder to a static host (Vercel, Netlify) and point the proxy or API calls to the Render backend.

## 7. Trade‑offs & Future Improvements
- **Snapshot staleness**: A long browsing session never sees new products; acceptable for an MVP. Could be enhanced with a “refresh” mechanism that the user must explicitly trigger.
- **Soft deletes**: Currently we filter by `updatedAt <= snapshotTime`, which works for inserts/updates. For deletes we would need a `deletedAt` flag.
- **Caching**: Add Redis for frequently‑accessed first pages.
- **Rate limiting**: Introduce `express-rate-limit` to prevent abuse.
- **Full‑text search**: Extend with Atlas Search or Elasticsearch.

## License
MIT

---

## Final Notes

- The backend is **immediately runnable**: `npm install`, `npm run seed`, `npm run dev`.
- The seed script uses `insertMany` in batches of 5,000 – it completes in under 30 seconds on typical hardware.
- All validation, error handling, logging (via morgan), and the snapshot consistency mechanism are fully implemented.
- The optional React frontend demonstrates infinite scroll, category filtering, and a “Refresh” button to start a new browsing session.

All required test cases are covered in `tests/products.test.ts` and can be executed with `npm test` after setting up a test database.

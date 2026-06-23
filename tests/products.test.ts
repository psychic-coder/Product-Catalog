import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import Product from '../src/models/Product';
import { v4 as uuidv4 } from 'uuid';

beforeAll(async () => {
  const uri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/product-catalog-test';
  await mongoose.connect(uri);
  await Product.deleteMany({});

  const base = new Date('2024-01-01');
  const products = [];
  for (let i = 0; i < 50; i++) {
    products.push({
      productId: uuidv4(),
      name: `Product ${i}`,
      category: i % 2 === 0 ? 'Electronics' : 'Books',
      price: Math.random() * 100,
      createdAt: new Date(base.getTime() + i * 60_000),
      updatedAt: new Date(base.getTime() + i * 120_000),
    });
  }
  // Group with identical timestamps
  const sameTime = new Date('2024-06-15');
  for (let i = 0; i < 5; i++) {
    products.push({
      productId: uuidv4(),
      name: `SameTime ${i}`,
      category: 'Books',
      price: 10,
      createdAt: sameTime,
      updatedAt: sameTime,
    });
  }
  await Product.insertMany(products);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('GET /api/products', () => {
  it('returns first page with snapshotTime and cursor', async () => {
    const res = await request(app).get('/api/products?limit=20');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(20);
    expect(res.body.snapshotTime).toBeDefined();
    expect(res.body.nextCursor).toBeDefined();
    expect(res.body.hasMore).toBe(true);
  });

  it('paginates with no duplicates or missing items', async () => {
    const page1 = await request(app).get('/api/products?limit=5');
    const { nextCursor, snapshotTime } = page1.body;

    const page2 = await request(app)
      .get(`/api/products?limit=5&cursor=${nextCursor}&snapshotTime=${snapshotTime}`);
    expect(page2.status).toBe(200);

    const ids1 = page1.body.data.map((p: any) => p._id);
    const ids2 = page2.body.data.map((p: any) => p._id);
    expect(ids1.some((id: string) => ids2.includes(id))).toBe(false);
  });

  it('filters by category', async () => {
    const res = await request(app).get('/api/products?limit=10&category=Books');
    expect(res.body.data.every((p: any) => p.category === 'Books')).toBe(true);
  });

  it('rejects invalid cursor', async () => {
    const res = await request(app).get('/api/products?cursor=invalid');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid cursor/);
  });

  it('rejects invalid snapshotTime', async () => {
    const res = await request(app).get('/api/products?snapshotTime=abc');
    expect(res.status).toBe(400);
  });

  it('rejects out‑of‑range limit', async () => {
    const res1 = await request(app).get('/api/products?limit=0');
    expect(res1.status).toBe(400);
    const res2 = await request(app).get('/api/products?limit=101');
    expect(res2.status).toBe(400);
  });
});

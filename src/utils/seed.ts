import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import Product from '../models/Product';

dotenv.config();

const CATEGORIES = [
  'Electronics', 'Books', 'Fashion', 'Sports', 'Furniture',
  'Beauty', 'Food', 'Toys', 'Automotive', 'Other'
];

const TOTAL = 200_000;
const BATCH_SIZE = 5_000;

const ADJECTIVES = ['Smart','Portable','Ergonomic','Eco','Wireless','Heavy-Duty','Compact','Luxury','Vintage','Modern'];
const NOUNS = ['Widget','Gadget','Device','Tool','Appliance','Accessory','Kit','Set','Module','Unit'];

function randomItem(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPrice() {
  return parseFloat((Math.random() * 1000 + 1).toFixed(2));
}

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateBatch(startIdx: number, endIdx: number) {
  const now = new Date();
  const start = new Date('2023-01-01');
  const docs = [];
  for (let i = startIdx; i < endIdx; i++) {
    const createdAt = randomDate(start, now);
    const updatedAt = new Date(createdAt.getTime() + Math.random() * (now.getTime() - createdAt.getTime()));
    // Create many products with the same second‑granularity timestamp to test tie‑breaking
    if (i % 100 === 0) updatedAt.setMilliseconds(0);
    docs.push({
      productId: uuidv4(),
      name: `${randomItem(ADJECTIVES)} ${randomItem(NOUNS)} ${Math.floor(Math.random() * 10000)}`,
      category: randomItem(CATEGORIES),
      price: randomPrice(),
      createdAt,
      updatedAt,
    });
  }
  return docs;
}

async function seed() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set');
  await mongoose.connect(uri);
  console.log('Connected. Dropping existing products...');
  await Product.deleteMany({});
  console.log('Cleared. Seeding 200,000 products...');

  const startTime = Date.now();
  for (let i = 0; i < TOTAL; i += BATCH_SIZE) {
    const batch = generateBatch(i, Math.min(i + BATCH_SIZE, TOTAL));
    await Product.insertMany(batch);
    console.log(`Inserted ${Math.min(i + BATCH_SIZE, TOTAL)} / ${TOTAL}`);
  }
  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`Seeding completed in ${elapsed.toFixed(2)} seconds.`);

  await Product.syncIndexes();
  console.log('Indexes synced.');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});

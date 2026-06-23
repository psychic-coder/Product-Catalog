import { Request, Response, NextFunction } from 'express';
import { decodeCursor } from '../utils/cursor';

const ALLOWED_CATEGORIES = [
  'Electronics', 'Books', 'Fashion', 'Sports', 'Furniture',
  'Beauty', 'Food', 'Toys', 'Automotive', 'Other'
];

export function validateGetProducts(req: Request, res: Response, next: NextFunction) {
  const { limit, cursor, snapshotTime, category } = req.query;

  // --- limit validation ---
  if (limit) {
    const parsed = parseInt(limit as string, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 100) {
      return res.status(400).json({ message: 'Invalid limit. Must be between 1 and 100.' });
    }
    req.query.limit = parsed.toString();
  }

  // --- cursor validation ---
  if (cursor) {
    const decoded = decodeCursor(cursor as string);
    if (!decoded) {
      return res.status(400).json({ message: 'Invalid cursor' });
    }
    (req as any).decodedCursor = decoded;  // attach for service layer
  }

  // --- snapshotTime validation ---
  if (snapshotTime) {
    const date = new Date(snapshotTime as string);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ message: 'Invalid snapshotTime' });
    }
    (req as any).snapshotTime = date;
  }

  // --- category validation ---
  if (category) {
    if (typeof category !== 'string' || !ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }
    req.query.category = category;
  }

  next();
}

import Product, { IProduct } from '../models/Product';
import { encodeCursor, CursorData } from '../utils/cursor';

interface GetProductsResult {
  data: IProduct[];
  nextCursor: string | null;
  snapshotTime: string;  // ISO string
  hasMore: boolean;
}

/**
 * Fetch a page of products using cursor‑based snapshot pagination.
 *
 * @param limit          Number of items to return (1–100)
 * @param category       Optional category filter
 * @param decodedCursor  Parsed cursor from previous page, or undefined for first page
 * @param snapshotTime   Time anchor for the session; generated if missing
 */
export async function getProducts(
  limit: number,
  category?: string,
  decodedCursor?: CursorData,
  snapshotTime?: Date
): Promise<GetProductsResult> {

  // If no snapshotTime is provided, start a new session anchored to "now"
  const effectiveSnapshot = snapshotTime || new Date();

  // Base filter: all products that existed at snapshot time
  const filter: any = {
    updatedAt: { $lte: effectiveSnapshot }
  };

  if (category) {
    filter.category = category;
  }

  // Cursor conditions for keyset pagination
  if (decodedCursor) {
    const cursorUpdatedAt = new Date(decodedCursor.updatedAt);
    filter.$and = [
      {
        $or: [
          { updatedAt: { $lt: cursorUpdatedAt } },
          {
            updatedAt: cursorUpdatedAt,
            _id: { $lt: decodedCursor._id }
          }
        ]
      }
    ];
  }

  // Always sort newest first, tie‑break by _id
  const sort: any = { updatedAt: -1, _id: -1 };

  // Fetch one extra to detect hasMore
  const docs = await Product.find(filter)
    .sort(sort)
    .limit(limit + 1)
    .lean();

  const hasMore = docs.length > limit;
  const data = hasMore ? docs.slice(0, limit) : docs;

  let nextCursor: string | null = null;
  if (hasMore) {
    const last = data[data.length - 1];
    nextCursor = encodeCursor({
      updatedAt: (last.updatedAt as Date).toISOString(),
      _id: last._id.toString()
    });
  }

  return {
    data: data as unknown as IProduct[],
    nextCursor,
    snapshotTime: effectiveSnapshot.toISOString(),
    hasMore
  };
}

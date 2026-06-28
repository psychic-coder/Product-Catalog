import Product, { IProduct } from '../models/Product';
import { encodeCursor, CursorData } from '../utils/cursor';

interface GetProductsResult {
  data: IProduct[];
  nextCursor: string | null;
  snapshotTime: string;
  hasMore: boolean;
}

export async function getProducts(
  limit: number,
  category?: string,
  decodedCursor?: CursorData,
  snapshotTime?: Date
): Promise<GetProductsResult> {

  const effectiveSnapshot = snapshotTime || new Date();

  const filter: any = {
    updatedAt: { $lte: effectiveSnapshot }
  };

  if (category) {
    filter.category = category;
  }

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

  const sort: any = { updatedAt: -1, _id: -1 };

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

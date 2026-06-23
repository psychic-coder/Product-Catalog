import { Request, Response, NextFunction } from 'express';
import { getProducts } from '../services/product.service';

export const getProductsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string | undefined;
    const decodedCursor = (req as any).decodedCursor;
    const snapshotTime: Date | undefined = (req as any).snapshotTime;

    const result = await getProducts(limit, category, decodedCursor, snapshotTime);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

import { Router } from 'express';
import { getProductsHandler } from '../controllers/product.controller';
import { validateGetProducts } from '../middleware/validateQuery';

const router = Router();

router.get('/', validateGetProducts, getProductsHandler);

export default router;

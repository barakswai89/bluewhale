// FILE: server/src/routes/financials.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getFinancials,
  downloadFinancials,
  syncFinancials,
  syncAllFinancialsEndpoint,
  getFinancialsSummary,
} from '../controllers/financials.controller';

const router = Router();

// All routes require auth
router.use(authenticate);

router.get('/:ticker',          getFinancials);
router.get('/:ticker/summary',  getFinancialsSummary);
router.get('/:ticker/download', downloadFinancials);
router.post('/:ticker/sync',    syncFinancials);
router.post('/sync-all',        syncAllFinancialsEndpoint);

export default router;

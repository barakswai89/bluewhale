// FILE: server/src/controllers/financials.controller.ts
// STANDALONE — serves financial statement data using the actual flat schema.

import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.utils';
import { prisma } from '../config/database';

// Fields that actually exist on FinancialStatement in the live database
const FINANCIAL_SELECT = {
  fiscalYear: true,
  currency: true,
  revenue: true,
  costOfRevenue: true,
  grossProfit: true,
  operatingExpenses: true,
  ebitda: true,
  ebit: true,
  interestExpense: true,
  taxExpense: true,
  netIncome: true,
  totalAssets: true,
  currentAssets: true,
  totalLiabilities: true,
  currentLiabilities: true,
  totalEquity: true,
  cash: true,
  debt: true,
  operatingCashFlow: true,
  investingCashFlow: true,
  financingCashFlow: true,
  freeCashFlow: true,
  eps: true,
  dividendPerShare: true,
} as const;

// GET /api/v1/financials/:ticker
// Returns the full FinancialStatement row(s) for a company
export async function getFinancials(req: Request, res: Response): Promise<void> {
  try {
    const { ticker } = req.params;
    const company = await prisma.company.findUnique({ where: { ticker: ticker.toUpperCase() } });
    if (!company) { sendError(res, `Company ${ticker} not found`, 404); return; }

    const data = await (prisma as any).financialStatement.findMany({
      where: { companyId: company.id },
      orderBy: { fiscalYear: 'desc' },
      select: FINANCIAL_SELECT,
    });

    if (!data || data.length === 0) { sendError(res, `No financial data for ${ticker}`, 404); return; }
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// GET /api/v1/financials/:ticker/summary
// Returns key metrics across years for the Financials tab and sparklines
export async function getFinancialsSummary(req: Request, res: Response): Promise<void> {
  try {
    const { ticker } = req.params;
    const company = await prisma.company.findUnique({ where: { ticker: ticker.toUpperCase() } });
    if (!company) { sendError(res, `Company not found`, 404); return; }

    const rows = await (prisma as any).financialStatement.findMany({
      where: { companyId: company.id },
      orderBy: { fiscalYear: 'asc' },
      select: FINANCIAL_SELECT,
    });

    sendSuccess(res, { ticker: ticker.toUpperCase(), years: rows });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// POST /api/v1/financials/:ticker/sync
// Disabled for the demo — data is seeded manually, not synced live.
export async function syncFinancials(req: Request, res: Response): Promise<void> {
  sendError(res, 'Live sync is disabled. Financial data is seeded manually for this demo.', 501);
}

// POST /api/v1/financials/sync-all
// Disabled for the demo — data is seeded manually, not synced live.
export async function syncAllFinancialsEndpoint(req: Request, res: Response): Promise<void> {
  sendError(res, 'Live sync is disabled. Financial data is seeded manually for this demo.', 501);
}

// GET /api/v1/financials/:ticker/download
// Disabled for the demo — no Excel generation against the flat schema yet.
export async function downloadFinancials(req: Request, res: Response): Promise<void> {
  sendError(res, 'Excel export is not available in this demo build.', 501);
}

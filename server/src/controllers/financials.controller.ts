// FILE: server/src/controllers/financials.controller.ts
// STANDALONE — serves financial statement data and Excel downloads.

import { Request, Response } from 'express';
import {
  getCompanyFinancials,
  syncCompanyFinancials,
  generateFinancialsExcel,
  syncAllFinancials,
} from '../services/financials.service';
import { sendSuccess, sendError } from '../utils/response.utils';
import { prisma } from '../config/database';

// GET /api/v1/financials/:ticker
export async function getFinancials(req: Request, res: Response): Promise<void> {
  try {
    const { ticker } = req.params;
    const company = await prisma.company.findUnique({ where: { ticker: ticker.toUpperCase() } });
    if (!company) { sendError(res, `Company ${ticker} not found`, 404); return; }

    const data = await getCompanyFinancials(company.id);
    if (!data || data.length === 0) { sendError(res, `No financial data for ${ticker}`, 404); return; }
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// GET /api/v1/financials/:ticker/download
// Returns an Excel file matching the NFLX template format
export async function downloadFinancials(req: Request, res: Response): Promise<void> {
  try {
    const { ticker } = req.params;
    const t = ticker.toUpperCase();
    const company = await prisma.company.findUnique({ where: { ticker: t } });
    if (!company) { sendError(res, `Company ${ticker} not found`, 404); return; }

    const buffer = await generateFinancialsExcel(company.id);
    if (!buffer) {
      sendError(res, `No financial data available for ${ticker}. Try syncing first.`, 404);
      return;
    }

    const filename = `${t}_Financial_Statements.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// POST /api/v1/financials/:ticker/sync
// Manually trigger a sync for one company
export async function syncFinancials(req: Request, res: Response): Promise<void> {
  try {
    const { ticker } = req.params;
    const t = ticker.toUpperCase();
    const company = await prisma.company.findUnique({ where: { ticker: t } });
    if (!company) { sendError(res, `Company ${ticker} not found`, 404); return; }

    await syncCompanyFinancials(t, company.id);
    sendSuccess(res, { ticker: t, status: 'synced' });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// POST /api/v1/financials/sync-all
// Manually trigger sync for all companies (admin use)
export async function syncAllFinancialsEndpoint(req: Request, res: Response): Promise<void> {
  try {
    // Fire-and-forget — returns immediately, sync runs in background
    syncAllFinancials().catch(console.error);
    sendSuccess(res, { message: 'Full financials sync started in background' });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// GET /api/v1/financials/:ticker/summary
// Returns key metrics for sparklines / quick view
export async function getFinancialsSummary(req: Request, res: Response): Promise<void> {
  try {
    const { ticker } = req.params;
    const company = await prisma.company.findUnique({ where: { ticker: ticker.toUpperCase() } });
    if (!company) { sendError(res, `Company not found`, 404); return; }

    const rows = await (prisma as any).financialStatement.findMany({
      where:   { companyId: company.id },
      orderBy: { fiscalYear: 'asc' },
      select: {
        fiscalYear: true, totalRevenue: true, grossProfit: true,
        operatingIncome: true, netIncome: true, ebitda: true,
        totalAssets: true, totalLiabilities: true, totalEquity: true,
        operatingCashFlow: true, freeCashFlow: true, capitalExpenditures: true,
        eps: true,
      },
    });

    sendSuccess(res, { ticker: ticker.toUpperCase(), years: rows });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

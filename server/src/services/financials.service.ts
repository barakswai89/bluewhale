// FILE: server/src/services/financials.service.ts
// DATA SOURCE: yahoo-finance2 npm package
// Why: Raw axios calls to Yahoo Finance v10/quoteSummary fail silently
//      because Yahoo requires crumb/cookie authentication.
//      yahoo-finance2 handles crumb auth automatically and is actively maintained.

// FILE: server/src/services/financials.service.ts

import yahooFinance from 'yahoo-finance2';
import * as XLSX from 'xlsx';
import { prisma } from '../config/database';

const DELAY = (ms: number) => new Promise(r => setTimeout(r, ms));

// Safely divide, return null if denominator is zero
const pct = (num: number | null | undefined, den: number | null | undefined): number | null =>
  num != null && den != null && den !== 0 ? (num / den) * 100 : null;

// Convert raw number to Millions (Yahoo returns full values)
const toM = (v: number | null | undefined): number | null =>
  v != null && !isNaN(v) ? v / 1_000_000 : null;

// Keep per-share values as-is
const asIs = (v: number | null | undefined): number | null =>
  v != null && !isNaN(v) ? v : null;

// ── Sync one company ──────────────────────────────────────────────
export async function syncCompanyFinancials(
  ticker: string,
  companyId: string
): Promise<{ stored: number; error?: string }> {
  const symbol = `${ticker}.JO`;

  try {
    // yahoo-finance2 handles crumb/cookie authentication automatically
    const result = await yahooFinance.quoteSummary(symbol, {
      modules: [
        'incomeStatementHistory',
        'balanceSheetHistory',
        'cashflowStatementHistory',
      ],
    }) as any;

    const isRows = result.incomeStatementHistory?.incomeStatementHistory ?? [];
    const bsRows = result.balanceSheetHistory?.balanceSheetHistory ?? [];
    const cfRows = result.cashflowStatementHistory?.cashflowStatementHistory ?? [];

    if (isRows.length === 0) {
      return { stored: 0, error: `Yahoo Finance returned no income statement data for ${symbol}` };
    }

    let stored = 0;

    for (let i = 0; i < isRows.length; i++) {
      const is = isRows[i] as any;
      const bs = (bsRows[i] ?? {}) as any;
      const cf = (cfRows[i] ?? {}) as any;

      // Yahoo returns endDate as a Date object
      const endDate = is.endDate instanceof Date ? is.endDate : new Date(is.endDate);
      const fiscalYear = endDate.getFullYear();
      if (!fiscalYear || isNaN(fiscalYear)) continue;

      // ── Income Statement ──────────────────────────────────────
      const rev = toM(is.totalRevenue);
      const gp  = toM(is.grossProfit);
      const oi  = toM(is.ebit ?? is.operatingIncome);
      const ni  = toM(is.netIncome);

      // YoY revenue growth
      let revenueGrowthPct: number | null = null;
      if (i < isRows.length - 1) {
        const prevRev = toM((isRows[i + 1] as any).totalRevenue);
        if (rev != null && prevRev != null && prevRev !== 0) {
          revenueGrowthPct = ((rev - prevRev) / Math.abs(prevRev)) * 100;
        }
      }

      // ── Balance Sheet ─────────────────────────────────────────
      const cash = toM(bs.cash);
      const sti  = toM(bs.shortTermInvestments);

      // ── Cash Flow ─────────────────────────────────────────────
      const ops  = toM(cf.totalCashFromOperatingActivities);
      const capx = toM(cf.capitalExpenditures); // negative in Yahoo
      const fcf  = ops != null && capx != null ? ops + capx : null;

      const data: any = {
        companyId,
        fiscalYear,
        period:   'annual',
        currency: 'ZAR',
        source:   'Yahoo Finance',

        // Income Statement
        totalRevenues:       rev,
        revenueGrowthPct,
        costOfRevenues:      toM(is.costOfRevenue),
        grossProfit:         gp,
        grossMarginPct:      pct(gp, rev),
        sgaExpenses:         toM(is.sellingGeneralAdministrative),
        rdExpenses:          toM(is.researchDevelopment),
        operatingIncome:     oi,
        operatingMarginPct:  pct(oi, rev),
        interestExpense:     toM(is.interestExpense),
        incomeTaxExpense:    toM(is.incomeTaxExpense),
        netIncome:           ni,
        netMarginPct:        pct(ni, rev),
        ebit:                oi,
        ebitda:              oi != null && toM(cf.depreciation) != null
                               ? oi + (toM(cf.depreciation) as number)
                               : null,

        // Balance Sheet
        cashAndEquivalents:   cash,
        shortTermInvestments: sti,
        totalCashAndST:       toM(bs.totalCash) ?? (
          cash != null && sti != null ? cash + sti : cash
        ),
        accountsReceivable:   toM(bs.netReceivables),
        totalReceivables:     toM(bs.netReceivables),
        prepaidExpenses:      toM(bs.prepaidExpenses),
        otherCurrentAssets:   toM(bs.otherCurrentAssets),
        totalCurrentAssets:   toM(bs.totalCurrentAssets),
        netPPE:               toM(bs.propertyPlantEquipment),
        goodwill:             toM(bs.goodWill),
        otherIntangibles:     toM(bs.intangibleAssets),
        totalAssets:          toM(bs.totalAssets),
        accountsPayable:      toM(bs.accountsPayable),
        currentDebt:          toM(bs.shortLongTermDebt),
        unearnedRevenueCurr:  toM(bs.deferredRevenue),
        otherCurrentLiab:     toM(bs.otherCurrentLiab),
        totalCurrentLiab:     toM(bs.totalCurrentLiabilities),
        longTermDebt:         toM(bs.longTermDebt),
        otherNonCurrentLiab:  toM(bs.otherLiab),
        totalLiabilities:     toM(bs.totalLiab),
        commonStock:          toM(bs.commonStock),
        additionalPaidIn:     toM(bs.additionalPaidInCapital),
        retainedEarnings:     toM(bs.retainedEarnings),
        treasuryStock:        toM(bs.treasuryStock),
        commonEquity:         toM(bs.totalStockholderEquity),
        totalEquity:          toM(bs.totalStockholderEquity),

        // Cash Flow
        cfNetIncome:         toM(cf.netIncome),
        depreciationAmort:   toM(cf.depreciation),
        stockBasedComp:      toM(cf.stockBasedCompensation),
        changeInWorkingCap:  toM(cf.changeInWorkingCapital),
        cashFromOperations:  ops,
        capex:               capx,
        cashFromInvesting:   toM(cf.totalCashflowsFromInvestingActivities),
        stockRepurchase:     toM(cf.repurchaseOfStock),
        dividendsPaid:       toM(cf.dividendsPaid),
        cashFromFinancing:   toM(cf.totalCashFromFinancingActivities),
        netChangeInCash:     toM(cf.changeInCash),
        beginningCash:       toM(cf.beginPeriodCashFlow),
        endingCash:          toM(cf.endPeriodCashFlow),
        freeCashFlow:        fcf,

        fetchedAt: new Date(),
        updatedAt: new Date(),
      };

      try {
        await (prisma as any).financialStatement.upsert({
          where:  { companyId_fiscalYear_period: { companyId, fiscalYear, period: 'annual' } },
          update: data,
          create: data,
        }) as any;
        stored++;
      } catch (err: any) {
        console.warn(`   ⚠️  ${ticker} FY${fiscalYear} upsert failed: ${err.message}`);
      }
    }

    if (stored > 0) {
      console.log(`   ✅ ${ticker}: ${stored} years stored (Yahoo Finance via yahoo-finance2)`);
    } else {
      console.warn(`   ⚠️  ${ticker}: data fetched but nothing stored`);
    }

    return { stored };

  } catch (err: any) {
    const msg = err?.message || String(err);
    console.warn(`   ⚠️  ${ticker} financials failed: ${msg}`);
    return { stored: 0, error: msg };
  }
}

// ── Sync all active companies ─────────────────────────────────────
export async function syncAllFinancials(): Promise<void> {
  const companies = await prisma.company.findMany({
    where:  { isActive: true },
    select: { id: true, ticker: true },
  }) as any;

  console.log(`\n📊 Syncing financials for ${companies.length} companies (yahoo-finance2)...`);
  let success = 0, failed = 0;

  for (const c of companies) {
    await DELAY(1500); // Respect Yahoo rate limits
    const result = await syncCompanyFinancials(c.ticker, c.id);
    if (result.stored > 0) success++;
    else failed++;
  }

  console.log(`✅ Financials sync done — ${success} with data, ${failed} failed/no data\n`);
}

// ── Get stored financials for API ─────────────────────────────────
export async function getCompanyFinancials(ticker: string) {
  const company = await prisma.company.findUnique({ where: { ticker } }) as any;
  if (!company) return null;

  const rows = await (prisma as any).financialStatement.findMany({
    where:   { companyId: company.id, period: 'annual' },
    orderBy: { fiscalYear: 'asc' },
  }) as any;

  return {
    ticker,
    company:    company.name,
    currency:   rows[0]?.currency  || 'ZAR',
    source:     rows[0]?.source    || 'Yahoo Finance',
    years:      rows.map((r: any) => r.fiscalYear),
    statements: rows,
  };
}

// ── Generate Excel matching NFLX template ─────────────────────────
export async function generateFinancialsExcel(
  ticker: string,
  companyName: string
): Promise<Buffer | null> {
  const company = await prisma.company.findUnique({ where: { ticker } }) as any;
  if (!company) return null;

  const rows = await (prisma as any).financialStatement.findMany({
    where:   { companyId: company.id, period: 'annual' },
    orderBy: { fiscalYear: 'asc' },
  }) as any;
  if (rows.length === 0) return null;

  const wb       = XLSX.utils.book_new();
  const years    = rows.map((r: any) => `FY${String(r.fiscalYear).slice(2)}`);
  const currency = rows[0]?.currency || 'ZAR';
  const vals     = (f: string) =>
    rows.map((r: any) => r[f] != null ? Math.round(Number(r[f]) * 10) / 10 : '');

  const header = (name: string) => [
    [`${companyName} (${ticker})`],
    [name],
    ['Source: Yahoo Finance'],
    [`Currency: ${currency} Millions`],
    [],
    ['LINE ITEM', ...years],
  ];

  const addSheet = (data: any[][], name: string) => {
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 38 }, ...years.map(() => ({ wch: 14 }))];
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  addSheet([
    ...header('Income Statement'),
    ['── Revenues ──────────────────'],
    ['Total Revenues',             ...vals('totalRevenues')],
    ['YoY Revenue Growth (%)',     ...vals('revenueGrowthPct')],
    ['Cost of Revenues',          ...vals('costOfRevenues')],
    ['Gross Profit',               ...vals('grossProfit')],
    ['Gross Margin (%)',           ...vals('grossMarginPct')],
    [],
    ['── Operating ─────────────────'],
    ['SG&A Expenses',             ...vals('sgaExpenses')],
    ['R&D Expenses',              ...vals('rdExpenses')],
    ['Operating Income (EBIT)',   ...vals('operatingIncome')],
    ['Operating Margin (%)',      ...vals('operatingMarginPct')],
    ['EBITDA',                    ...vals('ebitda')],
    [],
    ['── Below the Line ────────────'],
    ['Interest Expense',          ...vals('interestExpense')],
    ['Income Tax Expense',        ...vals('incomeTaxExpense')],
    [],
    ['── Bottom Line ───────────────'],
    ['Net Income',                ...vals('netIncome')],
    ['Net Margin (%)',            ...vals('netMarginPct')],
  ], 'Income Statement');

  addSheet([
    ...header('Balance Sheet'),
    ['── Current Assets ────────────'],
    ['Cash & Equivalents',        ...vals('cashAndEquivalents')],
    ['Short-Term Investments',    ...vals('shortTermInvestments')],
    ['Total Cash & ST',           ...vals('totalCashAndST')],
    ['Accounts Receivable',       ...vals('accountsReceivable')],
    ['Total Current Assets',      ...vals('totalCurrentAssets')],
    [],
    ['── Non-Current Assets ────────'],
    ['Net PP&E',                  ...vals('netPPE')],
    ['Goodwill',                  ...vals('goodwill')],
    ['Total Assets',              ...vals('totalAssets')],
    [],
    ['── Liabilities ───────────────'],
    ['Accounts Payable',          ...vals('accountsPayable')],
    ['Current Debt',              ...vals('currentDebt')],
    ['Total Current Liabilities', ...vals('totalCurrentLiab')],
    ['Long-Term Debt',            ...vals('longTermDebt')],
    ['Total Liabilities',         ...vals('totalLiabilities')],
    [],
    ['── Equity ────────────────────'],
    ['Common Equity',             ...vals('commonEquity')],
    ['Retained Earnings',         ...vals('retainedEarnings')],
    ['Total Equity',              ...vals('totalEquity')],
  ], 'Balance Sheet');

  addSheet([
    ...header('Cash Flow Statement'),
    ['── Operating ─────────────────'],
    ['Net Income',                ...vals('cfNetIncome')],
    ['Depreciation & Amort.',     ...vals('depreciationAmort')],
    ['Stock-Based Comp.',         ...vals('stockBasedComp')],
    ['Change in Working Cap.',    ...vals('changeInWorkingCap')],
    ['Cash from Operations',      ...vals('cashFromOperations')],
    [],
    ['── Investing ─────────────────'],
    ['Capital Expenditure',       ...vals('capex')],
    ['Cash from Investing',       ...vals('cashFromInvesting')],
    [],
    ['── Financing ─────────────────'],
    ['Stock Repurchase',          ...vals('stockRepurchase')],
    ['Dividends Paid',            ...vals('dividendsPaid')],
    ['Cash from Financing',       ...vals('cashFromFinancing')],
    [],
    ['Net Change in Cash',        ...vals('netChangeInCash')],
    ['Beginning Cash',            ...vals('beginningCash')],
    ['Ending Cash',               ...vals('endingCash')],
    [],
    ['── Free Cash Flow ────────────'],
    ['Free Cash Flow',            ...vals('freeCashFlow')],
  ], 'Cash Flow Statement');

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

// FILE: server/src/services/financials.service.ts
// DATA SOURCE: yahoo-finance2 v3 — fundamentalsTimeSeries
// NOTE: Since Nov 2024, incomeStatementHistory / balanceSheetHistory /
//       cashflowStatementHistory return almost no data.
//       fundamentalsTimeSeries with module:'all' is the correct replacement.

import yahooFinance from 'yahoo-finance2';
import * as XLSX from 'xlsx';
import { prisma } from '../config/database';

const DELAY = (ms: number) => new Promise(r => setTimeout(r, ms));

// Safely divide to percentage; return null if denominator is zero/null
const pct = (num: number | null | undefined, den: number | null | undefined): number | null =>
  num != null && den != null && den !== 0 ? (num / den) * 100 : null;

// Convert raw Yahoo value (full units) to Millions
const toM = (v: number | null | undefined): number | null =>
  v != null && !isNaN(v) ? Math.round((v / 1_000_000) * 10) / 10 : null;

const asIs = (v: number | null | undefined): number | null =>
  v != null && !isNaN(v) ? v : null;

// ── Sync one company ──────────────────────────────────────────────────────────
export async function syncCompanyFinancials(
  ticker: string,
  companyId: string
): Promise<{ stored: number; error?: string }> {
  const symbol = `${ticker}.JO`;

  try {
    // fundamentalsTimeSeries with module:'all' returns income statement,
    // balance sheet and cash flow in a single array of period objects.
    // period1 = 5 years back, period2 = today, type = 'annual'
    const period1 = new Date();
    period1.setFullYear(period1.getFullYear() - 6);

    const rows = await (yahooFinance as any).fundamentalsTimeSeries(symbol, {
      period1: period1.toISOString().split('T')[0],
      type: 'annual',
      module: 'all',
    }) as any[];

    if (!rows || rows.length === 0) {
      return { stored: 0, error: `No fundamentals data returned for ${symbol}` };
    }

    // Sort ascending so i+1 is the previous year (for growth calc)
    const sorted = [...rows].sort((a: any, b: any) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let stored = 0;

    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i] as any;
      const endDate = r.date instanceof Date ? r.date : new Date(r.date);
      const fiscalYear = endDate.getFullYear();
      if (!fiscalYear || isNaN(fiscalYear)) continue;

      // ── Income Statement fields ───────────────────────────────────────────
      const rev = toM(r.totalRevenue);
      const gp  = toM(r.grossProfit);
      const oi  = toM(r.operatingIncome ?? r.EBIT);
      const ni  = toM(r.netIncome ?? r.netIncomeCommonStockholders);

      // YoY revenue growth (compare to previous year in sorted array)
      let revenueGrowthPct: number | null = null;
      if (i > 0) {
        const prevRev = toM((sorted[i - 1] as any).totalRevenue);
        if (rev != null && prevRev != null && prevRev !== 0) {
          revenueGrowthPct = ((rev - prevRev) / Math.abs(prevRev)) * 100;
        }
      }

      // EBITDA = EBIT + D&A
      const da    = toM(r.depreciationAndAmortization ?? r.reconciledDepreciation ?? r.depreciationAmortizationDepletion);
      const ebit  = toM(r.EBIT ?? r.operatingIncome);
      const ebitda = toM(r.EBITDA) ?? (ebit != null && da != null ? ebit + da : null);

      // ── Cash Flow ─────────────────────────────────────────────────────────
      const ops  = toM(r.operatingCashFlow ?? r.cashFlowFromContinuingOperatingActivities);
      const capx = toM(r.capitalExpenditure); // negative in Yahoo
      const fcf  = toM(r.freeCashFlow) ?? (
        ops != null && capx != null ? ops + capx : null
      );

      const data: any = {
        companyId,
        fiscalYear,
        period:   'annual',
        currency: 'ZAR',
        source:   'Yahoo Finance',

        // ── Income Statement ─────────────────────────────────────────────
        totalRevenues:      rev,
        revenueGrowthPct,
        costOfRevenues:     toM(r.costOfRevenue ?? r.reconciledCostOfRevenue),
        grossProfit:        gp,
        grossMarginPct:     pct(gp, rev),
        sgaExpenses:        toM(r.sellingGeneralAndAdministration),
        rdExpenses:         toM(r.researchAndDevelopment),
        operatingIncome:    oi,
        operatingMarginPct: pct(oi, rev),
        ebit,
        ebitda,
        interestExpense:    toM(r.interestExpense ?? r.interestExpenseNonOperating),
        interestIncome:     toM(r.interestIncome ?? r.interestIncomeNonOperating),
        netInterestExpense: toM(r.netNonOperatingInterestIncomeExpense ?? r.netInterestIncome),
        incomeTaxExpense:   toM(r.taxProvision),
        netIncome:          ni,
        netMarginPct:       pct(ni, rev),
        eps:                asIs(r.basicEPS),
        epsDiluted:         asIs(r.dilutedEPS),
        sharesOutstanding:  toM(r.basicAverageShares ?? r.shareIssued),
        sharesDiluted:      toM(r.dilutedAverageShares),

        // ── Balance Sheet — Assets ────────────────────────────────────────
        cashAndEquivalents:    toM(r.cashAndCashEquivalents ?? r.cashFinancial),
        shortTermInvestments:  toM(r.otherShortTermInvestments),
        totalCashAndST:        toM(r.cashCashEquivalentsAndShortTermInvestments),
        accountsReceivable:    toM(r.accountsReceivable ?? r.grossAccountsReceivable),
        otherReceivables:      toM(r.otherReceivables),
        totalReceivables:      toM(r.receivables),
        prepaidExpenses:       toM(r.prepaidAssets),
        otherCurrentAssets:    toM(r.otherCurrentAssets),
        totalCurrentAssets:    toM(r.currentAssets),
        grossPPE:              toM(r.grossPPE),
        accumulatedDeprec:     toM(r.accumulatedDepreciation),
        netPPE:                toM(r.netPPE),
        goodwill:              toM(r.goodwill),
        otherIntangibles:      toM(r.otherIntangibleAssets),
        totalIntangibles:      toM(r.goodwillAndOtherIntangibleAssets),
        otherNonCurrentAssets: toM(r.otherNonCurrentAssets),
        totalNonCurrentAssets: toM(r.totalNonCurrentAssets),
        totalAssets:           toM(r.totalAssets),

        // ── Balance Sheet — Liabilities ───────────────────────────────────
        accountsPayable:     toM(r.accountsPayable),
        accruedExpenses:     toM(r.currentAccruedExpenses ?? r.payablesAndAccruedExpenses),
        currentDebt:         toM(r.currentDebt ?? r.currentDebtAndCapitalLeaseObligation),
        currentLeases:       toM(r.currentCapitalLeaseObligation),
        unearnedRevenueCurr: toM(r.currentDeferredRevenue),
        otherCurrentLiab:    toM(r.otherCurrentLiabilities),
        totalCurrentLiab:    toM(r.currentLiabilities),
        longTermDebt:        toM(r.longTermDebt ?? r.longTermDebtAndCapitalLeaseObligation),
        longTermLeases:      toM(r.longTermCapitalLeaseObligation),
        deferredTaxLiab:     toM(r.nonCurrentDeferredTaxesLiabilities),
        otherNonCurrentLiab: toM(r.otherNonCurrentLiabilities),
        totalNonCurrentLiab: toM(r.totalNonCurrentLiabilitiesNetMinorityInterest),
        totalLiabilities:    toM(r.totalLiabilitiesNetMinorityInterest),

        // ── Balance Sheet — Equity ────────────────────────────────────────
        commonStock:       toM(r.commonStock),
        additionalPaidIn:  toM(r.additionalPaidInCapital),
        retainedEarnings:  toM(r.retainedEarnings),
        treasuryStock:     toM(r.treasuryStock),
        commonEquity:      toM(r.commonStockEquity),
        minorityInterest:  toM(r.minorityInterest),
        totalEquity:       toM(r.totalEquityGrossMinorityInterest ?? r.stockholdersEquity),

        // ── Cash Flow ─────────────────────────────────────────────────────
        cfNetIncome:        toM(r.netIncomeFromContinuingOperations ?? r.netIncome),
        depreciationAmort:  da,
        stockBasedComp:     toM(r.stockBasedCompensation),
        changeInWorkingCap: toM(r.changeInWorkingCapital),
        otherOperating:     toM(r.otherNonCashItems),
        cashFromOperations: ops,
        capex:              capx,
        acquisitions:       toM(r.purchaseOfBusiness),
        otherInvesting:     toM(r.netOtherInvestingChanges),
        cashFromInvesting:  toM(r.investingCashFlow ?? r.cashFlowFromContinuingInvestingActivities),
        debtIssued:         toM(r.issuanceOfDebt ?? r.longTermDebtIssuance),
        debtRepaid:         toM(r.repaymentOfDebt ?? r.longTermDebtPayments),
        stockIssuance:      toM(r.commonStockIssuance),
        stockRepurchase:    toM(r.repurchaseOfCapitalStock),
        dividendsPaid:      toM(r.cashDividendsPaid ?? r.commonStockDividendPaid),
        otherFinancing:     toM(r.netOtherFinancingCharges),
        cashFromFinancing:  toM(r.financingCashFlow ?? r.cashFlowFromContinuingFinancingActivities),
        netChangeInCash:    toM(r.changesInCash),
        beginningCash:      toM(r.beginningCashPosition),
        endingCash:         toM(r.endCashPosition),
        freeCashFlow:       fcf,
        freeCashFlowPerShare: ops != null && toM(r.basicAverageShares ?? r.shareIssued) != null
          ? ops / (toM(r.basicAverageShares ?? r.shareIssued) as number)
          : null,

        fetchedAt: new Date(),
        updatedAt: new Date(),
      };

      try {
        await (prisma as any).financialStatement.upsert({
          where:  { companyId_fiscalYear_period: { companyId, fiscalYear, period: 'annual' } },
          update: data,
          create: data,
        });
        stored++;
      } catch (err: any) {
        console.warn(`   ⚠️  ${ticker} FY${fiscalYear} upsert failed: ${err.message}`);
      }
    }

    if (stored > 0) {
      console.log(`   ✅ ${ticker}: ${stored} years stored (fundamentalsTimeSeries)`);
    } else {
      console.warn(`   ⚠️  ${ticker}: data fetched but nothing stored (${rows.length} rows returned)`);
    }

    return { stored };

  } catch (err: any) {
    const msg = err?.message || String(err);
    console.warn(`   ⚠️  ${ticker} financials failed: ${msg}`);
    return { stored: 0, error: msg };
  }
}

// ── Sync all active companies ─────────────────────────────────────────────────
export async function syncAllFinancials(): Promise<void> {
  const companies = await (prisma as any).company.findMany({
    where:  { isActive: true },
    select: { id: true, ticker: true },
  });

  console.log(`\n📊 Syncing financials for ${companies.length} companies (fundamentalsTimeSeries)...`);
  let success = 0, failed = 0;

  for (const c of companies as any[]) {
    await DELAY(1500); // respect Yahoo rate limits
    const result = await syncCompanyFinancials(c.ticker, c.id);
    if (result.stored > 0) success++;
    else failed++;
  }

  console.log(`✅ Financials sync done — ${success} with data, ${failed} failed/no data\n`);
}

// ── Get stored financials for the API response ────────────────────────────────
export async function getCompanyFinancials(ticker: string) {
  const company = await prisma.company.findUnique({ where: { ticker } });
  if (!company) return null;

  const rows = await (prisma as any).financialStatement.findMany({
    where:   { companyId: company.id, period: 'annual' },
    orderBy: { fiscalYear: 'asc' },
  });

  return {
    ticker,
    company:    company.name,
    currency:   (rows[0] as any)?.currency  || 'ZAR',
    source:     (rows[0] as any)?.source    || 'Yahoo Finance',
    years:      rows.map((r: any) => r.fiscalYear),
    statements: rows,
  };
}

// ── Generate Excel matching the 3-tab template ────────────────────────────────
export async function generateFinancialsExcel(
  ticker: string,
  companyName: string
): Promise<Buffer | null> {
  const company = await prisma.company.findUnique({ where: { ticker } });
  if (!company) return null;

  const rows = await (prisma as any).financialStatement.findMany({
    where:   { companyId: company.id, period: 'annual' },
    orderBy: { fiscalYear: 'asc' },
  });
  if (rows.length === 0) return null;

  const wb       = XLSX.utils.book_new();
  const years    = rows.map((r: any) => `FY${String(r.fiscalYear).slice(2)}`);
  const currency = (rows[0] as any)?.currency || 'ZAR';
  const vals     = (f: string) =>
    rows.map((r: any) => r[f] != null ? Math.round(Number(r[f]) * 10) / 10 : '');

  const header = (name: string) => [
    [`${companyName} (${ticker})`],
    [name],
    ['Source: Yahoo Finance via fundamentalsTimeSeries'],
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
    ['Cost of Revenues',           ...vals('costOfRevenues')],
    ['Gross Profit',               ...vals('grossProfit')],
    ['Gross Margin (%)',           ...vals('grossMarginPct')],
    [],
    ['── Operating ─────────────────'],
    ['SG&A Expenses',              ...vals('sgaExpenses')],
    ['R&D Expenses',               ...vals('rdExpenses')],
    ['Operating Income (EBIT)',    ...vals('operatingIncome')],
    ['Operating Margin (%)',       ...vals('operatingMarginPct')],
    ['EBITDA',                     ...vals('ebitda')],
    [],
    ['── Below the Line ────────────'],
    ['Interest Expense',           ...vals('interestExpense')],
    ['Interest Income',            ...vals('interestIncome')],
    ['Net Interest Expense',       ...vals('netInterestExpense')],
    ['Income Tax Expense',         ...vals('incomeTaxExpense')],
    [],
    ['── Bottom Line ───────────────'],
    ['Net Income',                 ...vals('netIncome')],
    ['Net Margin (%)',             ...vals('netMarginPct')],
    ['EPS (Basic)',                ...vals('eps')],
    ['EPS (Diluted)',              ...vals('epsDiluted')],
    ['Shares Outstanding (M)',     ...vals('sharesOutstanding')],
  ], 'Income Statement');

  addSheet([
    ...header('Balance Sheet'),
    ['── Current Assets ────────────'],
    ['Cash & Equivalents',         ...vals('cashAndEquivalents')],
    ['Short-Term Investments',     ...vals('shortTermInvestments')],
    ['Total Cash & ST Invest.',    ...vals('totalCashAndST')],
    ['Accounts Receivable',        ...vals('accountsReceivable')],
    ['Total Receivables',          ...vals('totalReceivables')],
    ['Prepaid Expenses',           ...vals('prepaidExpenses')],
    ['Total Current Assets',       ...vals('totalCurrentAssets')],
    [],
    ['── Non-Current Assets ────────'],
    ['Net PP&E',                   ...vals('netPPE')],
    ['Goodwill',                   ...vals('goodwill')],
    ['Total Intangibles',          ...vals('totalIntangibles')],
    ['Total Assets',               ...vals('totalAssets')],
    [],
    ['── Liabilities ───────────────'],
    ['Accounts Payable',           ...vals('accountsPayable')],
    ['Accrued Expenses',           ...vals('accruedExpenses')],
    ['Current Debt',               ...vals('currentDebt')],
    ['Total Current Liabilities',  ...vals('totalCurrentLiab')],
    ['Long-Term Debt',             ...vals('longTermDebt')],
    ['Total Non-Current Liab.',    ...vals('totalNonCurrentLiab')],
    ['Total Liabilities',          ...vals('totalLiabilities')],
    [],
    ['── Equity ────────────────────'],
    ['Common Equity',              ...vals('commonEquity')],
    ['Retained Earnings',          ...vals('retainedEarnings')],
    ['Total Equity',               ...vals('totalEquity')],
  ], 'Balance Sheet');

  addSheet([
    ...header('Cash Flow Statement'),
    ['── Operating ─────────────────'],
    ['Net Income',                 ...vals('cfNetIncome')],
    ['Depreciation & Amort.',      ...vals('depreciationAmort')],
    ['Stock-Based Comp.',          ...vals('stockBasedComp')],
    ['Change in Working Cap.',     ...vals('changeInWorkingCap')],
    ['Cash from Operations',       ...vals('cashFromOperations')],
    [],
    ['── Investing ─────────────────'],
    ['Capital Expenditure',        ...vals('capex')],
    ['Acquisitions (Net)',         ...vals('acquisitions')],
    ['Cash from Investing',        ...vals('cashFromInvesting')],
    [],
    ['── Financing ─────────────────'],
    ['Debt Issued',                ...vals('debtIssued')],
    ['Debt Repaid',                ...vals('debtRepaid')],
    ['Stock Repurchase',           ...vals('stockRepurchase')],
    ['Dividends Paid',             ...vals('dividendsPaid')],
    ['Cash from Financing',        ...vals('cashFromFinancing')],
    [],
    ['Net Change in Cash',         ...vals('netChangeInCash')],
    ['Beginning Cash',             ...vals('beginningCash')],
    ['Ending Cash',                ...vals('endingCash')],
    [],
    ['── Free Cash Flow ────────────'],
    ['Free Cash Flow',             ...vals('freeCashFlow')],
    ['FCF per Share',              ...vals('freeCashFlowPerShare')],
  ], 'Cash Flow Statement');

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

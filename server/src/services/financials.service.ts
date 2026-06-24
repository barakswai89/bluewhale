/**
 * financials.service.ts
 *
 * Fetches FY2025 financial data from Yahoo Finance and maps it to:
 *  1. Flat columns on FinancialStatement (backward-compatible, used by summary/sparklines)
 *  2. Hierarchical JSON detail (incomeStatementDetail, balanceSheetDetail, cashFlowDetail)
 *     matching Financial_Template.xlsx exactly.
 *
 * Node >=20 required (pdf-parse dependency).
 */

import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import { PrismaClient } from '@prisma/client';
import type {
  FinancialLineItem,
  IncomeStatementDetail,
  BalanceSheetDetail,
  CashFlowDetail,
} from '../types/financials.types';

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert raw Yahoo value (may be undefined/null) to millions, rounded to 2dp */
function toM(v: number | null | undefined): number | null {
  if (v == null || isNaN(v)) return null;
  return Math.round((v / 1_000_000) * 100) / 100;
}

/** Build a leaf line item */
function row(
  label: string,
  value: number | null | undefined,
  indent = 1,
  isTotal = false
): FinancialLineItem {
  return { label, value: toM(value) ?? null, indent, isTotal };
}

/** Build a total/bold row */
function total(
  label: string,
  value: number | null | undefined,
  indent = 1
): FinancialLineItem {
  return row(label, value, indent, true);
}

/** Build a section header row */
function header(label: string): FinancialLineItem {
  return { label, value: null, indent: 0, isTotal: false, isHeader: true };
}

/** Safe add — returns null if all inputs are null */
function safeAdd(...vals: (number | null)[]): number | null {
  const nums = vals.filter((v): v is number => v !== null);
  return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
}

// ─── Target fiscal year ──────────────────────────────────────────────────────
const TARGET_YEAR = 2025;

// ─── Yahoo field path ────────────────────────────────────────────────────────
type YahooAnnual = Record<string, any[]>;

function getYearVal(data: YahooAnnual, field: string, year: number): number | null {
  const series = data[field];
  if (!Array.isArray(series)) return null;
  // Yahoo returns objects with a `date` field like "2025-12-31"
  const match = series.find((entry: any) => {
    const d = entry?.asOfDate || entry?.date;
    return d && String(d).startsWith(String(year));
  });
  return match?.reportedValue?.raw ?? match?.raw ?? null;
}

// ─── Income Statement builder ────────────────────────────────────────────────

function buildIncomeStatement(ts: YahooAnnual, year: number): IncomeStatementDetail {
  const g = (field: string) => getYearVal(ts, field, year);

  const financeRevenue = g('financialServices') ?? g('totalRevenuefinancialServices');
  const insuranceRevenue = g('insurancePremiums') ?? g('totalRevenueInsurance');
  const otherRevenue = g('otherRevenue');
  const totalRevenue = g('totalRevenue');

  const cogs = g('costOfRevenue');
  const grossProfit = g('grossProfit') ?? safeAdd(totalRevenue, cogs !== null ? -cogs : null);

  const rd = g('researchAndDevelopment');
  const sga = g('sellingGeneralAndAdministration');
  const otherOpex = g('otherOperatingExpenses');
  const totalOpex = g('operatingExpense') ?? safeAdd(cogs, rd, sga, otherOpex);

  const ebit = g('operatingIncome') ?? g('ebit');
  const interestIncome = g('interestIncome');
  const interestExpense = g('interestExpense');
  const netNonOpIncome = g('totalOtherIncomeExpensesNet') ?? g('nonOperatingIncomeNetOther');
  const pretaxIncome = g('pretaxIncome');
  const taxProvision = g('incomeTaxExpense');
  const minorityInterest = g('minorityInterest');
  const netIncome = g('netIncome');
  const eps = g('basicEPS') ?? g('dilutedEPS');
  const epsDiluted = g('dilutedEPS');
  const sharesBasic = g('basicAverageShares');
  const sharesDiluted = g('dilutedAverageShares');
  const ebitda = g('EBITDA') ?? g('normalizedEBITDA');
  const da = g('depreciationAndAmortization') ?? g('reconciledDepreciation');
  const ebitdaMargin =
    totalRevenue && ebitda ? Math.round((ebitda / totalRevenue) * 10000) / 100 : null;
  const netMargin =
    totalRevenue && netIncome ? Math.round((netIncome / totalRevenue) * 10000) / 100 : null;

  const sections: FinancialLineItem[] = [
    header('REVENUE'),
    ...(financeRevenue !== null ? [row('Finance Revenue', financeRevenue, 2)] : []),
    ...(insuranceRevenue !== null ? [row('Insurance Revenue', insuranceRevenue, 2)] : []),
    ...(otherRevenue !== null ? [row('Other Revenue', otherRevenue, 2)] : []),
    total('Total Revenue', totalRevenue, 1),

    header('COST OF GOODS SOLD'),
    total('Total COGS', cogs, 1),

    header('GROSS PROFIT'),
    total('Gross Profit', grossProfit, 1),

    header('OPERATING EXPENSES'),
    row('Research & Development', rd, 2),
    row('Selling, General & Admin', sga, 2),
    row('Other Operating Expenses', otherOpex, 2),
    total('Total Operating Expenses', totalOpex, 1),

    header('OPERATING INCOME (EBIT)'),
    total('EBIT', ebit, 1),

    header('NON-OPERATING INCOME / EXPENSES'),
    row('Interest Income', interestIncome, 2),
    row('Interest Expense', interestExpense, 2),
    row('Net Non-Operating Income', netNonOpIncome, 2),

    header('PRETAX INCOME'),
    total('Pretax Income', pretaxIncome, 1),
    row('Income Tax Provision', taxProvision, 2),
    row('Minority Interest', minorityInterest, 2),

    header('NET INCOME'),
    total('Net Income', netIncome, 1),

    header('EARNINGS PER SHARE'),
    row('EPS (Basic)', eps, 2),
    row('EPS (Diluted)', epsDiluted, 2),
    row('Shares Outstanding (Basic)', sharesBasic, 2),
    row('Shares Outstanding (Diluted)', sharesDiluted, 2),

    header('PROFITABILITY'),
    row('EBITDA', ebitda, 2),
    row('D&A', da, 2),
    row('EBITDA Margin %', ebitdaMargin, 2),
    row('Net Profit Margin %', netMargin, 2),
  ];

  return { fiscalYear: year, currency: 'USD', sections };
}

// ─── Balance Sheet builder ───────────────────────────────────────────────────

function buildBalanceSheet(ts: YahooAnnual, year: number): BalanceSheetDetail {
  const g = (field: string) => getYearVal(ts, field, year);

  const cash = g('cashAndCashEquivalents');
  const stInvestments = g('shortTermInvestments');
  const tradingSecurities = g('tradingSecurities');
  const totalCashST =
    g('cashAndShortTermInvestments') ?? safeAdd(cash, stInvestments, tradingSecurities);
  const receivables = g('netReceivables');
  const inventory = g('inventory');
  const otherCurrentAssets = g('otherCurrentAssets');
  const totalCurrentAssets = g('totalCurrentAssets');

  const ppe = g('netPPE') ?? g('propertyPlantEquipmentNet');
  const goodwill = g('goodwill');
  const intangibles = g('intangibleAssets');
  const ltInvestments = g('longTermInvestments');
  const otherLtAssets = g('otherLongTermAssets') ?? g('otherAssets');
  const totalAssets = g('totalAssets');

  const apPayable = g('accountsPayable');
  const stDebt = g('shortTermDebt') ?? g('currentDebtAndCapitalLeaseObligation');
  const deferredRevCurr = g('deferredRevenue');
  const otherCurrentLiab = g('otherCurrentLiabilities');
  const totalCurrentLiab = g('totalCurrentLiabilities');

  const ltDebt = g('longTermDebt') ?? g('longTermDebtAndCapitalLeaseObligation');
  const deferredRevLt = g('deferredRevenueNonCurrent');
  const deferredTax = g('deferredTaxLiabilitiesNonCurrent');
  const otherLtLiab = g('otherLiabilitiesNonCurrent') ?? g('otherNonCurrentLiabilities');
  const totalLiabilities = g('totalLiabilitiesNetMinorityInterest');

  const commonStock = g('commonStock');
  const retainedEarnings = g('retainedEarnings');
  const aoci = g('accumulatedOtherComprehensiveIncome') ?? g('otherComprehensiveIncome');
  const treasury = g('treasuryStock') ?? g('treasurySharesNumber');
  const totalEquity =
    g('totalStockholdersEquity') ?? g('stockholdersEquity') ?? g('commonStockEquity');

  const sections: FinancialLineItem[] = [
    header('CURRENT ASSETS'),
    {
      label: 'Total Cash & ST Investments',
      value: toM(totalCashST),
      indent: 1,
      isTotal: true,
      children: [
        row('Cash & Equivalents', cash, 2),
        row('Short-Term Investments', stInvestments, 2),
        row('Trading Securities', tradingSecurities, 2),
      ],
    },
    row('Total Receivables', receivables, 1),
    row('Inventory', inventory, 1),
    row('Other Current Assets', otherCurrentAssets, 1),
    total('Total Current Assets', totalCurrentAssets, 1),

    header('NON-CURRENT ASSETS'),
    row('Net PP&E', ppe, 1),
    row('Goodwill', goodwill, 1),
    row('Intangible Assets', intangibles, 1),
    row('Long-Term Investments', ltInvestments, 1),
    row('Other Long-Term Assets', otherLtAssets, 1),
    total('Total Assets', totalAssets, 1),

    header('CURRENT LIABILITIES'),
    row('Accounts Payable', apPayable, 1),
    row('Short-Term Debt', stDebt, 1),
    row('Deferred Revenue (Current)', deferredRevCurr, 1),
    row('Other Current Liabilities', otherCurrentLiab, 1),
    total('Total Current Liabilities', totalCurrentLiab, 1),

    header('NON-CURRENT LIABILITIES'),
    row('Long-Term Debt', ltDebt, 1),
    row('Deferred Revenue (Non-Current)', deferredRevLt, 1),
    row('Deferred Tax Liabilities', deferredTax, 1),
    row('Other Non-Current Liabilities', otherLtLiab, 1),
    total('Total Liabilities', totalLiabilities, 1),

    header('SHAREHOLDERS\' EQUITY'),
    row('Common Stock & APIC', commonStock, 1),
    row('Retained Earnings', retainedEarnings, 1),
    row('Accumulated OCI', aoci, 1),
    row('Treasury Stock', treasury, 1),
    total('Total Equity', totalEquity, 1),
  ];

  return { fiscalYear: year, currency: 'USD', sections };
}

// ─── Cash Flow builder ───────────────────────────────────────────────────────

function buildCashFlow(ts: YahooAnnual, year: number): CashFlowDetail {
  const g = (field: string) => getYearVal(ts, field, year);

  const netIncome = g('netIncome');
  const da = g('depreciationAndAmortization') ?? g('reconciledDepreciation');
  const sbc = g('stockBasedCompensation');
  const deferredTaxCF = g('deferredIncomeTax');
  const changeAR = g('changeInReceivables') ?? g('changesInAccountReceivables');
  const changeInv = g('changeInInventory');
  const changeAP = g('changeInAccountPayable') ?? g('changeInPayable');
  const changeOther = g('changeInOtherWorkingCapital') ?? g('otherNonCashItems');
  const cfo = g('operatingCashflow') ?? g('totalCashFromOperatingActivities');

  const capex = g('capitalExpenditure') ?? g('capitalExpenditures');
  const acquisitions = g('acquisitionsNet');
  const ltInvPurchases = g('purchasesOfInvestments');
  const ltInvSales = g('salesMaturitiesOfInvestments');
  const otherInvesting = g('otherInvestingActivites') ?? g('otherInvestingCashFlowItems');
  const cfi = g('investingCashFlow') ?? g('totalCashflowsFromInvestingActivities');

  const debtIssued = g('issuanceOfDebt') ?? g('proceedsFromIssuanceOfDebt');
  const debtRepaid = g('repaymentOfDebt') ?? g('repaymentsOfDebt');
  const stockIssued = g('commonStockIssued') ?? g('proceedsFromStockOptionsExercised');
  const buybacks = g('repurchaseOfCapitalStock') ?? g('commonStockRepurchased');
  const dividends = g('dividendsPaid') ?? g('cashDividendsPaid');
  const otherFinancing = g('otherFinancingActivites') ?? g('otherFinancingCashFlowItems');
  const cff = g('financingCashFlow') ?? g('totalCashFromFinancingActivities');

  const forex = g('effectOfForexChangesOnCash') ?? g('effectOfExchangeRateChanges');
  const netChange = g('changesInCash') ?? g('netChangeInCash');
  const beginCash = g('beginPeriodCashFlow') ?? g('cashAtBeginningOfPeriod');
  const endCash = g('endPeriodCashFlow') ?? g('cashAtEndOfPeriod');
  const fcf = cfo !== null && capex !== null ? cfo + capex : null; // capex is usually negative

  const sections: FinancialLineItem[] = [
    header('NET INCOME'),
    total('Net Income', netIncome, 1),

    header('CASH FROM OPERATIONS'),
    row('Depreciation & Amortization', da, 2),
    row('Stock-Based Compensation', sbc, 2),
    row('Deferred Income Tax', deferredTaxCF, 2),
    row('Change in Accounts Receivable', changeAR, 2),
    row('Change in Inventories', changeInv, 2),
    row('Change in Accounts Payable', changeAP, 2),
    row('Change in Other Working Capital', changeOther, 2),
    total('Total Cash from Operations', cfo, 1),

    header('CASH FROM INVESTING'),
    row('Capital Expenditures', capex, 2),
    row('Acquisitions (Net)', acquisitions, 2),
    row('Purchases of LT Investments', ltInvPurchases, 2),
    row('Sales/Maturities of LT Investments', ltInvSales, 2),
    row('Other Investing Activities', otherInvesting, 2),
    total('Total Cash from Investing', cfi, 1),

    header('CASH FROM FINANCING'),
    row('Debt Issued', debtIssued, 2),
    row('Debt Repaid', debtRepaid, 2),
    row('Common Stock Issued', stockIssued, 2),
    row('Stock Buybacks', buybacks, 2),
    row('Dividends Paid', dividends, 2),
    row('Other Financing Activities', otherFinancing, 2),
    total('Total Cash from Financing', cff, 1),

    header('NET CHANGE IN CASH'),
    row('Effect of Forex on Cash', forex, 2),
    total('Net Change in Cash', netChange, 1),
    row('Beginning Cash Balance', beginCash, 2),
    row('Ending Cash Balance', endCash, 2),
    total('Free Cash Flow', fcf, 1),
  ];

  return { fiscalYear: year, currency: 'USD', sections };
}

// ─── Main service function ───────────────────────────────────────────────────

export async function syncCompanyFinancials(ticker: string, companyId: string): Promise<void> {
  console.log(`[financials] Syncing ${ticker} FY${TARGET_YEAR}...`);

  let ts: YahooAnnual;
  try {
    const result = await yahooFinance.fundamentalsTimeSeries(ticker, {
      module: 'annualTotalRevenue,annualGrossProfit,annualOperatingIncome,annualNetIncome,annualEbitda,annualBasicEPS,annualDilutedEPS,annualBasicAverageShares,annualDilutedAverageShares,annualCostOfRevenue,annualResearchAndDevelopment,annualSellingGeneralAndAdministration,annualOtherOperatingExpenses,annualOperatingExpense,annualInterestIncome,annualInterestExpense,annualTotalOtherIncomeExpensesNet,annualPretaxIncome,annualIncomeTaxExpense,annualMinorityInterest,annualTotalAssets,annualTotalLiabilitiesNetMinorityInterest,annualTotalStockholdersEquity,annualCashAndCashEquivalents,annualShortTermInvestments,annualTotalCurrentAssets,annualTotalCurrentLiabilities,annualLongTermDebt,annualRetainedEarnings,annualNetPPE,annualGoodwill,annualIntangibleAssets,annualAccountsPayable,annualOperatingCashflow,annualCapitalExpenditure,annualInvestingCashFlow,annualFinancingCashFlow,annualFreeCashFlow,annualStockBasedCompensation,annualDepreciationAndAmortization,annualChangeInReceivables,annualChangeInInventory,annualChangeInAccountPayable',
      type: 'annual',
      period1: `${TARGET_YEAR - 1}-01-01`,
      period2: `${TARGET_YEAR}-12-31`,
    });
    ts = result as unknown as YahooAnnual;
  } catch (err) {
    console.error(`[financials] Yahoo fetch failed for ${ticker}:`, err);
    return;
  }

  const g = (field: string) => getYearVal(ts, field, TARGET_YEAR);

  // Build hierarchical detail JSON
  const incomeStatementDetail = buildIncomeStatement(ts, TARGET_YEAR);
  const balanceSheetDetail = buildBalanceSheet(ts, TARGET_YEAR);
  const cashFlowDetail = buildCashFlow(ts, TARGET_YEAR);

  // Flat fields (backward-compatible with existing summary endpoints)
  const flatData = {
    fiscalYear: TARGET_YEAR,
    currency: 'USD',

    // Income Statement flat
    totalRevenue: toM(g('totalRevenue')),
    grossProfit: toM(g('grossProfit')),
    operatingIncome: toM(g('operatingIncome') ?? g('ebit')),
    netIncome: toM(g('netIncome')),
    ebitda: toM(g('EBITDA') ?? g('normalizedEBITDA')),
    eps: toM(g('dilutedEPS')),
    researchAndDevelopment: toM(g('researchAndDevelopment')),
    sellingGeneralAdmin: toM(g('sellingGeneralAndAdministration')),
    interestExpense: toM(g('interestExpense')),
    taxProvision: toM(g('incomeTaxExpense')),

    // Balance Sheet flat
    totalAssets: toM(g('totalAssets')),
    totalLiabilities: toM(g('totalLiabilitiesNetMinorityInterest')),
    totalEquity: toM(g('totalStockholdersEquity') ?? g('commonStockEquity')),
    cashAndEquivalents: toM(g('cashAndCashEquivalents')),
    shortTermInvestments: toM(g('shortTermInvestments')),
    totalCurrentAssets: toM(g('totalCurrentAssets')),
    totalCurrentLiabilities: toM(g('totalCurrentLiabilities')),
    longTermDebt: toM(g('longTermDebt') ?? g('longTermDebtAndCapitalLeaseObligation')),
    retainedEarnings: toM(g('retainedEarnings')),

    // Cash Flow flat
    operatingCashFlow: toM(g('operatingCashflow') ?? g('totalCashFromOperatingActivities')),
    capitalExpenditures: toM(g('capitalExpenditure') ?? g('capitalExpenditures')),
    freeCashFlow: (() => {
      const cfo = g('operatingCashflow') ?? g('totalCashFromOperatingActivities');
      const capex = g('capitalExpenditure') ?? g('capitalExpenditures');
      return cfo !== null && capex !== null ? toM(cfo + capex) : null;
    })(),
    investingCashFlow: toM(g('investingCashFlow') ?? g('totalCashflowsFromInvestingActivities')),
    financingCashFlow: toM(g('financingCashFlow') ?? g('totalCashFromFinancingActivities')),
    dividendsPaid: toM(g('dividendsPaid') ?? g('cashDividendsPaid')),
    stockRepurchase: toM(g('repurchaseOfCapitalStock') ?? g('commonStockRepurchased')),

    // Hierarchical detail (new JSON columns)
    incomeStatementDetail: incomeStatementDetail as object,
    balanceSheetDetail: balanceSheetDetail as object,
    cashFlowDetail: cashFlowDetail as object,
  };

  const existing = await prisma.financialStatement.findFirst({
    where: { companyId, fiscalYear: TARGET_YEAR },
    select: { id: true },
  });
  if (existing) {
    await prisma.financialStatement.update({
      where: { id: existing.id },
      data: flatData,
    });
  } else {
    await prisma.financialStatement.create({
      data: { companyId, ...flatData },
    });
  }

  console.log(`[financials] ✓ ${ticker} FY${TARGET_YEAR} saved.`);
}

/** Sync all companies in the database */
export async function syncAllFinancials(): Promise<void> {
  const companies = await prisma.company.findMany({ select: { id: true, ticker: true } });
  console.log(`[financials] Starting sync for ${companies.length} companies...`);

  for (const company of companies) {
    try {
      await syncCompanyFinancials(company.ticker, company.id);
    } catch (err) {
      console.error(`[financials] Failed for ${company.ticker}:`, err);
    }
  }

  console.log('[financials] Sync complete.');
  await prisma.$disconnect();
}

/**
 * getCompanyFinancials — fetch stored financial statements for a company.
 * Used by financials.controller.ts
 */
export async function getCompanyFinancials(companyId: string) {
  return prisma.financialStatement.findMany({
    where: { companyId },
    orderBy: { fiscalYear: 'desc' },
  });
}

/**
 * generateFinancialsExcel — stub kept for controller compatibility.
 * Returns null; implement xlsx generation here if needed.
 */
export async function generateFinancialsExcel(companyId: string): Promise<Buffer | null> {
  // Placeholder — implement with exceljs/xlsx if Excel export is needed
  console.warn(`[financials] generateFinancialsExcel called for ${companyId} — not yet implemented`);
  return null;
}

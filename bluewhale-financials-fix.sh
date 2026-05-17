#!/usr/bin/env bash
# ================================================================
# BlueWhale — Financial Statements Fix
# 1. Switch data source: FMP → Yahoo Finance quoteSummary (free, JSE-covered)
# 2. Explicitly add Financials tab to CompanyProfilePage.tsx
# Run from: /mnt/c/users/hp/documents/sargotec/bluewhale/bluewhale-prd/
# ================================================================
set -e
echo ""
echo "🐋 BlueWhale Financials Fix — Yahoo Finance data + Financials tab"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. UPDATED FINANCIALS SERVICE — Yahoo Finance quoteSummary ──────
echo "📝 Writing financials.service.ts (Yahoo Finance source)..."
cat > server/src/services/financials.service.ts << 'EOF'
// FILE: server/src/services/financials.service.ts
// DATA SOURCE: Yahoo Finance quoteSummary (free, no API key, JSE-covered)
// FMP was replaced — free plan blocks all JSE fundamental data (403 on all tickers)
// Yahoo Finance v10/quoteSummary returns 4–5 years of annual IS/BS/CF data

import axios from 'axios';
import * as XLSX from 'xlsx';
import { prisma } from '../config/database';

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};
const DELAY = (ms: number) => new Promise(r => setTimeout(r, ms));

// Safely extract a raw numeric value from Yahoo Finance field objects
// Yahoo returns e.g. { raw: 12345678, fmt: "12.3M" } or null
const raw = (v: any): number | null =>
  v && typeof v === 'object' && v.raw != null && !isNaN(Number(v.raw))
    ? Number(v.raw) / 1_000_000   // Convert to Millions to match the NFLX template
    : null;

const rawFull = (v: any): number | null =>
  v && typeof v === 'object' && v.raw != null && !isNaN(Number(v.raw))
    ? Number(v.raw)               // Keep as-is (for per-share, ratios)
    : null;

const pctOf = (num: number | null, den: number | null): number | null =>
  num != null && den != null && den !== 0 ? (num / den) * 100 : null;

// ── Map Yahoo Finance income statement row ─────────────────────────
function mapIS(d: any, fy: number) {
  const rev = raw(d.totalRevenue);
  const gp  = raw(d.grossProfit);
  const oi  = raw(d.ebit)          ?? raw(d.operatingIncome);
  const ni  = raw(d.netIncome);
  const ebitda = raw(d.ebitda);
  return {
    fiscalYear:          fy,
    totalRevenues:       rev,
    costOfRevenues:      raw(d.costOfRevenue),
    grossProfit:         gp,
    grossMarginPct:      pctOf(gp, rev),
    sgaExpenses:         raw(d.sellingGeneralAdministrative),
    rdExpenses:          raw(d.researchDevelopment),
    operatingIncome:     oi,
    operatingMarginPct:  pctOf(oi, rev),
    interestExpense:     raw(d.interestExpense),
    incomeTaxExpense:    raw(d.incomeTaxExpense),
    netIncome:           ni,
    netMarginPct:        pctOf(ni, rev),
    ebit:                oi,
    ebitda:              ebitda,
  };
}

// ── Map Yahoo Finance balance sheet row ────────────────────────────
function mapBS(d: any) {
  const cash = raw(d.cash);
  const sti  = raw(d.shortTermInvestments);
  return {
    cashAndEquivalents:   cash,
    shortTermInvestments: sti,
    totalCashAndST:       raw(d.totalCash) ?? (cash != null && sti != null ? cash + sti : cash),
    accountsReceivable:   raw(d.netReceivables),
    totalReceivables:     raw(d.netReceivables),
    prepaidExpenses:      raw(d.prepaidExpenses),
    otherCurrentAssets:   raw(d.otherCurrentAssets),
    totalCurrentAssets:   raw(d.totalCurrentAssets),
    netPPE:               raw(d.propertyPlantEquipment),
    goodwill:             raw(d.goodWill),
    otherIntangibles:     raw(d.intangibleAssets),
    totalIntangibles:     raw(d.goodWill) != null || raw(d.intangibleAssets) != null
                          ? (raw(d.goodWill) ?? 0) + (raw(d.intangibleAssets) ?? 0)
                          : null,
    totalAssets:          raw(d.totalAssets),
    accountsPayable:      raw(d.accountsPayable),
    accruedExpenses:      raw(d.accrualExpenses),
    currentDebt:          raw(d.shortLongTermDebt),
    unearnedRevenueCurr:  raw(d.deferredRevenue),
    otherCurrentLiab:     raw(d.otherCurrentLiab),
    totalCurrentLiab:     raw(d.totalCurrentLiabilities),
    longTermDebt:         raw(d.longTermDebt),
    otherNonCurrentLiab:  raw(d.otherLiab),
    totalLiabilities:     raw(d.totalLiab),
    commonStock:          raw(d.commonStock),
    additionalPaidIn:     raw(d.additionalPaidInCapital),
    retainedEarnings:     raw(d.retainedEarnings),
    treasuryStock:        raw(d.treasuryStock),
    commonEquity:         raw(d.totalStockholderEquity),
    totalEquity:          raw(d.totalStockholderEquity),
  };
}

// ── Map Yahoo Finance cash flow row ───────────────────────────────
function mapCF(d: any) {
  const ops  = raw(d.totalCashFromOperatingActivities);
  const capx = raw(d.capitalExpenditures);
  const fcf  = ops != null && capx != null ? ops + capx : null; // capex is negative in Yahoo
  return {
    cfNetIncome:        raw(d.netIncome),
    depreciationAmort:  raw(d.depreciation),
    stockBasedComp:     raw(d.stockBasedCompensation),
    changeInWorkingCap: raw(d.changeInWorkingCapital),
    cashFromOperations: ops,
    capex:              capx,
    cashFromInvesting:  raw(d.totalCashflowsFromInvestingActivities),
    debtRepaid:         raw(d.repaymentOfDebt),
    stockRepurchase:    raw(d.repurchaseOfStock),
    dividendsPaid:      raw(d.dividendsPaid),
    cashFromFinancing:  raw(d.totalCashFromFinancingActivities),
    netChangeInCash:    raw(d.changeInCash),
    beginningCash:      raw(d.beginPeriodCashFlow),
    endingCash:         raw(d.endPeriodCashFlow),
    freeCashFlow:       fcf,
  };
}

// ── Fetch from Yahoo Finance quoteSummary ─────────────────────────
async function fetchYahooFinancials(ticker: string): Promise<{
  is: any[], bs: any[], cf: any[]
} | null> {
  const symbol = `${ticker}.JO`;
  try {
    const { data } = await axios.get(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}`,
      {
        params: {
          modules: 'incomeStatementHistory,balanceSheetHistory,cashflowStatementHistory',
        },
        headers: YAHOO_HEADERS,
        timeout: 20000,
      }
    );

    const result = data?.quoteSummary?.result?.[0];
    if (!result) return null;

    const is = result.incomeStatementHistory?.incomeStatementHistory || [];
    const bs = result.balanceSheetHistory?.balanceSheetHistory || [];
    const cf = result.cashflowStatementHistory?.cashflowStatementHistory || [];

    return { is, bs, cf };
  } catch (err: any) {
    // Fallback: try v11 if v10 fails
    if (err.response?.status === 401 || err.response?.status === 403) {
      try {
        const { data } = await axios.get(
          `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}`,
          {
            params: {
              modules: 'incomeStatementHistory,balanceSheetHistory,cashflowStatementHistory',
            },
            headers: YAHOO_HEADERS,
            timeout: 20000,
          }
        );
        const result = data?.quoteSummary?.result?.[0];
        if (!result) return null;
        return {
          is: result.incomeStatementHistory?.incomeStatementHistory || [],
          bs: result.balanceSheetHistory?.balanceSheetHistory || [],
          cf: result.cashflowStatementHistory?.cashflowStatementHistory || [],
        };
      } catch { return null; }
    }
    return null;
  }
}

// ── Sync financials for one company ───────────────────────────────
export async function syncCompanyFinancials(
  ticker: string,
  companyId: string
): Promise<{ stored: number; error?: string }> {

  const fetched = await fetchYahooFinancials(ticker);
  if (!fetched || fetched.is.length === 0) {
    return { stored: 0, error: `No fundamental data available for ${ticker}` };
  }

  const { is, bs, cf } = fetched;
  let stored = 0;

  for (let i = 0; i < is.length; i++) {
    const isRow = is[i];
    const bsRow = bs[i] || {};
    const cfRow = cf[i] || {};

    // Yahoo returns Unix timestamp for fiscal year end date
    const dateTs   = isRow.endDate?.raw;
    const fiscalYear = dateTs ? new Date(dateTs * 1000).getFullYear() : null;
    if (!fiscalYear) continue;

    const data: any = {
      companyId,
      fiscalYear,
      period:   'annual',
      currency: 'ZAR',
      source:   'Yahoo Finance',
      ...mapIS(isRow, fiscalYear),
      ...mapBS(bsRow),
      ...mapCF(cfRow),
      fetchedAt: new Date(),
      updatedAt: new Date(),
    };

    // Compute YoY revenue growth against previous year
    if (i < is.length - 1 && is[i + 1]) {
      const prevRev = raw(is[i + 1].totalRevenue);
      const currRev = data.totalRevenues;
      if (prevRev && currRev && prevRev !== 0) {
        data.revenueGrowthPct = ((currRev - prevRev) / Math.abs(prevRev)) * 100;
      }
    }

    try {
      await (prisma as any).financialStatement.upsert({
        where:  { companyId_fiscalYear_period: { companyId, fiscalYear, period: 'annual' } },
        update: data,
        create: data,
      });
      stored++;
    } catch (err: any) {
      console.warn(`   ⚠️  ${ticker} FY${fiscalYear}: ${err.message}`);
    }
  }

  if (stored > 0) {
    console.log(`   ✅ ${ticker}: ${stored} years of financials stored (Yahoo Finance)`);
  } else {
    console.warn(`   ⚠️  ${ticker}: data fetched but nothing stored`);
  }

  return { stored };
}

// ── Sync all companies ─────────────────────────────────────────────
export async function syncAllFinancials(): Promise<void> {
  const companies = await prisma.company.findMany({
    where:  { isActive: true },
    select: { id: true, ticker: true },
  });

  console.log(`\n📊 Syncing financial statements for ${companies.length} companies (Yahoo Finance)...`);
  let success = 0, failed = 0;

  for (const c of companies) {
    await DELAY(500);
    const result = await syncCompanyFinancials(c.ticker, c.id);
    if (result.stored > 0) success++;
    else failed++;
  }

  console.log(`✅ Financials sync done — ${success} with data, ${failed} no data\n`);
}

// ── Get stored financials for API ─────────────────────────────────
export async function getCompanyFinancials(ticker: string) {
  const company = await prisma.company.findUnique({ where: { ticker } });
  if (!company) return null;

  const rows = await (prisma as any).financialStatement.findMany({
    where:   { companyId: company.id, period: 'annual' },
    orderBy: { fiscalYear: 'asc' },
  });

  return {
    ticker,
    company:  company.name,
    currency: rows[0]?.currency || 'ZAR',
    source:   rows[0]?.source   || 'Yahoo Finance',
    years:    rows.map((r: any) => r.fiscalYear),
    statements: rows,
  };
}

// ── Generate Excel matching NFLX template ─────────────────────────
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

  const wb      = XLSX.utils.book_new();
  const years   = rows.map((r: any) => `FY${String(r.fiscalYear).slice(2)}`);
  const currency = rows[0]?.currency || 'ZAR';

  const vals = (field: string) =>
    rows.map((r: any) => r[field] != null ? Math.round(Number(r[field]) * 10) / 10 : '');

  const buildHeader = (name: string) => [
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
    ...buildHeader('Income Statement'),
    ['── Revenues ──────────────────'],
    ['Total Revenues',            ...vals('totalRevenues')],
    ['YoY Revenue Growth (%)',    ...vals('revenueGrowthPct')],
    ['Cost of Revenues',         ...vals('costOfRevenues')],
    ['Gross Profit',              ...vals('grossProfit')],
    ['Gross Margin (%)',          ...vals('grossMarginPct')],
    [],
    ['── Operating ─────────────────'],
    ['SG&A Expenses',            ...vals('sgaExpenses')],
    ['R&D Expenses',             ...vals('rdExpenses')],
    ['Operating Income (EBIT)',  ...vals('operatingIncome')],
    ['Operating Margin (%)',     ...vals('operatingMarginPct')],
    ['EBITDA',                   ...vals('ebitda')],
    [],
    ['── Below the Line ────────────'],
    ['Interest Expense',         ...vals('interestExpense')],
    ['Income Tax Expense',       ...vals('incomeTaxExpense')],
    [],
    ['── Bottom Line ───────────────'],
    ['Net Income',               ...vals('netIncome')],
    ['Net Margin (%)',           ...vals('netMarginPct')],
  ], 'Income Statement');

  addSheet([
    ...buildHeader('Balance Sheet'),
    ['── Current Assets ────────────'],
    ['Cash & Equivalents',        ...vals('cashAndEquivalents')],
    ['Short-Term Investments',    ...vals('shortTermInvestments')],
    ['Total Cash & ST',           ...vals('totalCashAndST')],
    ['Accounts Receivable',       ...vals('accountsReceivable')],
    ['Prepaid Expenses',          ...vals('prepaidExpenses')],
    ['Other Current Assets',      ...vals('otherCurrentAssets')],
    ['Total Current Assets',      ...vals('totalCurrentAssets')],
    [],
    ['── Non-Current Assets ────────'],
    ['Net PP&E',                  ...vals('netPPE')],
    ['Goodwill',                  ...vals('goodwill')],
    ['Total Intangibles',         ...vals('totalIntangibles')],
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
    ...buildHeader('Cash Flow Statement'),
    ['── Operating ─────────────────'],
    ['Net Income',               ...vals('cfNetIncome')],
    ['Depreciation & Amort.',    ...vals('depreciationAmort')],
    ['Stock-Based Comp.',        ...vals('stockBasedComp')],
    ['Change in Working Cap.',   ...vals('changeInWorkingCap')],
    ['Cash from Operations',     ...vals('cashFromOperations')],
    [],
    ['── Investing ─────────────────'],
    ['Capital Expenditure',      ...vals('capex')],
    ['Cash from Investing',      ...vals('cashFromInvesting')],
    [],
    ['── Financing ─────────────────'],
    ['Debt Repaid',              ...vals('debtRepaid')],
    ['Stock Repurchase',         ...vals('stockRepurchase')],
    ['Dividends Paid',           ...vals('dividendsPaid')],
    ['Cash from Financing',      ...vals('cashFromFinancing')],
    [],
    ['Net Change in Cash',       ...vals('netChangeInCash')],
    ['Beginning Cash',           ...vals('beginningCash')],
    ['Ending Cash',              ...vals('endingCash')],
    [],
    ['── Free Cash Flow ────────────'],
    ['Free Cash Flow',           ...vals('freeCashFlow')],
  ], 'Cash Flow Statement');

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
EOF
echo "   ✅ financials.service.ts updated (Yahoo Finance source)"

# ── 2. UPDATE CompanyProfilePage.tsx — explicit Financials tab ──────
echo "📝 Adding Financials tab to CompanyProfilePage.tsx..."
python3 << 'PYEOF'
path = 'client/src/pages/CompanyProfilePage.tsx'
content = open(path).read()

changed = False

# Add FinancialsTab import if missing
if 'FinancialsTab' not in content:
    content = content.replace(
        "import CompanyReports from '../components/CompanyReports';",
        "import CompanyReports from '../components/CompanyReports';\nimport FinancialsTab from '../components/FinancialsTab';"
    )
    changed = True
    print('   ✅ FinancialsTab import added')
else:
    print('   ℹ️  FinancialsTab import already present')

# Fix the activeTab type — handle both possible spellings
if "'overview' | 'news' | 'reports'" in content and 'financials' not in content:
    content = content.replace(
        "'overview' | 'news' | 'reports'",
        "'overview' | 'news' | 'reports' | 'financials'"
    )
    changed = True
    print('   ✅ activeTab type updated')

# Add the Financials tab button — find the Reports button and add after it
if "['reports'" in content and "'💹 Financials'" not in content:
    content = content.replace(
        "['reports', '📄 Reports'],",
        "['reports', '📄 Reports'],\n              ['financials', '💹 Financials'],"
    )
    # Also handle the tuple-form used in the map
    content = content.replace(
        "['reports','📄 Reports'],",
        "['reports','📄 Reports'],\n              ['financials','💹 Financials'],"
    )
    changed = True
    print('   ✅ Financials tab button added')

# Add the Financials tab content panel
if 'activeTab === \'financials\'' not in content and 'activeTab === "financials"' not in content:
    # Find the Reports panel and insert Financials before it
    reports_panel = """{/* ── Reports"""
    if reports_panel in content:
        content = content.replace(
            reports_panel,
            """{/* ── Financials ────────────────────────────────────────────────── */}
            {activeTab === 'financials' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <FinancialsTab ticker={company.ticker} companyName={company.name} />
              </div>
            )}

            {/* ── Reports"""
        )
        changed = True
        print('   ✅ Financials panel added before Reports panel')
    else:
        # Fallback: add before the closing </div> of the tabs area
        # Find the last activeTab panel and add after it
        content = content.replace(
            "{activeTab === 'reports' && (",
            """{activeTab === 'financials' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <FinancialsTab ticker={company.ticker} companyName={company.name} />
              </div>
            )}
            {activeTab === 'reports' && ("""
        )
        changed = True
        print('   ✅ Financials panel added (fallback pattern)')

if changed:
    open(path, 'w').write(content)
    print('   ✅ CompanyProfilePage.tsx saved')
else:
    print('   ℹ️  No changes needed to CompanyProfilePage.tsx')

# Verify the tab is present
if "'💹 Financials'" in content or "💹 Financials" in content:
    print('   ✅ VERIFIED: Financials tab is present in CompanyProfilePage.tsx')
else:
    print('   ❌ WARNING: Financials tab NOT found after patching — check manually')
PYEOF

# ── 3. VERIFY ────────────────────────────────────────────────────────
echo ""
echo "🔍 Verifying..."
grep -c "FinancialsTab" client/src/pages/CompanyProfilePage.tsx && echo "   ✅ FinancialsTab referenced in CompanyProfilePage" || echo "   ❌ FinancialsTab NOT found"
grep -c "financials" client/src/pages/CompanyProfilePage.tsx && echo "   ✅ financials tab wired" || echo "   ❌ financials tab NOT wired"

# ── 4. PUSH SERVER ───────────────────────────────────────────────────
echo ""
echo "🚀 Pushing server (Yahoo Finance financials service)..."
cd server
git add -A
git commit -m "fix: switch financials data source FMP → Yahoo Finance quoteSummary (FMP free plan blocks all JSE fundamentals)"
git push
cd ..

# ── 5. PUSH CLIENT ───────────────────────────────────────────────────
echo ""
echo "🚀 Pushing client (Financials tab)..."
cd client
git add -A
git commit -m "fix: add Financials tab to CompanyProfilePage (tab was missing due to patch failure)"
git push
cd ..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Financials fix deployed!"
echo ""
echo "   💾 Data source:  Yahoo Finance quoteSummary (free, JSE-covered)"
echo "   📋 Coverage:     ~30-40 of 50 JSE companies expected to have data"
echo "   📅 Sync:         On startup + every Sunday 04:00"
echo "   🖥️  UI:           💹 Financials tab now visible on company profile"
echo ""
echo "After deploy watch for lines like:"
echo "   ✅ MTN: 4 years of financials stored (Yahoo Finance)"
echo "   ✅ SOL: 4 years of financials stored (Yahoo Finance)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

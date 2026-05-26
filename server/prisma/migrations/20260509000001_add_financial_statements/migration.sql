-- CreateTable: FinancialStatement (standalone financial data feature)
-- Stores annual Income Statement, Balance Sheet, and Cash Flow per company.
-- No existing tables are modified.
CREATE TABLE "FinancialStatement" (
    "id"                   TEXT NOT NULL,
    "companyId"            TEXT NOT NULL,
    "fiscalYear"           INTEGER NOT NULL,
    "period"               TEXT NOT NULL DEFAULT 'annual',
    "currency"             TEXT NOT NULL DEFAULT 'ZAR',
    "source"               TEXT NOT NULL DEFAULT 'FMP',
    -- Income Statement
    "totalRevenues"        DOUBLE PRECISION,
    "revenueGrowthPct"     DOUBLE PRECISION,
    "costOfRevenues"       DOUBLE PRECISION,
    "grossProfit"          DOUBLE PRECISION,
    "grossMarginPct"       DOUBLE PRECISION,
    "sgaExpenses"          DOUBLE PRECISION,
    "rdExpenses"           DOUBLE PRECISION,
    "operatingIncome"      DOUBLE PRECISION,
    "operatingMarginPct"   DOUBLE PRECISION,
    "interestExpense"      DOUBLE PRECISION,
    "interestIncome"       DOUBLE PRECISION,
    "netInterestExpense"   DOUBLE PRECISION,
    "incomeTaxExpense"     DOUBLE PRECISION,
    "netIncome"            DOUBLE PRECISION,
    "netMarginPct"         DOUBLE PRECISION,
    "eps"                  DOUBLE PRECISION,
    "epsDiluted"           DOUBLE PRECISION,
    "sharesOutstanding"    DOUBLE PRECISION,
    "sharesDiluted"        DOUBLE PRECISION,
    "ebitda"               DOUBLE PRECISION,
    "ebit"                 DOUBLE PRECISION,
    -- Balance Sheet Assets
    "cashAndEquivalents"   DOUBLE PRECISION,
    "shortTermInvestments" DOUBLE PRECISION,
    "totalCashAndST"       DOUBLE PRECISION,
    "accountsReceivable"   DOUBLE PRECISION,
    "otherReceivables"     DOUBLE PRECISION,
    "totalReceivables"     DOUBLE PRECISION,
    "prepaidExpenses"      DOUBLE PRECISION,
    "otherCurrentAssets"   DOUBLE PRECISION,
    "totalCurrentAssets"   DOUBLE PRECISION,
    "grossPPE"             DOUBLE PRECISION,
    "accumulatedDeprec"    DOUBLE PRECISION,
    "netPPE"               DOUBLE PRECISION,
    "goodwill"             DOUBLE PRECISION,
    "otherIntangibles"     DOUBLE PRECISION,
    "totalIntangibles"     DOUBLE PRECISION,
    "otherNonCurrentAssets" DOUBLE PRECISION,
    "totalNonCurrentAssets" DOUBLE PRECISION,
    "totalAssets"          DOUBLE PRECISION,
    -- Balance Sheet Liabilities
    "accountsPayable"      DOUBLE PRECISION,
    "accruedExpenses"      DOUBLE PRECISION,
    "currentDebt"          DOUBLE PRECISION,
    "currentLeases"        DOUBLE PRECISION,
    "unearnedRevenueCurr"  DOUBLE PRECISION,
    "otherCurrentLiab"     DOUBLE PRECISION,
    "totalCurrentLiab"     DOUBLE PRECISION,
    "longTermDebt"         DOUBLE PRECISION,
    "longTermLeases"       DOUBLE PRECISION,
    "deferredTaxLiab"      DOUBLE PRECISION,
    "otherNonCurrentLiab"  DOUBLE PRECISION,
    "totalNonCurrentLiab"  DOUBLE PRECISION,
    "totalLiabilities"     DOUBLE PRECISION,
    -- Balance Sheet Equity
    "commonStock"          DOUBLE PRECISION,
    "additionalPaidIn"     DOUBLE PRECISION,
    "retainedEarnings"     DOUBLE PRECISION,
    "treasuryStock"        DOUBLE PRECISION,
    "otherEquity"          DOUBLE PRECISION,
    "commonEquity"         DOUBLE PRECISION,
    "minorityInterest"     DOUBLE PRECISION,
    "totalEquity"          DOUBLE PRECISION,
    -- Cash Flow
    "cfNetIncome"          DOUBLE PRECISION,
    "depreciationAmort"    DOUBLE PRECISION,
    "stockBasedComp"       DOUBLE PRECISION,
    "changeInWorkingCap"   DOUBLE PRECISION,
    "otherOperating"       DOUBLE PRECISION,
    "cashFromOperations"   DOUBLE PRECISION,
    "capex"                DOUBLE PRECISION,
    "acquisitions"         DOUBLE PRECISION,
    "otherInvesting"       DOUBLE PRECISION,
    "cashFromInvesting"    DOUBLE PRECISION,
    "debtIssued"           DOUBLE PRECISION,
    "debtRepaid"           DOUBLE PRECISION,
    "stockIssuance"        DOUBLE PRECISION,
    "stockRepurchase"      DOUBLE PRECISION,
    "dividendsPaid"        DOUBLE PRECISION,
    "otherFinancing"       DOUBLE PRECISION,
    "cashFromFinancing"    DOUBLE PRECISION,
    "netChangeInCash"      DOUBLE PRECISION,
    "beginningCash"        DOUBLE PRECISION,
    "endingCash"           DOUBLE PRECISION,
    "freeCashFlow"         DOUBLE PRECISION,
    "freeCashFlowPerShare" DOUBLE PRECISION,
    -- Meta
    "fetchedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialStatement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialStatement_companyId_fiscalYear_period_key"
    ON "FinancialStatement"("companyId", "fiscalYear", "period");
CREATE INDEX "FinancialStatement_companyId_idx"
    ON "FinancialStatement"("companyId");

-- AddForeignKey
ALTER TABLE "FinancialStatement"
    ADD CONSTRAINT "FinancialStatement_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

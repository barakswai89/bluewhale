-- Migration: Add hierarchical financial detail JSON columns to FinancialStatement
-- These store the full template-structured line-item tree for FY2025.
-- Existing flat columns are untouched (backward compatible).

ALTER TABLE "FinancialStatement"
  ADD COLUMN IF NOT EXISTS "incomeStatementDetail" JSONB,
  ADD COLUMN IF NOT EXISTS "balanceSheetDetail"    JSONB,
  ADD COLUMN IF NOT EXISTS "cashFlowDetail"        JSONB;

/**
 * Client-side types for hierarchical financial statements.
 * Must stay in sync with server/src/types/financials.types.ts
 */

export interface FinancialLineItem {
  label: string;
  value: number | null;
  indent: number;       // 0 = section header, 1 = top-level, 2 = indented child
  isTotal: boolean;
  isHeader?: boolean;
  children?: FinancialLineItem[];
}

export interface StatementDetail {
  fiscalYear: number;
  currency: string;
  sections: FinancialLineItem[];
}

export interface FinancialDetailData {
  incomeStatementDetail?: StatementDetail;
  balanceSheetDetail?: StatementDetail;
  cashFlowDetail?: StatementDetail;
  // Flat fields still present on the API response (used as fallback)
  fiscalYear?: number;
  totalRevenue?: number | null;
  netIncome?: number | null;
  totalAssets?: number | null;
  operatingCashFlow?: number | null;
}

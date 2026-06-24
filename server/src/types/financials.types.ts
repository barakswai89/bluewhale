/**
 * Shared types for hierarchical financial statement line items.
 * These mirror the Financial_Template.xlsx structure exactly:
 *   Section → Parent row (bold, isTotal) → Child rows (indented)
 */

export interface FinancialLineItem {
  /** Display label exactly as in the template */
  label: string;
  /** Value in millions USD, null if not available */
  value: number | null;
  /** Indent depth: 0 = section header, 1 = top-level row, 2 = indented child */
  indent: number;
  /** True for section totals / bold rows (e.g. "Total Revenue", "Net Income") */
  isTotal: boolean;
  /** True for section header rows (e.g. "INCOME STATEMENT") */
  isHeader?: boolean;
  /** Child line items nested under this row */
  children?: FinancialLineItem[];
}

export interface IncomeStatementDetail {
  fiscalYear: number;
  currency: string;
  sections: FinancialLineItem[];
}

export interface BalanceSheetDetail {
  fiscalYear: number;
  currency: string;
  sections: FinancialLineItem[];
}

export interface CashFlowDetail {
  fiscalYear: number;
  currency: string;
  sections: FinancialLineItem[];
}

export interface FinancialStatementDetail {
  incomeStatement: IncomeStatementDetail;
  balanceSheet: BalanceSheetDetail;
  cashFlow: CashFlowDetail;
}

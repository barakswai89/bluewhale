/**
 * FinancialsTab.tsx
 *
 * Renders Income Statement, Balance Sheet, and Cash Flow line items
 * for the most recent fiscal year, reading directly from the flat
 * FinancialStatement schema (revenue, ebitda, cash, debt, etc.)
 */

import React, { useState } from 'react';

// ─── Types matching the flat schema returned by the API ────────────────────

export interface FlatFinancialYear {
  fiscalYear: number;
  currency: string;
  revenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingExpenses: number | null;
  ebitda: number | null;
  ebit: number | null;
  interestExpense: number | null;
  taxExpense: number | null;
  netIncome: number | null;
  totalAssets: number | null;
  currentAssets: number | null;
  totalLiabilities: number | null;
  currentLiabilities: number | null;
  totalEquity: number | null;
  cash: number | null;
  debt: number | null;
  operatingCashFlow: number | null;
  investingCashFlow: number | null;
  financingCashFlow: number | null;
  freeCashFlow: number | null;
  eps: number | null;
  dividendPerShare: number | null;
}

interface FinancialsTabProps {
  // Array of yearly statements (e.g. from /financials/:ticker/summary -> years)
  years: FlatFinancialYear[] | null | undefined;
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

function fmtMoney(value: number | null): string {
  if (value === null || value === undefined) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(2)}B`;
  return `${sign}$${abs.toFixed(1)}M`;
}

function fmtPerShare(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return `$${value.toFixed(2)}`;
}

// ─── Row definitions per statement ──────────────────────────────────────────

interface RowDef {
  label: string;
  key: keyof FlatFinancialYear;
  isTotal?: boolean;
  isPerShare?: boolean;
}

const INCOME_ROWS: RowDef[] = [
  { label: 'Revenue', key: 'revenue', isTotal: true },
  { label: 'Cost of Revenue', key: 'costOfRevenue' },
  { label: 'Gross Profit', key: 'grossProfit', isTotal: true },
  { label: 'Operating Expenses', key: 'operatingExpenses' },
  { label: 'EBITDA', key: 'ebitda' },
  { label: 'EBIT (Operating Income)', key: 'ebit', isTotal: true },
  { label: 'Interest Expense', key: 'interestExpense' },
  { label: 'Tax Expense', key: 'taxExpense' },
  { label: 'Net Income', key: 'netIncome', isTotal: true },
  { label: 'EPS', key: 'eps', isPerShare: true },
  { label: 'Dividend Per Share', key: 'dividendPerShare', isPerShare: true },
];

const BALANCE_ROWS: RowDef[] = [
  { label: 'Cash & Equivalents', key: 'cash' },
  { label: 'Current Assets', key: 'currentAssets' },
  { label: 'Total Assets', key: 'totalAssets', isTotal: true },
  { label: 'Current Liabilities', key: 'currentLiabilities' },
  { label: 'Total Debt', key: 'debt' },
  { label: 'Total Liabilities', key: 'totalLiabilities', isTotal: true },
  { label: 'Total Equity', key: 'totalEquity', isTotal: true },
];

const CASHFLOW_ROWS: RowDef[] = [
  { label: 'Operating Cash Flow', key: 'operatingCashFlow', isTotal: true },
  { label: 'Investing Cash Flow', key: 'investingCashFlow' },
  { label: 'Financing Cash Flow', key: 'financingCashFlow' },
  { label: 'Free Cash Flow', key: 'freeCashFlow', isTotal: true },
];

// ─── Statement table ─────────────────────────────────────────────────────────

function StatementTable({ rows, year, title }: { rows: RowDef[]; year: FlatFinancialYear; title: string }) {
  return (
    <div style={{
      background: '#0f1e38',
      borderRadius: '12px',
      border: '1px solid #1e3a5f',
      overflow: 'hidden',
      marginBottom: '24px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 20px',
        borderBottom: '1px solid #1e3a5f',
        background: '#0d1a30',
      }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#e2e8f0' }}>{title}</span>
        <span style={{
          fontSize: '0.75rem',
          color: '#64748b',
          background: '#1a2744',
          padding: '3px 10px',
          borderRadius: '20px',
        }}>
          FY{year.fiscalYear} · {year.currency} (Millions)
        </span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <colgroup>
          <col style={{ width: '65%' }} />
          <col style={{ width: '35%' }} />
        </colgroup>
        <tbody>
          {rows.map((row, i) => {
            const value = year[row.key] as number | null;
            return (
              <tr
                key={row.key}
                style={{
                  borderBottom: row.isTotal ? '1px solid #1e3a5f' : 'none',
                  background: row.isTotal ? 'rgba(30,58,95,0.3)' : 'transparent',
                }}
              >
                <td style={{
                  padding: '8px 16px',
                  fontWeight: row.isTotal ? 700 : 400,
                  fontSize: '0.875rem',
                  color: row.isTotal ? '#e2e8f0' : '#94a3b8',
                }}>
                  {row.label}
                </td>
                <td style={{
                  padding: '8px 20px 8px 8px',
                  textAlign: 'right',
                  fontWeight: row.isTotal ? 700 : 400,
                  fontSize: '0.875rem',
                  fontVariantNumeric: 'tabular-nums',
                  color: value !== null && value < 0 ? '#f87171' : row.isTotal ? '#e2e8f0' : '#94a3b8',
                }}>
                  {row.isPerShare ? fmtPerShare(value) : fmtMoney(value)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
      <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📊</div>
      <div style={{ fontSize: '0.9rem' }}>No financial data available.</div>
    </div>
  );
}

// ─── Tab switcher ────────────────────────────────────────────────────────────

type TabKey = 'income' | 'balance' | 'cashflow';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'income', label: 'Income Statement' },
  { key: 'balance', label: 'Balance Sheet' },
  { key: 'cashflow', label: 'Cash Flow' },
];

// ─── Main component ──────────────────────────────────────────────────────────

export default function FinancialsTab({ years }: FinancialsTabProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('income');

  if (!years || years.length === 0) {
    return <EmptyState />;
  }

  // Most recent fiscal year (years is sorted ascending from the API)
  const latest = years[years.length - 1];

  const tabStyle = (key: TabKey): React.CSSProperties => ({
    padding: '8px 18px',
    borderRadius: '8px',
    fontSize: '0.825rem',
    fontWeight: activeTab === key ? 600 : 400,
    cursor: 'pointer',
    border: 'none',
    background: activeTab === key ? '#1d4ed8' : 'transparent',
    color: activeTab === key ? '#ffffff' : '#64748b',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '24px',
        background: '#0d1a30',
        padding: '4px',
        borderRadius: '10px',
        width: 'fit-content',
      }}>
        {TABS.map(tab => (
          <button key={tab.key} style={tabStyle(tab.key)} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'income' && <StatementTable rows={INCOME_ROWS} year={latest} title="Income Statement" />}
      {activeTab === 'balance' && <StatementTable rows={BALANCE_ROWS} year={latest} title="Balance Sheet" />}
      {activeTab === 'cashflow' && <StatementTable rows={CASHFLOW_ROWS} year={latest} title="Cash Flow Statement" />}
    </div>
  );
}

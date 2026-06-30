/**
 * FinancialsTab.tsx
 *
 * Self-contained component: fetches its own data by ticker from
 * /financials/:ticker/summary and renders Income Statement,
 * Balance Sheet, and Cash Flow for the most recent fiscal year.
 *
 * Usage: <FinancialsTab ticker={company.ticker} companyName={company.name} />
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'https://bluewhale-production.up.railway.app/api/v1';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// ─── Types matching the flat schema returned by the API ────────────────────

interface FlatFinancialYear {
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
  ticker: string;
  companyName?: string;
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
    <div className="bg-slate-950/40 border border-slate-800 rounded-xl overflow-hidden mb-6">
      <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-800 bg-slate-900/60">
        <span className="font-bold text-sm text-slate-100">{title}</span>
        <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
          FY{year.fiscalYear} · {year.currency} (Millions)
        </span>
      </div>

      <table className="w-full border-collapse">
        <colgroup>
          <col style={{ width: '65%' }} />
          <col style={{ width: '35%' }} />
        </colgroup>
        <tbody>
          {rows.map((row) => {
            const value = year[row.key] as number | null;
            return (
              <tr
                key={row.key}
                className={row.isTotal ? 'border-b border-slate-800 bg-slate-800/30' : ''}
              >
                <td className={`px-4 py-2 text-sm ${row.isTotal ? 'font-bold text-slate-100' : 'text-slate-400'}`}>
                  {row.label}
                </td>
                <td
                  className={`px-5 py-2 text-right text-sm tabular-nums ${
                    value !== null && value < 0
                      ? 'text-red-400'
                      : row.isTotal
                      ? 'font-bold text-slate-100'
                      : 'text-slate-400'
                  }`}
                >
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

// ─── Tab switcher ────────────────────────────────────────────────────────────

type TabKey = 'income' | 'balance' | 'cashflow';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'income', label: 'Income Statement' },
  { key: 'balance', label: 'Balance Sheet' },
  { key: 'cashflow', label: 'Cash Flow' },
];

// ─── Main component ──────────────────────────────────────────────────────────

export default function FinancialsTab({ ticker, companyName }: FinancialsTabProps) {
  const [years, setYears] = useState<FlatFinancialYear[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('income');

  const fetchFinancials = useCallback(async () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/financials/${ticker.toUpperCase()}/summary`, {
        headers: authH(),
      });
      const data = await res.json();
      if (data.success && data.data?.years?.length > 0) {
        setYears(data.data.years);
      } else {
        setYears(null);
        setError(data.message || 'No financial data available.');
      }
    } catch {
      setError('Could not load financial data.');
      setYears(null);
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    fetchFinancials();
  }, [fetchFinancials]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        <p className="text-slate-400 text-sm">Loading financials{companyName ? ` for ${companyName}` : ''}...</p>
      </div>
    );
  }

  if (error || !years || years.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-slate-700" />
        <p className="text-sm">{error || 'No financial data available.'}</p>
      </div>
    );
  }

  // years is sorted ascending by fiscalYear from the API — take the latest
  const latest = years[years.length - 1];

  return (
    <div>
      <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1 w-fit mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
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

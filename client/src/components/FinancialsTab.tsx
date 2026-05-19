// FILE: client/src/components/FinancialsTab.tsx
// STANDALONE — Displays Income Statement, Balance Sheet, Cash Flow
// in the same 3-tab structure as the NFLX Excel template.
// Download button exports the exact Excel template format.

import { useState, useEffect } from 'react';
import {
  Download, RefreshCw, TrendingUp, Building2,
  DollarSign, AlertCircle, Loader2, BarChart2
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'https://bluewhale-production.up.railway.app/api/v1';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

interface FinancialRow {
  label: string;
  field: string;
  indent?: boolean;
  bold?: boolean;
  separator?: boolean;
  percent?: boolean;
}

// ── Column definitions matching the Excel template ─────────────────
const IS_ROWS: FinancialRow[] = [
  { label: 'Total Revenues',           field: 'totalRevenues',       bold: true },
  { label: 'YoY Revenue Growth (%)',   field: 'revenueGrowthPct',    percent: true, indent: true },
  { label: 'Cost of Revenues',         field: 'costOfRevenues',      indent: true },
  { label: 'Gross Profit',             field: 'grossProfit',         bold: true },
  { label: 'Gross Margin (%)',         field: 'grossMarginPct',      percent: true, indent: true },
  { separator: true, label: '', field: '' },
  { label: 'SG&A Expenses',           field: 'sgaExpenses',         indent: true },
  { label: 'R&D Expenses',            field: 'rdExpenses',          indent: true },
  { label: 'Operating Income (EBIT)', field: 'operatingIncome',     bold: true },
  { label: 'Operating Margin (%)',    field: 'operatingMarginPct',  percent: true, indent: true },
  { label: 'EBITDA',                  field: 'ebitda',              indent: true },
  { separator: true, label: '', field: '' },
  { label: 'Interest Expense',        field: 'interestExpense',     indent: true },
  { label: 'Interest Income',         field: 'interestIncome',      indent: true },
  { label: 'Net Interest Expense',    field: 'netInterestExpense',  indent: true },
  { label: 'Income Tax Expense',      field: 'incomeTaxExpense',    indent: true },
  { separator: true, label: '', field: '' },
  { label: 'Net Income',             field: 'netIncome',            bold: true },
  { label: 'Net Margin (%)',         field: 'netMarginPct',         percent: true, indent: true },
  { label: 'EPS (Basic)',            field: 'eps',                  indent: true },
  { label: 'EPS (Diluted)',          field: 'epsDiluted',           indent: true },
  { label: 'Shares Outstanding (M)', field: 'sharesOutstanding',   indent: true },
];

const BS_ROWS: FinancialRow[] = [
  { label: '── ASSETS ──',              field: '',                    bold: true },
  { label: 'Cash & Cash Equivalents',  field: 'cashAndEquivalents',  indent: true },
  { label: 'Short-Term Investments',   field: 'shortTermInvestments',indent: true },
  { label: 'Total Cash & ST Invest.',  field: 'totalCashAndST',      bold: true },
  { label: 'Accounts Receivable',      field: 'accountsReceivable',  indent: true },
  { label: 'Total Receivables',        field: 'totalReceivables',    indent: true },
  { label: 'Prepaid Expenses',         field: 'prepaidExpenses',     indent: true },
  { label: 'Total Current Assets',     field: 'totalCurrentAssets',  bold: true },
  { separator: true, label: '', field: '' },
  { label: 'Net PP&E',                 field: 'netPPE',              indent: true },
  { label: 'Goodwill',                 field: 'goodwill',            indent: true },
  { label: 'Total Intangibles',        field: 'totalIntangibles',    indent: true },
  { label: 'Total Assets',            field: 'totalAssets',          bold: true },
  { separator: true, label: '', field: '' },
  { label: '── LIABILITIES ──',         field: '',                    bold: true },
  { label: 'Accounts Payable',         field: 'accountsPayable',     indent: true },
  { label: 'Accrued Expenses',         field: 'accruedExpenses',     indent: true },
  { label: 'Current Debt',             field: 'currentDebt',         indent: true },
  { label: 'Total Current Liabilities',field: 'totalCurrentLiab',    bold: true },
  { label: 'Long-Term Debt',           field: 'longTermDebt',        indent: true },
  { label: 'Total Non-Current Liab.',  field: 'totalNonCurrentLiab', indent: true },
  { label: 'Total Liabilities',       field: 'totalLiabilities',     bold: true },
  { separator: true, label: '', field: '' },
  { label: '── EQUITY ──',              field: '',                    bold: true },
  { label: 'Common Equity',            field: 'commonEquity',        indent: true },
  { label: 'Retained Earnings',        field: 'retainedEarnings',    indent: true },
  { label: 'Total Equity',            field: 'totalEquity',          bold: true },
];

const CF_ROWS: FinancialRow[] = [
  { label: '── OPERATING ──',          field: '',                    bold: true },
  { label: 'Net Income',              field: 'cfNetIncome',          indent: true },
  { label: 'Depreciation & Amort.',   field: 'depreciationAmort',   indent: true },
  { label: 'Stock-Based Comp.',       field: 'stockBasedComp',      indent: true },
  { label: 'Change in Working Cap.',  field: 'changeInWorkingCap',  indent: true },
  { label: 'Cash from Operations',   field: 'cashFromOperations',   bold: true },
  { separator: true, label: '', field: '' },
  { label: '── INVESTING ──',          field: '',                    bold: true },
  { label: 'Capital Expenditure',     field: 'capex',               indent: true },
  { label: 'Acquisitions (Net)',      field: 'acquisitions',        indent: true },
  { label: 'Cash from Investing',    field: 'cashFromInvesting',    bold: true },
  { separator: true, label: '', field: '' },
  { label: '── FINANCING ──',          field: '',                    bold: true },
  { label: 'Debt Issued',             field: 'debtIssued',          indent: true },
  { label: 'Debt Repaid',             field: 'debtRepaid',          indent: true },
  { label: 'Stock Repurchase',        field: 'stockRepurchase',     indent: true },
  { label: 'Dividends Paid',          field: 'dividendsPaid',       indent: true },
  { label: 'Cash from Financing',    field: 'cashFromFinancing',    bold: true },
  { separator: true, label: '', field: '' },
  { label: 'Net Change in Cash',     field: 'netChangeInCash',      bold: true },
  { label: 'Beginning Cash',         field: 'beginningCash',        indent: true },
  { label: 'Ending Cash',            field: 'endingCash',           indent: true },
  { separator: true, label: '', field: '' },
  { label: '── FREE CASH FLOW ──',     field: '',                    bold: true },
  { label: 'Free Cash Flow',         field: 'freeCashFlow',         bold: true },
  { label: 'FCF per Share',          field: 'freeCashFlowPerShare', indent: true },
];

// ── Format cell value ──────────────────────────────────────────────
function fmt(v: any, isPercent = false, field = ''): string {
  if (v == null || v === '') return '—';
  const num = Number(v);
  if (isNaN(num)) return '—';
  if (isPercent) return `${num.toFixed(1)}%`;
  // Per-share fields
  if (field.toLowerCase().includes('eps') || field.toLowerCase().includes('pershare'))
    return num.toFixed(2);
  // Millions formatting
  if (Math.abs(num) >= 1000) return num.toLocaleString('en-ZA', { maximumFractionDigits: 0 });
  return num.toFixed(1);
}

// ── Cell colour by value (green positive, red negative) ───────────
function cellColor(v: any, field: string): string {
  if (v == null || field.includes('Expense') || field.includes('Repaid') ||
      field.includes('capex') || field === 'costOfRevenues') return '';
  const num = Number(v);
  if (isNaN(num) || num === 0) return '';
  return num > 0 ? 'text-green-400' : 'text-red-400';
}

interface Props { ticker: string; companyName: string; }

export default function FinancialsTab({ ticker, companyName }: Props) {
  const [data,         setData]         = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [syncing,      setSyncing]      = useState(false);
  const [downloading,  setDownloading]  = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [activeSheet,  setActiveSheet]  = useState<'is' | 'bs' | 'cf'>('is');

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/financials/${ticker.toUpperCase()}`, { headers: authH() });
      const json = await res.json();
      if (json.success && json.data?.statements?.length > 0) setData(json.data);
      else setData(null);
    } catch { setError('Could not load financial data.'); }
    finally  { setLoading(false); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch(`${API}/financials/${ticker.toUpperCase()}/sync`, {
        method: 'POST', headers: authH(),
      });
      await fetchData(); // re-fetch after sync regardless of prior state
    } catch { setError('Sync failed.'); }
    finally  { setSyncing(false); }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API}/financials/${ticker.toUpperCase()}/download`, { headers: authH() });
      if (!res.ok) { setError('No financial data to download yet. Click Sync first.'); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${ticker.toUpperCase()}_Financial_Statements.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { setError('Download failed.'); }
    finally  { setDownloading(false); }
  };

  useEffect(() => { fetchData(); }, [ticker]);

  const statements = data?.statements || [];
  const years      = statements.map((r: any) => `FY${String(r.fiscalYear).slice(2)}`);
  const currency   = data?.currency || 'ZAR';
  const rows       = activeSheet === 'is' ? IS_ROWS : activeSheet === 'bs' ? BS_ROWS : CF_ROWS;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-cyan-400" />
            Financial Statements
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Source: Yahoo Finance · Currency: {currency} Millions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition active:scale-95">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
          <button onClick={handleDownload} disabled={downloading || !data}
            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 rounded-lg text-sm font-medium transition active:scale-95">
            <Download className="w-4 h-4" />
            {downloading ? 'Generating...' : 'Download Excel'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 text-red-300 text-sm p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      )}

      {!loading && !data && (
        <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700">
          <DollarSign className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 mb-1">No financial statements yet for {ticker}</p>
          <p className="text-slate-500 text-sm mb-4">
            FMP may not cover this JSE ticker, or data hasn't been synced.
          </p>
          <button onClick={handleSync} disabled={syncing}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-sm font-medium transition">
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Sheet tabs */}
          <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
            {([
              ['is', '📈 Income Statement', TrendingUp],
              ['bs', '🏦 Balance Sheet',    Building2],
              ['cf', '💵 Cash Flow',        DollarSign],
            ] as const).map(([key, label]) => (
              <button key={key} onClick={() => setActiveSheet(key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeSheet === key
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Data table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700">
                  <th className="px-4 py-3 text-left font-medium text-slate-300 min-w-[220px]">
                    LINE ITEM
                  </th>
                  {years.map((y: string) => (
                    <th key={y} className="px-4 py-3 text-right font-medium text-slate-300 min-w-[90px]">
                      {y}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {rows.map((row, idx) => {
                  if (row.separator) {
                    return <tr key={idx}><td colSpan={years.length + 1} className="py-1 bg-slate-900/30" /></tr>;
                  }
                  const isSectionLabel = !row.field;
                  return (
                    <tr key={idx}
                      className={`transition ${
                        isSectionLabel
                          ? 'bg-slate-800/40'
                          : row.bold
                            ? 'bg-slate-800/20 hover:bg-slate-800/40'
                            : 'hover:bg-slate-800/20'
                      }`}
                    >
                      <td className={`px-4 py-2.5 ${row.bold ? 'font-semibold' : ''} ${row.indent ? 'pl-8 text-slate-300' : ''} ${isSectionLabel ? 'text-xs text-slate-500 uppercase tracking-wider' : ''}`}>
                        {row.label}
                      </td>
                      {!isSectionLabel && years.map((_: string, i: number) => {
                        const v = statements[i]?.[row.field];
                        return (
                          <td key={i}
                            className={`px-4 py-2.5 text-right font-mono tabular-nums ${
                              row.bold ? 'font-semibold' : 'text-slate-300'
                            } ${cellColor(v, row.field)}`}>
                            {fmt(v, row.percent, row.field)}
                          </td>
                        );
                      })}
                      {isSectionLabel && <td colSpan={years.length} />}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-600 text-right">
            {companyName} · {years[0]}–{years[years.length - 1]} · {currency} Millions · Source: Yahoo Finance
          </p>
        </>
      )}
    </div>
  );
}

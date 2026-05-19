// FILE: client/src/pages/CompanyProfilePage.tsx
// UPDATED: Added 💹 Financials tab (Income Statement, Balance Sheet, Cash Flow)

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import CompanyReports from '../components/CompanyReports';
import FinancialsTab from '../components/FinancialsTab';
import {
  ArrowUpRight, ArrowDownRight, Star, StarOff,
  Globe, Building2, BarChart2, TrendingUp,
  ChevronLeft, AlertCircle, Loader2, RefreshCw
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'https://bluewhale-production.up.railway.app/api/v1';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 200, H = 50;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none">
      <polyline
        points={pts}
        fill="none"
        stroke={positive ? '#34d399' : '#f87171'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetricTile({ label, value, suffix = '', hint }: {
  label: string; value: number | null | undefined; suffix?: string; hint?: string;
}) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4" title={hint}>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-lg font-bold">
        {value != null ? `${value.toFixed(2)}${suffix}` : '—'}
      </p>
    </div>
  );
}

export default function CompanyProfilePage() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();

  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistItemId, setWatchlistItemId] = useState<string | null>(null);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'financials'>('overview');

  const fetchCompany = useCallback(async () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/companies/ticker/${ticker.toUpperCase()}`, {
        headers: authH(),
      });
      if (res.status === 401) { navigate('/login'); return; }
      if (res.status === 404) { setError(`Company "${ticker}" not found.`); return; }
      const data = await res.json();
      if (data.success) setCompany(data.data);
      else setError(data.message || 'Failed to load company.');
    } catch {
      setError('Could not connect to server. Railway may be waking up — try again.');
    } finally {
      setLoading(false);
    }
  }, [ticker, navigate]);

  const checkWatchlist = useCallback(async () => {
    try {
      const res = await fetch(`${API}/watchlist/default`, { headers: authH() });
      const data = await res.json();
      if (data.success && data.data?.items) {
        const match = data.data.items.find(
          (item: any) => item.company.ticker === ticker?.toUpperCase()
        );
        if (match) { setInWatchlist(true); setWatchlistItemId(match.id); }
        else { setInWatchlist(false); setWatchlistItemId(null); }
      }
    } catch { /* silent */ }
  }, [ticker]);

  useEffect(() => { fetchCompany(); checkWatchlist(); }, [fetchCompany, checkWatchlist]);

  const toggleWatchlist = async () => {
    if (!company) return;
    setWatchlistLoading(true);
    try {
      if (inWatchlist && watchlistItemId) {
        await fetch(`${API}/watchlist/items/${watchlistItemId}`, {
          method: 'DELETE', headers: authH(),
        });
        setInWatchlist(false);
        setWatchlistItemId(null);
      } else {
        const res = await fetch(`${API}/watchlist/items`, {
          method: 'POST',
          headers: { ...authH(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyId: company.id }),
        });
        const data = await res.json();
        if (data.success) { setInWatchlist(true); setWatchlistItemId(data.data?.id); }
      }
    } catch { /* silent */ } finally {
      setWatchlistLoading(false);
    }
  };

  const price = company ? Number(company.lastPrice) : null;
  const chgPct = company ? Number(company.priceChangePercent) : null;
  const chgAbs = company ? Number(company.priceChange) : null;
  const positive = (chgPct ?? 0) >= 0;
  const m = company?.metrics;

  const closePrices: number[] = (company?.historicalPrices || [])
    .map((p: any) => Number(p.close || p.adjustedClose || p.price || 0))
    .filter((v: number) => v > 0)
    .slice(-90);

  const formatMarketCap = (v: number | null) => {
    if (!v) return '—';
    if (v >= 1e12) return `R ${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9)  return `R ${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6)  return `R ${(v / 1e6).toFixed(2)}M`;
    return `R ${v.toLocaleString()}`;
  };

  const sectorLabel = (s: string) =>
    s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—';

  const TABS = [
    { key: 'overview',   label: '📊 Overview'   },
    { key: 'reports',    label: '📄 Reports'     },
    { key: 'financials', label: '💹 Financials'  },
  ] as const;

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-4 transition"
        >
          <ChevronLeft className="w-4 h-4" />Back
        </button>

        {loading && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
            <p className="text-slate-400 text-sm">Loading {ticker?.toUpperCase()}...</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-red-300">{error}</p>
            <button
              onClick={fetchCompany}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition"
            >
              <RefreshCw className="w-4 h-4" />Try Again
            </button>
          </div>
        )}

        {!loading && company && (
          <div className="space-y-6">

            {/* Hero */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center font-bold text-lg shrink-0">
                    {company.ticker.slice(0, 3)}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{company.name}</h1>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-slate-400 text-sm">{company.ticker}.JO</span>
                      <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full">
                        {sectorLabel(company.sector)}
                      </span>
                      <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full">
                        {company.exchange || 'JSE'}
                      </span>
                    </div>
                    {company.description && (
                      <p className="text-slate-400 text-sm mt-2 max-w-xl leading-relaxed line-clamp-3">
                        {company.description}
                      </p>
                    )}
                    {company.website && (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 mt-2 transition"
                      >
                        <Globe className="w-3 h-3" />{company.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-3xl font-bold">
                      {price != null ? `R ${price.toFixed(2)}` : '—'}
                    </p>
                    {chgPct != null && (
                      <p className={`flex items-center justify-end gap-1 text-sm font-semibold mt-1 ${positive ? 'text-green-400' : 'text-red-400'}`}>
                        {positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {chgAbs != null ? `R ${Math.abs(chgAbs).toFixed(2)}  ` : ''}
                        ({positive ? '+' : ''}{chgPct.toFixed(2)}%)
                      </p>
                    )}
                  </div>
                  <button
                    onClick={toggleWatchlist}
                    disabled={watchlistLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                      inWatchlist
                        ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:bg-red-900/30 hover:border-red-500/50 hover:text-red-400'
                        : 'bg-slate-800 border border-slate-700 hover:border-cyan-500/50 hover:text-cyan-400'
                    }`}
                  >
                    {watchlistLoading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : inWatchlist ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                    {inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
                {[
                  { label: 'Market Cap', value: formatMarketCap(Number(company.marketCap)) },
                  { label: 'Volume',     value: company.volume ? `${(Number(company.volume) / 1000).toFixed(0)}K` : '—' },
                  { label: 'P/E Ratio',  value: m?.peRatio ? m.peRatio.toFixed(1) : '—' },
                  { label: 'Div Yield',  value: m?.dividendYield ? `${m.dividendYield.toFixed(2)}%` : '—' },
                ].map(stat => (
                  <div key={stat.label}>
                    <p className="text-xs text-slate-400">{stat.label}</p>
                    <p className="font-semibold mt-0.5">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sparkline */}
            {closePrices.length > 1 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />Price History (90 days)
                  </h3>
                  <span className={`text-sm font-semibold ${positive ? 'text-green-400' : 'text-red-400'}`}>
                    {positive ? '▲' : '▼'} {Math.abs(chgPct ?? 0).toFixed(2)}% today
                  </span>
                </div>
                <Sparkline data={closePrices} positive={positive} />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>90 days ago</span><span>Today</span>
                </div>
              </div>
            )}

            {/* Tab bar */}
            <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === key ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {m && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-cyan-400" />Valuation
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      <MetricTile label="P/E Ratio"     value={m.peRatio}        hint="Price to Earnings" />
                      <MetricTile label="P/B Ratio"     value={m.pbRatio}        hint="Price to Book" />
                      <MetricTile label="P/S Ratio"     value={m.psRatio}        hint="Price to Sales" />
                      <MetricTile label="EV/EBITDA"     value={m.evToEbitda} />
                      <MetricTile label="Div Yield"     value={m.dividendYield}  suffix="%" hint="Dividend Yield %" />
                      <MetricTile label="Debt/Equity"   value={m.debtToEquity}   hint="Debt to Equity ratio" />
                      <MetricTile label="Current Ratio" value={m.currentRatio} />
                      <MetricTile label="Quick Ratio"   value={m.quickRatio} />
                    </div>
                  </div>
                )}
                {m && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-cyan-400" />Profitability & Returns
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      <MetricTile label="Gross Margin"     value={m.grossMargin}     suffix="%" />
                      <MetricTile label="Operating Margin" value={m.operatingMargin} suffix="%" />
                      <MetricTile label="Net Margin"       value={m.netMargin}       suffix="%" />
                      <MetricTile label="ROE"              value={m.roe}             suffix="%" hint="Return on Equity" />
                      <MetricTile label="ROA"              value={m.roa}             suffix="%" hint="Return on Assets" />
                      <MetricTile label="ROIC"             value={m.roic}            suffix="%" hint="Return on Invested Capital" />
                    </div>
                  </div>
                )}
                {!m && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
                    <Building2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400">Financial metrics not yet available for {company.ticker}.</p>
                    <p className="text-slate-500 text-sm mt-1">Data is synced periodically from FMP.</p>
                  </div>
                )}
              </div>
            )}

            {/* Reports */}
            {activeTab === 'reports' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <CompanyReports ticker={company.ticker} />
              </div>
            )}

            {/* Financials — explicitly rendered, not via patch */}
            {activeTab === 'financials' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <FinancialsTab ticker={company.ticker} companyName={company.name} />
              </div>
            )}

          </div>
        )}
      </div>
    </MainLayout>
  );
}

// FILE: client/src/pages/CompanyProfilePage.tsx
// EXTENDED: Live stats panel (52wk, beta, shares), News feed (Yahoo Finance),
// atomic ZAR formatting, refresh button, lastUpdated indicator.

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import CompanyReports from '../components/CompanyReports';
import FinancialsTab from '../components/FinancialsTab';
import {
  ArrowUpRight, ArrowDownRight, Star, StarOff,
  Globe, Building2, BarChart2, TrendingUp,
  ChevronLeft, AlertCircle, Loader2, RefreshCw,
  Newspaper, Activity, Clock
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'https://bluewhale-production.up.railway.app/api/v1';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// Atomic ZAR formatter — R bound to value at serialization level.
// Returns "R20,886.00" as one string, no space, no JSX text-node split.
function formatZAR(value: number | null | undefined, decimals = 2): string {
  if (value == null || isNaN(value) || value === 0) return '—';
  return 'R' + value.toLocaleString('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatZARCap(value: number | null | undefined): string {
  if (!value || isNaN(value)) return '—';
  if (value >= 1e12) return `R${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9)  return `R${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6)  return `R${(value / 1e6).toFixed(2)}M`;
  return formatZAR(value);
}

function formatVolume(v: number | null | undefined): string {
  if (!v) return '—';
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toLocaleString();
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const W = 200, H = 50;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`
  ).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none">
      <polyline points={pts} fill="none"
        stroke={positive ? '#34d399' : '#f87171'} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function MetricTile({ label, value, suffix = '', hint }: {
  label: string; value: number | null | undefined; suffix?: string; hint?: string;
}) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4" title={hint}>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-lg font-bold font-mono">
        {value != null ? `${value.toFixed(2)}${suffix}` : '—'}
      </p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-semibold font-mono">{value}</span>
    </div>
  );
}

export default function CompanyProfilePage() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate   = useNavigate();

  const [company,          setCompany]          = useState<any>(null);
  const [liveStats,        setLiveStats]        = useState<any>(null);
  const [news,             setNews]             = useState<any[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [liveLoading,      setLiveLoading]      = useState(false);
  const [newsLoading,      setNewsLoading]      = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [inWatchlist,      setInWatchlist]      = useState(false);
  const [watchlistItemId,  setWatchlistItemId]  = useState<string | null>(null);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [activeTab,        setActiveTab]        = useState<'overview' | 'news' | 'reports' | 'financials'>('overview');
  const [lastUpdated,      setLastUpdated]      = useState<Date | null>(null);

  const fetchCompany = useCallback(async () => {
    if (!ticker) return;
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/companies/ticker/${ticker.toUpperCase()}`, { headers: authH() });
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

  const fetchLiveStats = useCallback(async () => {
    if (!ticker) return;
    setLiveLoading(true);
    try {
      const res  = await fetch(`${API}/companies/ticker/${ticker.toUpperCase()}/live`, { headers: authH() });
      const data = await res.json();
      if (data.success) { setLiveStats(data.data); setLastUpdated(new Date()); }
    } catch { /* supplementary — silent */ } finally { setLiveLoading(false); }
  }, [ticker]);

  const fetchNews = useCallback(async () => {
    if (!ticker) return;
    setNewsLoading(true);
    try {
      const res  = await fetch(`${API}/companies/ticker/${ticker.toUpperCase()}/news`, { headers: authH() });
      const data = await res.json();
      if (data.success) setNews(data.data || []);
    } catch { /* silent */ } finally { setNewsLoading(false); }
  }, [ticker]);

  const checkWatchlist = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/watchlist/default`, { headers: authH() });
      const data = await res.json();
      if (data.success && data.data?.items) {
        const match = data.data.items.find((i: any) => i.company.ticker === ticker?.toUpperCase());
        if (match) { setInWatchlist(true); setWatchlistItemId(match.id); }
        else { setInWatchlist(false); setWatchlistItemId(null); }
      }
    } catch { /* silent */ }
  }, [ticker]);

  useEffect(() => {
    fetchCompany();
    fetchLiveStats();
    fetchNews();
    checkWatchlist();
  }, [fetchCompany, fetchLiveStats, fetchNews, checkWatchlist]);

  const handleRefresh = () => {
    fetchCompany();
    fetchLiveStats();
    if (activeTab === 'news') fetchNews();
  };

  const toggleWatchlist = async () => {
    if (!company) return;
    setWatchlistLoading(true);
    try {
      if (inWatchlist && watchlistItemId) {
        await fetch(`${API}/watchlist/items/${watchlistItemId}`, { method: 'DELETE', headers: authH() });
        setInWatchlist(false); setWatchlistItemId(null);
      } else {
        const res  = await fetch(`${API}/watchlist/items`, {
          method: 'POST',
          headers: { ...authH(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyId: company.id }),
        });
        const data = await res.json();
        if (data.success) { setInWatchlist(true); setWatchlistItemId(data.data?.id); }
      }
    } catch { /* silent */ } finally { setWatchlistLoading(false); }
  };

  const price    = liveStats?.price     ?? (company ? Number(company.lastPrice)          : null);
  const chgPct   = liveStats?.changePercent ?? (company ? Number(company.priceChangePercent) : null);
  const chgAbs   = liveStats?.change    ?? (company ? Number(company.priceChange)        : null);
  const positive = (chgPct ?? 0) >= 0;
  const m        = company?.metrics;

  const closePrices: number[] = (company?.historicalPrices || [])
    .map((p: any) => Number(p.close || p.adjustedClose || 0))
    .filter((v: number) => v > 0).slice(-90);

  const sectorLabel = (s: string) =>
    s?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || '—';

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">

        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition">
            <ChevronLeft className="w-4 h-4" />Back
          </button>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />Live {timeAgo(lastUpdated.toISOString())}
              </span>
            )}
            <button onClick={handleRefresh} disabled={liveLoading}
              className="p-2 rounded-lg hover:bg-slate-800 transition" title="Refresh live data">
              <RefreshCw className={`w-4 h-4 text-slate-400 ${liveLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

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
            <button onClick={fetchCompany}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition">
              <RefreshCw className="w-4 h-4" />Try Again
            </button>
          </div>
        )}

        {!loading && company && (
          <div className="space-y-5">

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
                      {liveStats && (
                        <span className="bg-green-500/10 text-green-400 text-xs px-2 py-0.5 rounded-full border border-green-500/30">
                          ● Live
                        </span>
                      )}
                    </div>
                    {company.description && (
                      <p className="text-slate-400 text-sm mt-2 max-w-xl leading-relaxed line-clamp-3">
                        {company.description}
                      </p>
                    )}
                    {company.website && (
                      <a href={company.website} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 mt-2 transition">
                        <Globe className="w-3 h-3" />{company.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-3xl font-bold font-mono">{price != null ? formatZAR(price) : '—'}</p>
                    {chgPct != null && (
                      <p className={`flex items-center justify-end gap-1 text-sm font-semibold mt-1 ${positive ? 'text-green-400' : 'text-red-400'}`}>
                        {positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {chgAbs != null ? `${formatZAR(Math.abs(chgAbs))}  ` : ''}
                        ({positive ? '+' : ''}{chgPct.toFixed(2)}%)
                      </p>
                    )}
                  </div>
                  <button onClick={toggleWatchlist} disabled={watchlistLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                      inWatchlist
                        ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:bg-red-900/30 hover:border-red-500/50 hover:text-red-400'
                        : 'bg-slate-800 border border-slate-700 hover:border-cyan-500/50 hover:text-cyan-400'
                    }`}>
                    {watchlistLoading ? <Loader2 className="w-4 h-4 animate-spin" />
                      : inWatchlist ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                    {inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
                <div>
                  <p className="text-xs text-slate-400">Market Cap</p>
                  <p className="font-semibold font-mono mt-0.5">{formatZARCap(liveStats?.marketCap || Number(company.marketCap))}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Volume</p>
                  <p className="font-semibold mt-0.5">{formatVolume(liveStats?.volume || Number(company.volume))}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">P/E Ratio</p>
                  <p className="font-semibold mt-0.5">{liveStats?.trailingPE?.toFixed(1) || m?.peRatio?.toFixed(1) || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Div Yield</p>
                  <p className="font-semibold mt-0.5">{m?.dividendYield ? `${m.dividendYield.toFixed(2)}%` : '—'}</p>
                </div>
              </div>
            </div>

            {/* Live stats panel */}
            {liveStats && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />Live Market Data
                  <span className="text-xs text-slate-500 font-normal ml-auto">
                    {lastUpdated ? timeAgo(lastUpdated.toISOString()) : 'just now'}
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <StatRow label="Open"             value={formatZAR(liveStats.open)} />
                    <StatRow label="Day High"          value={formatZAR(liveStats.dayHigh)} />
                    <StatRow label="Day Low"           value={formatZAR(liveStats.dayLow)} />
                    <StatRow label="Prev Close"        value={formatZAR(liveStats.previousClose)} />
                    <StatRow label="Volume"            value={formatVolume(liveStats.volume)} />
                    <StatRow label="Avg Volume (3m)"   value={formatVolume(liveStats.avgVolume3m)} />
                  </div>
                  <div>
                    <StatRow label="52W High"           value={formatZAR(liveStats.fiftyTwoWeekHigh)} />
                    <StatRow label="52W Low"            value={formatZAR(liveStats.fiftyTwoWeekLow)} />
                    <StatRow label="50D Avg"            value={formatZAR(liveStats.fiftyDayAvg)} />
                    <StatRow label="200D Avg"           value={formatZAR(liveStats.twoHundredDayAvg)} />
                    <StatRow label="Shares Outstanding" value={liveStats.sharesOutstanding ? formatVolume(liveStats.sharesOutstanding) : '—'} />
                    <StatRow label="Beta"               value={liveStats.beta ? liveStats.beta.toFixed(2) : '—'} />
                  </div>
                </div>
              </div>
            )}

            {/* Sparkline */}
            {closePrices.length > 1 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />Price History (90 days)
                  </h3>
                  {liveStats && (
                    <span className="text-xs text-slate-400">
                      52W: {formatZAR(liveStats.fiftyTwoWeekLow)} – {formatZAR(liveStats.fiftyTwoWeekHigh)}
                    </span>
                  )}
                </div>
                <Sparkline data={closePrices} positive={positive} />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>90 days ago</span><span>Today</span>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
              {([['overview','📊 Overview'],['news','📰 News'],['reports','📄 Reports']] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === tab ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}>
                  {label}
                  {tab === 'news' && news.length > 0 && (
                    <span className="ml-1.5 bg-cyan-500/30 text-cyan-300 text-xs px-1.5 py-0.5 rounded-full">{news.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                {m && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-cyan-400" />Valuation
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      <MetricTile label="P/E Ratio"     value={m.peRatio}       hint="Price to Earnings" />
                      <MetricTile label="P/B Ratio"     value={m.pbRatio}       hint="Price to Book" />
                      <MetricTile label="P/S Ratio"     value={m.psRatio}       hint="Price to Sales" />
                      <MetricTile label="EV/EBITDA"     value={m.evToEbitda} />
                      <MetricTile label="Div Yield"     value={m.dividendYield} suffix="%" />
                      <MetricTile label="Debt/Equity"   value={m.debtToEquity} />
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
                      <MetricTile label="ROE"              value={m.roe}             suffix="%" />
                      <MetricTile label="ROA"              value={m.roa}             suffix="%" />
                      <MetricTile label="ROIC"             value={m.roic}            suffix="%" />
                    </div>
                  </div>
                )}
                {!m && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
                    <Building2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400">Financial metrics not yet available for {company.ticker}.</p>
                    <p className="text-slate-500 text-sm mt-1">Metrics sync runs every Sunday via FMP.</p>
                  </div>
                )}
              </div>
            )}

            {/* News */}
            {activeTab === 'news' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold flex items-center gap-2">
                    <Newspaper className="w-5 h-5 text-cyan-400" />Recent News
                  </h3>
                  <button onClick={fetchNews} disabled={newsLoading}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition">
                    <RefreshCw className={`w-3 h-3 ${newsLoading ? 'animate-spin' : ''}`} />Refresh
                  </button>
                </div>
                {newsLoading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="animate-pulse flex gap-3">
                        <div className="w-16 h-16 bg-slate-800 rounded-lg shrink-0" />
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-4 bg-slate-800 rounded w-3/4" />
                          <div className="h-3 bg-slate-800 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : news.length === 0 ? (
                  <div className="text-center py-10">
                    <Newspaper className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">No recent news found for {company.ticker}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {news.map(article => (
                      <a key={article.id} href={article.link} target="_blank" rel="noopener noreferrer"
                        className="flex gap-4 p-3 rounded-xl hover:bg-slate-800 transition group">
                        {article.thumbnail
                          ? <img src={article.thumbnail} alt="" className="w-16 h-16 object-cover rounded-lg shrink-0 bg-slate-800" />
                          : <div className="w-16 h-16 bg-slate-800 rounded-lg shrink-0 flex items-center justify-center">
                              <Newspaper className="w-6 h-6 text-slate-600" />
                            </div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm leading-snug group-hover:text-cyan-400 transition line-clamp-2">
                            {article.title}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-slate-500">{article.publisher}</span>
                            <span className="text-slate-700">·</span>
                            <span className="text-xs text-slate-500">{timeAgo(article.publishedAt)}</span>
                          </div>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 shrink-0 mt-0.5 transition" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reports */}
            {activeTab === 'financials' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <FinancialsTab ticker={company.ticker} companyName={company.name} />
              </div>
            )}
            {activeTab === 'reports' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <CompanyReports ticker={company.ticker} />
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

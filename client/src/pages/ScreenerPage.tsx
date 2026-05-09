// FILE: client/src/pages/ScreenerPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { ArrowUpDown, ArrowUp, ArrowDown, Download, Search, Star } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'https://bluewhale-production.up.railway.app/api/v1';

interface Company {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  marketCap: number;
  lastPrice: number;
  priceChangePercent: number;
  metrics: {
    peRatio: number;
    pbRatio: number;
    dividendYield: number;
    roe: number;
  } | null;
}

export default function ScreenerPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState('marketCap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');

  // ── Currency formatters ─────────────────────────────────────────────────────
  // Both functions return a single atomic string — R is bound to the value at
  // serialization level, not as a separate JSX text node. This prevents the
  // symbol from wrapping above the numeric value in narrow table cells.

  const formatZAR = (value: number, decimals = 2): string => {
    if (value == null || isNaN(value) || value === 0) return '—';
    return 'R' + value.toLocaleString('en-ZA', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatZARCap = (value: number): string => {
    if (!value || isNaN(value) || value === 0) return '—';
    if (value >= 1e12) return `R${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9)  return `R${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6)  return `R${(value / 1e6).toFixed(2)}M`;
    return 'R' + value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // ── Watchlist ───────────────────────────────────────────────────────────────
  const addToWatchlist = async (companyId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/watchlist/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companyId }),
      });
      const data = await response.json();
      if (data.success) alert('Added to watchlist!');
    } catch (error) {
      console.error('Error adding to watchlist:', error);
    }
  };

  // ── Data fetch ──────────────────────────────────────────────────────────────
  useEffect(() => { fetchCompanies(); }, [sortField, sortOrder, sectorFilter]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sortBy: sortField,
        sortOrder: sortOrder,
        ...(sectorFilter && { sector: sectorFilter }),
      });
      const response = await fetch(`${API}/companies?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setCompanies(
          data.data.companies.map((company: any) => ({
            ...company,
            marketCap:          Number(company.marketCap),
            lastPrice:          Number(company.lastPrice),
            priceChangePercent: Number(company.priceChangePercent),
            metrics: company.metrics ? {
              peRatio:       Number(company.metrics.peRatio),
              pbRatio:       Number(company.metrics.pbRatio),
              dividendYield: Number(company.metrics.dividendYield),
              roe:           Number(company.metrics.roe),
            } : null,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Sort ────────────────────────────────────────────────────────────────────
  const handleSort = (field: string) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  // ── CSV export ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Ticker', 'Company', 'Sector', 'Price', 'Change %', 'Market Cap', 'P/E', 'Div Yield'];
    const rows = filteredCompanies.map(c => [
      c.ticker,
      c.name,
      c.sector.replace(/_/g, ' '),
      formatZAR(c.lastPrice),
      `${c.priceChangePercent >= 0 ? '+' : ''}${c.priceChangePercent.toFixed(2)}%`,
      formatZARCap(c.marketCap),
      c.metrics?.peRatio?.toFixed(1) || '',
      c.metrics?.dividendYield ? `${c.metrics.dividendYield.toFixed(2)}%` : '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: 'jse-screener.csv',
    });
    a.click();
  };

  const filteredCompanies = companies.filter(
    c =>
      searchQuery === '' ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ticker.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">JSE Small-Cap Screener</h1>
            <p className="text-slate-400">Filter and analyze South African equity markets</p>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 mb-6 border border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or ticker..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <select
                value={sectorFilter}
                onChange={e => setSectorFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">All Sectors</option>
                <option value="FINANCIALS">Financials</option>
                <option value="MATERIALS">Materials</option>
                <option value="ENERGY">Energy</option>
                <option value="HEALTHCARE">Healthcare</option>
                <option value="CONSUMER_GOODS">Consumer Goods</option>
                <option value="TECHNOLOGY">Technology</option>
                <option value="TELECOMMUNICATIONS">Telecommunications</option>
                <option value="INDUSTRIALS">Industrials</option>
              </select>
              <button
                onClick={exportCSV}
                className="flex items-center justify-center space-x-2 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="mb-4 text-slate-400 text-sm">
            Showing {filteredCompanies.length} companies
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800 border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase">
                        <button onClick={() => handleSort('ticker')} className="flex items-center space-x-1">
                          <span>Ticker</span>{getSortIcon('ticker')}
                        </button>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase">Company</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase">Sector</th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-slate-300 uppercase">
                        <button onClick={() => handleSort('lastPrice')} className="flex items-center justify-end space-x-1 ml-auto">
                          <span>Price</span>{getSortIcon('lastPrice')}
                        </button>
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-slate-300 uppercase">Change %</th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-slate-300 uppercase">
                        <button onClick={() => handleSort('marketCap')} className="flex items-center justify-end space-x-1 ml-auto">
                          <span>Market Cap</span>{getSortIcon('marketCap')}
                        </button>
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-slate-300 uppercase">P/E</th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-slate-300 uppercase">Div Yield</th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-slate-300 uppercase">Watch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredCompanies.map(company => (
                      <tr
                        key={company.id}
                        onClick={() => navigate(`/company/${company.ticker}`)}
                        className="hover:bg-slate-800/50 transition cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center font-bold text-xs">
                            {company.ticker.slice(0, 4)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">{company.name}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs rounded-full bg-slate-700 text-slate-300">
                            {company.sector.replace(/_/g, ' ')}
                          </span>
                        </td>
                        {/* ✅ Atomic string — R bound at format level, no JSX text-node split */}
                        <td className="px-6 py-4 text-right font-mono font-medium whitespace-nowrap">
                          {formatZAR(company.lastPrice)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-medium ${company.priceChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {company.priceChangePercent >= 0 ? '+' : ''}{company.priceChangePercent.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono whitespace-nowrap">
                          {formatZARCap(company.marketCap)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          {company.metrics?.peRatio ? company.metrics.peRatio.toFixed(1) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          {company.metrics?.dividendYield ? `${company.metrics.dividendYield.toFixed(2)}%` : '—'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={e => { e.stopPropagation(); addToWatchlist(company.id); }}
                            className="p-2 hover:bg-cyan-500/20 rounded-lg transition"
                          >
                            <Star className="w-5 h-5 text-slate-400 hover:text-cyan-400" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

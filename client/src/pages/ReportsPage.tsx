// FILE: client/src/pages/ReportsPage.tsx
// ✅ FIX: Was an empty stub. Now calls GET /api/v1/reports with filters and pagination.

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { FileText, Search, Filter, ExternalLink, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://bluewhale-production.up.railway.app/api/v1';
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

interface Report {
  id: string;
  title: string;
  reportType: string;
  fiscalYear: number;
  publishDate: string;
  fileUrl: string;
  company: { ticker: string; name: string; sector: string };
}

interface Filters { companies: { ticker: string; name: string }[]; reportTypes: string[]; years: number[]; }

export default function ReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [filters, setFilters] = useState<Filters>({ companies: [], reportTypes: [], years: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [company, setCompany] = useState('');
  const [reportType, setReportType] = useState('');
  const [year, setYear] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchFilters = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/reports/filters`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setFilters(data.data);
    } catch { /* silent */ }
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', sortBy: 'publishDate', order: 'desc' });
      if (search) params.set('search', search);
      if (company) params.set('company', company);
      if (reportType) params.set('reportType', reportType);
      if (year) params.set('year', year);

      const res = await fetch(`${API_BASE}/reports?${params}`, { headers: authHeaders() });
      if (res.status === 401) { localStorage.removeItem('token'); navigate('/login'); return; }
      const data = await res.json();
      if (data.success) {
        setReports(data.data.reports);
        setTotalPages(data.data.pagination.totalPages);
        setTotal(data.data.pagination.total);
      } else {
        setError('Failed to load reports.');
      }
    } catch {
      setError('Could not connect to server. Railway may be waking up — try again in a moment.');
    } finally {
      setLoading(false);
    }
  }, [page, search, company, reportType, year, navigate]);

  useEffect(() => { fetchFilters(); }, [fetchFilters]);
  useEffect(() => { setPage(1); }, [search, company, reportType, year]);
  useEffect(() => { fetchReports(); }, [fetchReports]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });

  const typeColor: Record<string, string> = {
    ANNUAL: 'bg-blue-900/50 text-blue-300',
    INTERIM: 'bg-purple-900/50 text-purple-300',
    QUARTERLY: 'bg-green-900/50 text-green-300',
    RESULTS: 'bg-yellow-900/50 text-yellow-300',
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="w-7 h-7 text-cyan-400" />Company Reports
          </h1>
          <p className="text-slate-400 mt-1">JSE financial reports — annual results, interims, and SENS filings.</p>
        </div>

        {/* Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search reports..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <select value={company} onChange={e => setCompany(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
              <option value="">All Companies</option>
              {filters.companies.map(c => <option key={c.ticker} value={c.ticker}>{c.ticker} — {c.name}</option>)}
            </select>
            <select value={reportType} onChange={e => setReportType(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
              <option value="">All Report Types</option>
              {filters.reportTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={year} onChange={e => setYear(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
              <option value="">All Years</option>
              {filters.years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <p className="text-slate-400 text-sm mb-3">
          <Filter className="w-3 h-3 inline mr-1" />
          Showing {reports.length} of {total} reports
        </p>

        {error && (
          <div className="flex items-start gap-2 bg-red-900/30 border border-red-700 text-red-300 text-sm p-3 rounded-lg mb-4">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 bg-slate-900 rounded-xl border border-slate-800">
            <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">No reports match your filters.</p>
          </div>
        ) : (
          <>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-800 border-b border-slate-700">
                  <tr>
                    {['Company', 'Report', 'Type', 'Year', 'Published', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {reports.map(r => (
                    <tr key={r.id} className="hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3">
                        <button onClick={() => navigate(`/company/${r.company.ticker}`)}
                          className="font-medium text-cyan-400 hover:text-cyan-300 text-sm">
                          {r.company.ticker}
                        </button>
                        <p className="text-xs text-slate-500">{r.company.name}</p>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-xs">
                        <p className="truncate">{r.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColor[r.reportType] || 'bg-slate-700 text-slate-300'}`}>
                          {r.reportType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">{r.fiscalYear || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">{r.publishDate ? formatDate(r.publishDate) : '—'}</td>
                      <td className="px-4 py-3">
                        {r.fileUrl && (
                          <a href={r.fileUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300">
                            <ExternalLink className="w-3 h-3" />PDF
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}

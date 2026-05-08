// FILE: client/src/components/CompanyReports.tsx
// FIXED:
//   1. Added missing `useEffect` import — original only imported useState,
//      causing a runtime crash on every mount ("useEffect is not defined").
//   2. Replaced hardcoded Railway URL with VITE_API_URL env variable.
//   3. Added auth header to download requests (was missing).

import { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink, Calendar, ChevronDown } from 'lucide-react';

// ✅ FIX 2: use env variable, not hardcoded URL
const API = import.meta.env.VITE_API_URL || 'https://bluewhale-production.up.railway.app/api/v1';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

interface Report {
  id: string;
  title: string;
  reportType: string;
  fiscalYear: number;
  publishDate: string;
  fileUrl: string;
  fileName: string;
}

interface CompanyReportsProps {
  ticker: string;
}

const TYPE_COLOURS: Record<string, string> = {
  ANNUAL:    'bg-blue-900/50 text-blue-300 border-blue-700/50',
  INTERIM:   'bg-purple-900/50 text-purple-300 border-purple-700/50',
  QUARTERLY: 'bg-green-900/50 text-green-300 border-green-700/50',
  RESULTS:   'bg-yellow-900/50 text-yellow-300 border-yellow-700/50',
};

export default function CompanyReports({ ticker }: CompanyReportsProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // ✅ FIX 1: useEffect is now properly imported above
  useEffect(() => {
    fetchReports();
  }, [ticker]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/reports/company/${ticker}`, {
        headers: authH(),
      });
      const data = await res.json();
      if (data.success) setReports(data.data || []);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (reportId: string, format: 'pdf' | 'excel' | 'csv', title: string) => {
    try {
      setDownloadingId(reportId);
      setOpenDropdown(null);

      // ✅ FIX 3: auth header added to download request
      const res = await fetch(
        `${API}/reports/${reportId}/download?format=${format}`,
        { headers: authH() }
      );
      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Use a clean filename derived from the report title
      const safeName = title.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_');
      a.download = `${safeName}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download report. Please try the View button instead.');
    } finally {
      setDownloadingId(null);
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
            <div className="h-3 bg-slate-700 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (reports.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
        <FileText className="h-12 w-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">No reports available for {ticker} yet</p>
        <p className="text-slate-500 text-xs mt-1">
          Reports are scraped from official investor relations pages weekly.
        </p>
      </div>
    );
  }

  // ── Reports list ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          Official Reports
          <span className="text-slate-500 text-sm font-normal">({reports.length})</span>
        </h3>
        <a href="/reports" className="text-sm text-cyan-400 hover:text-cyan-300 transition">
          All reports →
        </a>
      </div>

      <div className="space-y-3">
        {reports.map((report, index) => {
          const typeBadge = TYPE_COLOURS[report.reportType] || 'bg-slate-700/50 text-slate-300 border-slate-600/50';
          const isDownloading = downloadingId === report.id;
          const isOpen = openDropdown === report.id;

          return (
            <div
              key={report.id}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-cyan-500/30 transition-all"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 bg-cyan-500/10 p-2.5 rounded-lg border border-cyan-500/20 mt-0.5">
                  <FileText className="h-4 w-4 text-cyan-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white text-sm mb-2 leading-snug">
                    {report.title}
                  </h4>

                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${typeBadge}`}>
                      {report.reportType}
                    </span>
                    {report.fiscalYear && (
                      <span className="text-xs text-slate-400">{report.fiscalYear}</span>
                    )}
                    {report.publishDate && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(report.publishDate).toLocaleDateString('en-ZA', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Download dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setOpenDropdown(isOpen ? null : report.id)}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {isDownloading ? 'Downloading...' : 'Download'}
                        <ChevronDown className={`h-3 w-3 transition ${isOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-20 min-w-[130px] overflow-hidden">
                          {(['pdf', 'excel', 'csv'] as const).map(fmt => (
                            <button
                              key={fmt}
                              onClick={() => handleDownload(report.id, fmt, report.title)}
                              className="w-full px-4 py-2.5 text-left text-xs text-white hover:bg-slate-700 transition flex items-center gap-2 font-medium"
                            >
                              <FileText className="h-3.5 w-3.5 text-slate-400" />
                              {fmt === 'excel' ? 'Excel (.xlsx)' : fmt === 'csv' ? 'CSV' : 'PDF'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* View original */}
                    {report.fileUrl && (
                      <a
                        href={report.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
        <p className="text-xs text-cyan-300">
          <span className="font-semibold">Download formats:</span> PDF (original source),
          Excel (structured financial data extraction), CSV (primary financial table).
        </p>
      </div>
    </div>
  );
}

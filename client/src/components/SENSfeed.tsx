import { useState, useEffect } from 'react';
import { FileText, ExternalLink, Calendar, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface SENSAnnouncement {
  date: string;
  title: string;
  url: string;
  source?: string;
}

interface SENSFeedProps {
  ticker: string;
  compact?: boolean;
}

export default function SENSFeed({ ticker, compact = false }: SENSFeedProps) {
  const [announcements, setAnnouncements] = useState<SENSAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSENS();
  }, [ticker]);

  const fetchSENS = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://bluewhale-production-afb0.up.railway.app/api/v1'}/scraper/sens/${ticker}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch SENS');

      const data = await response.json();
      setAnnouncements(data.data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('SENS fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAnnouncementType = (title: string) => {
    if (title.includes('Trading Statement') || title.includes('Results')) {
      return { icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' };
    }
    if (title.includes('Dividend')) {
      return { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' };
    }
    if (title.includes('Dealings') || title.includes('Share')) {
      return { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
    }
    return { icon: FileText, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' };
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex space-x-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="h-10 w-10 bg-slate-700 rounded-lg"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-700 rounded w-3/4"></div>
              <div className="h-3 bg-slate-700 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-medium">Failed to load announcements</p>
        </div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
        <FileText className="h-12 w-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">No recent announcements</p>
      </div>
    );
  }

  const displayAnnouncements = compact ? announcements.slice(0, 5) : announcements;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center space-x-2">
          <FileText className="w-6 h-6 text-cyan-500" />
          <span>SENS Announcements</span>
        </h3>
        <button
          onClick={fetchSENS}
          className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Announcements List */}
      <div className={`space-y-${compact ? '2' : '3'}`}>
        {displayAnnouncements.map((announcement, index) => {
          const type = getAnnouncementType(announcement.title);
          const Icon = type.icon;

          return (
            <div
              key={index}
              className={`group flex items-start gap-3 p-4 bg-gradient-to-br from-slate-900 to-slate-800 border ${type.border} rounded-xl hover:border-cyan-500/50 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-cyan-500/20 animate-fade-in`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Icon */}
              <div className={`flex-shrink-0 ${type.bg} p-2.5 rounded-lg border ${type.border}`}>
                <Icon className={`h-5 w-5 ${type.color}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className={`font-semibold text-white group-hover:text-cyan-400 transition-colors ${compact ? 'text-sm' : 'text-base'}`}>
                  {announcement.title}
                </h4>
                
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="text-xs">{announcement.date}</span>
                  </div>
                  
                  {announcement.source && announcement.source !== 'Mock' && (
                    <span className="text-xs text-slate-500">
                      • {announcement.source}
                    </span>
                  )}
                </div>
              </div>

              {/* Link Icon */}
              <div className="flex-shrink-0">
                <ExternalLink className="h-4 w-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>

      {/* View All Link (Compact Mode) */}
      {compact && announcements.length > 5 && (
        <div className="pt-3 text-center border-t border-slate-800">
          <button className="text-sm text-cyan-500 hover:text-cyan-400 font-medium transition">
            View all {announcements.length} announcements →
          </button>
        </div>
      )}

      {/* Disclaimer */}
      {!compact && (
        <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <p className="text-xs text-cyan-300">
            <span className="font-semibold">Note:</span> SENS announcements are displayed for informational purposes. 
            Always verify official JSE announcements before making investment decisions.
          </p>
        </div>
      )}
    </div>
  );
}
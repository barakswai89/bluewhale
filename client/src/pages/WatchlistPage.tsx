// FILE: client/src/pages/WatchlistPage.tsx
// ✅ FIX: Complete rewrite. The original page used a localStorage-based watchlist
// that was completely separate from the backend watchlist used by Dashboard and
// Screener. Items added via Screener (POST /watchlist/items) would never appear
// here, and vice versa. The route link also used /companies/ (plural) which
// doesn't exist in the router — it should be /company/ (singular).

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { Star, Trash2, TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://bluewhale-production.up.railway.app/api/v1';

interface WatchlistItem {
  id: string;
  company: {
    id: string;
    ticker: string;
    name: string;
    sector: string;
    lastPrice: number;
    priceChange: number;
    priceChangePercent: number;
  };
  targetPrice?: number;
  notes?: string;
}

export default function WatchlistPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [addingTicker, setAddingTicker] = useState(false);

  const getToken = () => localStorage.getItem('token');

  const fetchWatchlist = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }
      const res = await fetch(`${API_BASE}/watchlist/default`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      const data = await res.json();
      if (data.success && data.data?.items) {
        setItems(
          data.data.items.map((item: any) => ({
            id: item.id,
            targetPrice: item.targetPrice ? Number(item.targetPrice) : undefined,
            notes: item.notes,
            company: {
              id: item.company.id,
              ticker: item.company.ticker,
              name: item.company.name,
              sector: item.company.sector || '',
              lastPrice: Number(item.company.lastPrice) || 0,
              priceChange: Number(item.company.priceChange) || 0,
              priceChangePercent: Number(item.company.priceChangePercent) || 0,
            },
          }))
        );
      } else {
        setItems([]);
      }
    } catch (err) {
      // ✅ FIX: Handle Railway cold start — server may need a few seconds to wake up
      setError('Could not connect to server. Railway may be waking up — please try again in a few seconds.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleRemove = async (itemId: string) => {
    setRemoving(itemId);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/watchlist/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
      }
    } catch {
      setError('Failed to remove item.');
    } finally {
      setRemoving(null);
    }
  };

  const handleAddByTicker = async () => {
    if (!searchInput.trim()) return;
    setAddingTicker(true);
    setError(null);
    try {
      const token = getToken();
      // First find the company ID by ticker
      const res = await fetch(`${API_BASE}/companies/${searchInput.toUpperCase().trim()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const companyData = await res.json();
      if (!companyData.success || !companyData.data) {
        setError(`Ticker "${searchInput.toUpperCase()}" not found.`);
        return;
      }
      const companyId = companyData.data.id;

      // Add to backend watchlist
      const addRes = await fetch(`${API_BASE}/watchlist/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ companyId }),
      });
      const addData = await addRes.json();
      if (addData.success) {
        setSearchInput('');
        fetchWatchlist(); // Refresh the list
      } else {
        setError(addData.message || 'Failed to add to watchlist.');
      }
    } catch {
      setError('Failed to add ticker. Please try again.');
    } finally {
      setAddingTicker(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Star className="w-6 h-6 text-cyan-400" />
              My Watchlist
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {items.length} {items.length === 1 ? 'company' : 'companies'} tracked
            </p>
          </div>
          <button
            onClick={fetchWatchlist}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-slate-800 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Add ticker */}
        <div className="flex gap-2 mb-6">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddByTicker()}
            placeholder="Add by ticker (e.g. MTN, NPN, SOL)"
            className="bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            onClick={handleAddByTicker}
            disabled={addingTicker || !searchInput.trim()}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            {addingTicker ? 'Adding...' : 'Add'}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-900/30 border border-red-700 text-red-300 text-sm p-3 rounded-lg mb-4">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-slate-900 rounded-xl border border-slate-800">
            <Star className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">Your watchlist is empty</p>
            <button
              onClick={() => navigate('/screener')}
              className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
            >
              Add companies from the Screener →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const c = item.company;
              const positive = c.priceChangePercent >= 0;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-slate-600 transition group"
                >
                  {/* ✅ FIX: Route is /company/:ticker (singular), not /companies/ */}
                  <Link
                    to={`/company/${c.ticker}`}
                    className="flex items-center gap-4 flex-1 min-w-0"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">
                      {c.ticker.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.ticker} — {c.name}</p>
                      <p className="text-xs text-slate-500">{c.sector?.replace(/_/g, ' ')}</p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-6 shrink-0 ml-4">
                    <div className="text-right">
                      <p className="font-semibold">R {c.lastPrice.toFixed(2)}</p>
                      <p className={`text-xs flex items-center justify-end gap-0.5 ${positive ? 'text-green-400' : 'text-red-400'}`}>
                        {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {positive ? '+' : ''}{c.priceChangePercent.toFixed(2)}%
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={removing === item.id}
                      className="p-2 rounded-lg hover:bg-red-900/30 text-slate-600 hover:text-red-400 transition"
                      title="Remove from watchlist"
                    >
                      <Trash2 className={`w-4 h-4 ${removing === item.id ? 'animate-pulse' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

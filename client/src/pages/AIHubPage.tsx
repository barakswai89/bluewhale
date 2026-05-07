// FILE: client/src/pages/AIHubPage.tsx
// ✅ FIX: Was a completely empty stub. Now wired to the backend AI endpoints:
//   POST /api/v1/ai/sentiment
//   POST /api/v1/ai/dcf
//   POST /api/v1/ai/ask
// NOTE: These will only work once ANTHROPIC_API_KEY is set in Railway env vars.

import { useState } from 'react';
import MainLayout from '../components/MainLayout';
import {
  Sparkles, Brain, TrendingUp, MessageSquare,
  AlertCircle, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://bluewhale-production.up.railway.app/api/v1';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

// ── Sentiment Analyser ──────────────────────────────────────────────────────
function SentimentTool() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyse = async () => {
    if (!text.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/ai/sentiment`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.success) setResult(data.data);
      else setError(data.error || 'Analysis failed');
    } catch {
      setError('Could not reach server. Railway may be waking up — try again.');
    } finally {
      setLoading(false);
    }
  };

  const sentimentColor = result?.sentiment === 'POSITIVE'
    ? 'text-green-400' : result?.sentiment === 'NEGATIVE'
    ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
        <Brain className="w-5 h-5 text-cyan-400" />Sentiment Analysis
      </h3>
      <p className="text-slate-400 text-sm mb-4">Paste a news headline, SENS announcement, or company statement.</p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="e.g. 'Company XYZ reported record earnings of R2.4B, beating analyst estimates by 15%...'"
        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-3"
      />
      <button
        onClick={analyse}
        disabled={loading || !text.trim()}
        className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 px-5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Analysing...' : 'Analyse Sentiment'}
      </button>

      {error && <p className="text-red-400 text-sm mt-3 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}

      {result && (
        <div className="mt-4 space-y-3 border-t border-slate-700 pt-4">
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-bold ${sentimentColor}`}>{result.sentiment}</span>
            <span className="text-slate-400 text-sm">Score: <span className="text-white font-semibold">{result.score?.toFixed(2)}</span></span>
          </div>
          <p className="text-slate-300 text-sm">{result.explanation}</p>
          {result.keyTopics?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {result.keyTopics.map((t: string) => (
                <span key={t} className="px-2 py-1 bg-slate-700 rounded-full text-xs text-slate-300">{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── DCF Calculator ──────────────────────────────────────────────────────────
function DCFTool() {
  const [params, setParams] = useState({
    currentRevenue: '', revenueGrowthRate: '',
    terminalGrowthRate: '3', discountRate: '10', projectionYears: '5',
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/ai/dcf`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          currentRevenue: Number(params.currentRevenue),
          revenueGrowthRate: Number(params.revenueGrowthRate),
          terminalGrowthRate: Number(params.terminalGrowthRate),
          discountRate: Number(params.discountRate),
          projectionYears: Number(params.projectionYears),
        }),
      });
      const data = await res.json();
      if (data.success) setResult(data.data);
      else setError(data.error || 'Calculation failed');
    } catch {
      setError('Could not reach server. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const field = (label: string, key: keyof typeof params, suffix = '') => (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={params[key]}
          onChange={e => setParams(p => ({ ...p, [key]: e.target.value }))}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        {suffix && <span className="absolute right-3 top-2 text-slate-500 text-sm">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-cyan-400" />DCF Valuation
      </h3>
      <p className="text-slate-400 text-sm mb-4">AI-powered Discounted Cash Flow analysis for JSE companies.</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {field('Current Revenue (R millions)', 'currentRevenue', 'M')}
        {field('Revenue Growth Rate', 'revenueGrowthRate', '%')}
        {field('Terminal Growth Rate', 'terminalGrowthRate', '%')}
        {field('Discount Rate (WACC)', 'discountRate', '%')}
        {field('Projection Years', 'projectionYears', 'yrs')}
      </div>

      <button
        onClick={calculate}
        disabled={loading || !params.currentRevenue || !params.revenueGrowthRate}
        className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 px-5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Calculating...' : 'Calculate Fair Value'}
      </button>

      {error && <p className="text-red-400 text-sm mt-3 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}

      {result && (
        <div className="mt-4 border-t border-slate-700 pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
              <p className="text-xs text-slate-400">Fair Value</p>
              <p className="text-xl font-bold text-cyan-400">R{result.fairValue?.toLocaleString()}M</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-400">Terminal Value</p>
              <p className="text-xl font-bold">R{result.terminalValue?.toLocaleString()}M</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm">{result.explanation}</p>
        </div>
      )}
    </div>
  );
}

// ── Ask AI ──────────────────────────────────────────────────────────────────
function AskTool() {
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(false);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true); setError(null); setAnswer(null);
    try {
      const res = await fetch(`${API_BASE}/ai/ask`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ question, context }),
      });
      const data = await res.json();
      if (data.success) setAnswer(data.data.answer);
      else setError(data.error || 'Failed to get answer');
    } catch {
      setError('Could not reach server. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-cyan-400" />Ask AI
      </h3>
      <p className="text-slate-400 text-sm mb-4">Ask any JSE investment or financial analysis question.</p>

      <button
        onClick={() => setShowContext(v => !v)}
        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 mb-2 transition"
      >
        {showContext ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {showContext ? 'Hide' : 'Add'} context (optional)
      </button>

      {showContext && (
        <textarea
          value={context}
          onChange={e => setContext(e.target.value)}
          placeholder="Paste any relevant context: financial data, news, company description..."
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-3"
        />
      )}

      <div className="flex gap-2">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask()}
          placeholder="e.g. What P/E ratio is considered cheap for JSE financials?"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <button
          onClick={ask}
          disabled={loading || !question.trim()}
          className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask'}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mt-3 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}

      {answer && (
        <div className="mt-4 border-t border-slate-700 pt-4">
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AIHubPage() {
  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-cyan-400" />AI Hub
          </h1>
          <p className="text-slate-400 mt-1">Powered by Claude — sentiment, valuation, and investment Q&A.</p>
        </div>

        <div className="space-y-6">
          <SentimentTool />
          <DCFTool />
          <AskTool />
        </div>
      </div>
    </MainLayout>
  );
}

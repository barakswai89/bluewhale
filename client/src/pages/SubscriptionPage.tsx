// FILE: client/src/pages/SubscriptionPage.tsx
// ✅ FIX: Was an empty stub. Replaced with a functional subscription page UI.
// Payment integration (Stripe/Paystack) can be wired to the buttons once a
// payments controller is added to the backend.

import MainLayout from '../components/MainLayout';
import { Check, Sparkles, Zap, Shield, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FREE_FEATURES = [
  'JSE Small-Cap Screener (read-only)',
  'Company profiles & basic financials',
  'Watchlist (up to 10 companies)',
  'SENS announcements feed',
];

const PRO_FEATURES = [
  'Everything in Free',
  'AI Sentiment Analysis (unlimited)',
  'AI DCF Valuation Calculator',
  'AI-powered report summaries',
  'Full Reports library access',
  'Unlimited watchlist companies',
  'Export Screener data to CSV',
  'Priority support',
];

export default function SubscriptionPage() {
  const navigate = useNavigate();

  const handleProUpgrade = () => {
    // TODO: Integrate Stripe or Paystack here
    alert('Payment integration coming soon. Contact support@bluewhale.app to upgrade manually.');
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3">Choose Your Plan</h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            BlueWhale gives you an edge on the JSE. Upgrade to Pro to unlock AI-powered insights and the full research stack.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-slate-400" />
                <h2 className="text-xl font-bold">Free</h2>
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold">R0</span>
                <span className="text-slate-400 mb-1">/month</span>
              </div>
              <p className="text-slate-400 text-sm">Get started with the essentials.</p>
            </div>

            <ul className="space-y-3 flex-1 mb-6">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />{f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 py-3 rounded-xl font-semibold transition"
            >
              Current Plan
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-b from-cyan-950 to-slate-900 border border-cyan-500/50 rounded-2xl p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="bg-cyan-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-full">RECOMMENDED</span>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h2 className="text-xl font-bold">Pro</h2>
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold">R199</span>
                <span className="text-slate-400 mb-1">/month</span>
              </div>
              <p className="text-slate-400 text-sm">Everything you need to research JSE small-caps like a pro.</p>
            </div>

            <ul className="space-y-3 flex-1 mb-6">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-200">
                  <Check className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />{f}
                </li>
              ))}
            </ul>

            <button
              onClick={handleProUpgrade}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 py-3 rounded-xl font-semibold transition shadow-lg hover:shadow-cyan-500/30"
            >
              <Zap className="w-4 h-4 inline mr-2" />
              Upgrade to Pro
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {[
            { icon: <Shield className="w-5 h-5" />, title: 'Secure Payments', desc: 'All transactions are encrypted and secure.' },
            { icon: <Zap className="w-5 h-5" />, title: 'Instant Access', desc: 'AI features unlock immediately on upgrade.' },
            { icon: <TrendingUp className="w-5 h-5" />, title: 'Cancel Anytime', desc: 'No lock-in. Cancel your subscription anytime.' },
          ].map(item => (
            <div key={item.title} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-cyan-400 flex justify-center mb-2">{item.icon}</div>
              <p className="font-semibold text-sm mb-1">{item.title}</p>
              <p className="text-slate-400 text-xs">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}

// FILE: client/src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, TrendingUp, Sparkles, BarChart3, Shield } from 'lucide-react';
import BlueWhaleLogo from '../components/BlueWhaleLogo';
import { authService } from '../services/auth.service';

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // ✅ FIX: Use the centralized authService (which uses api.ts + VITE_API_URL)
      // instead of a hardcoded raw fetch. This ensures the correct Railway URL is
      // used in every environment, and that auth headers / timeout / interceptors apply.
      if (isLogin) {
        await authService.login({
          email: formData.email,
          password: formData.password,
        });
      } else {
        await authService.register({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
        });
      }
      // authService already persists token + user to localStorage
      navigate('/dashboard');
    } catch (err: any) {
      // Axios wraps HTTP error bodies in err.response.data; fall back to err.message
      // for genuine network failures (no connection, timeout, etc.)
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Network error. Please try again.';
      setError(message);
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl -top-48 -left-48 animate-pulse"></div>
        <div className="absolute w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)] opacity-20"></div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 relative z-10 animate-fadeIn">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex flex-col justify-center text-white space-y-8 p-12">
          {/* Logo */}
          <div className="mb-8 group cursor-pointer hover:scale-105 transition-transform duration-500">
            <BlueWhaleLogo size={64} />
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-tight bg-gradient-to-r from-white via-cyan-200 to-blue-200 bg-clip-text text-transparent animate-fadeIn">
              Navigate JSE Markets with Institutional-Grade Intelligence
            </h2>
            
            <p className="text-slate-300 text-lg leading-relaxed animate-fadeIn" style={{animationDelay: '0.2s'}}>
              Join South Africa's premier financial research platform. Real-time data, AI-powered insights, and Bloomberg-level analytics at your fingertips.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            {[
              { 
                icon: TrendingUp, 
                title: 'Advanced Screener', 
                desc: 'Filter 15+ JSE companies by 20+ financial metrics',
                color: 'cyan',
                delay: '0.3s'
              },
              { 
                icon: Sparkles, 
                title: 'AI-Powered Analysis', 
                desc: 'Sentiment tracking, report summaries, and DCF valuations',
                color: 'blue',
                delay: '0.4s'
              },
              { 
                icon: BarChart3, 
                title: 'Real-Time Insights', 
                desc: 'Live market data with professional-grade charts',
                color: 'purple',
                delay: '0.5s'
              },
              { 
                icon: Shield, 
                title: 'Secure & Private', 
                desc: 'Bank-level encryption and data protection',
                color: 'green',
                delay: '0.6s'
              },
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={idx}
                  className="flex items-start space-x-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300 group animate-fadeIn"
                  style={{animationDelay: feature.delay}}
                >
                  <div className={`p-3 rounded-xl bg-gradient-to-br from-${feature.color}-500/20 to-${feature.color}-600/20 border border-${feature.color}-500/30 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-6 h-6 text-${feature.color}-400`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1 group-hover:text-cyan-400 transition-colors">{feature.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t border-white/10">
            <p className="text-slate-400 text-sm">Trusted by analysts and investors across South Africa</p>
            <div className="flex items-center space-x-6 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-400">15+</p>
                <p className="text-xs text-slate-400">JSE Companies</p>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">20+</p>
                <p className="text-xs text-slate-400">Data Metrics</p>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-400">Real-Time</p>
                <p className="text-xs text-slate-400">Market Data</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="bg-slate-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 border border-slate-800/50 hover:border-cyan-500/30 transition-all duration-500">
              {/* Mobile Logo */}
              <div className="lg:hidden flex justify-center mb-6">
                <BlueWhaleLogo size={56} />
              </div>

              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                  {isLogin ? 'Welcome Back' : 'Get Started'}
                </h2>
                <p className="text-slate-400 text-sm">
                  {isLogin 
                    ? 'Sign in to access your terminal' 
                    : 'Create your account in seconds'}
                </p>
              </div>

              <div className="space-y-5">
                {!isLogin && (
                  <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300 hover:bg-slate-800"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300 hover:bg-slate-800"
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300 hover:bg-slate-800"
                    placeholder="analyst@bluewhale.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300 hover:bg-slate-800 pr-12"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-300 text-sm animate-fadeIn flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-3.5 rounded-xl hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                  )}
                </button>
              </div>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors hover:underline"
                >
                  {isLogin 
                    ? "Don't have an account? Sign up free" 
                    : 'Already have an account? Sign in'}
                </button>
              </div>

              {isLogin && (
                <div className="mt-4 text-center">
                  <button className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            <p className="text-center text-slate-500 text-xs mt-6">
              © 2025 BlueWhale Technologies. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

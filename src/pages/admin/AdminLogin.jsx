import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import CommandLogo from '@/components/CommandLogo';

export default function AdminLogin() {
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password,
            });

            if (signInError) throw signInError;

            // Navigate to admin dashboard
            navigate('/admin/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
            {/* Animated Background - Orbs */}
            <div className="orb orb1"></div>
            <div className="orb orb2"></div>
            <div className="orb orb3"></div>

            {/* Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,229,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,229,0.03)_1px,transparent_1px)] bg-[size:50px_50px] animate-gridMove"></div>

            {/* Content */}
            <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white/5 backdrop-blur-xl border-2 border-white/10 rounded-3xl p-12 shadow-2xl">
                        {/* Logo/Icon */}
                        <div className="text-center mb-8">
                            <div className="inline-block mb-4">
                                <CommandLogo size={120} />
                            </div>
                            <h2 className="text-3xl font-bold mb-2 uppercase tracking-wider font-display">
                                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                                    SDET COMMAND
                                </span>
                            </h2>
                            <p className="text-slate-400 text-sm uppercase tracking-wide">Admin Control Center</p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2 uppercase tracking-wide">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={credentials.email}
                                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all font-mono"
                                    placeholder="admin@sdet.com"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2 uppercase tracking-wide">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={credentials.password}
                                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all font-mono"
                                    placeholder="••••••••"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-black font-bold rounded-xl shadow-lg shadow-cyan-500/50 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none uppercase tracking-wider"
                            >
                                {loading ? 'Authenticating...' : 'Login'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Signature */}
            <div className="fixed bottom-4 left-4 font-script text-white/10 text-sm pointer-events-none select-none">
                AJ
            </div>

            <style jsx>{`
        .orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.3;
          animation: float 15s ease-in-out infinite;
          pointer-events: none;
          z-index: 0;
        }
        .orb1 {
          width: 300px;
          height: 300px;
          background: #00ffe5;
          top: 10%;
          left: 10%;
          animation-delay: 0s;
        }
        .orb2 {
          width: 400px;
          height: 400px;
          background: #0054a5;
          bottom: 10%;
          right: 10%;
          animation-delay: 5s;
        }
        .orb3 {
          width: 250px;
          height: 250px;
          background: #ff6b35;
          top: 50%;
          right: 20%;
          animation-delay: 10s;
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-30px, 30px) scale(0.9); }
        }
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        .animate-gridMove {
          animation: gridMove 20s linear infinite;
        }
      `}</style>
        </div>
    );
}

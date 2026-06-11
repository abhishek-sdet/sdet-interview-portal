import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Lock, Mail, LogIn, AlertCircle, Shield } from 'lucide-react';

export default function AdminLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password
            });
            if (signInError) throw signInError;
            navigate('/admin');
        } catch (err) {
            setError(err.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#080c14] flex items-center justify-center p-4 font-sans relative overflow-hidden">
            {/* Ambient orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand-blue/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-15%] right-[-5%] w-[50%] h-[50%] bg-purple-600/15 rounded-full blur-[100px]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
            </div>

            <div className="relative z-10 w-full max-w-sm">
                {/* Card */}
                <div className="relative bg-[#0b101b]/90 backdrop-blur-3xl border border-white/[0.08] rounded-3xl shadow-2xl shadow-black/60 overflow-hidden">
                    {/* Top gradient line */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-blue/60 to-transparent" />
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    <div className="relative z-10 p-8">
                        {/* Logo + Badge */}
                        <div className="flex flex-col items-center mb-8">
                            <img src="/sdet-logo.png" alt="SDET Logo" className="h-14 w-auto object-contain mb-4" />
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-blue/10 border border-brand-blue/20 rounded-full mb-3">
                                <Shield size={12} className="text-brand-blue" />
                                <span className="text-[11px] font-bold text-brand-blue tracking-wider uppercase">Admin Portal</span>
                            </div>
                            <h1 className="text-xl font-black text-white">Welcome back</h1>
                            <p className="text-slate-500 text-xs mt-1">Sign in to manage the Fresher Drive System</p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5">
                                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-400 leading-snug">{error}</p>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin@sdettech.com"
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/50 transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/50 transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 mt-2 bg-brand-blue hover:bg-blue-500 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-blue/25 hover:shadow-brand-blue/40 hover:-translate-y-0.5 active:translate-y-0 text-sm"
                            >
                                {loading ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</>
                                ) : (
                                    <><LogIn size={16} />Sign In to Admin</>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                <p className="text-center text-slate-600 text-xs mt-5">
                    SDET TECH © 2026 · Fresher Drive Interview System
                </p>
            </div>
        </div>
    );
}

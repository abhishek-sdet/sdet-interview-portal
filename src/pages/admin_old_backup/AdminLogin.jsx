import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import CommandLogo from '@/components/CommandLogo';
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { showToast } from '@/components/Toast';

export default function AdminLogin() {
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password,
            });

            if (signInError) throw signInError;

            showToast.success('Welcome back, Admin');
            navigate('/admin/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            showToast.error(err.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-universe">
            {/* Animated Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/20 blur-[120px] rounded-full mix-blend-screen animate-orb-float"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/20 blur-[120px] rounded-full mix-blend-screen animate-orb-float-delayed"></div>
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent)] opacity-20"></div>
            </div>

            {/* Content Card */}
            <div className="relative z-10 w-full max-w-md p-6 animate-fade-in-up">
                <div className="glass-panel border-white/10 rounded-3xl p-10 shadow-2xl backdrop-blur-xl">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex justify-center mb-6 relative group">
                            <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full group-hover:bg-cyan-500/30 transition-all duration-500"></div>
                            <div className="relative transform group-hover:scale-105 transition-transform duration-500">
                                <img
                                    src="/logo_new.png"
                                    alt="Company Logo"
                                    className="h-24 w-auto rounded-xl shadow-lg shadow-black/50 bg-white p-2"
                                />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold font-display tracking-tight mb-2">
                            <span className="bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
                                SDET COMMAND
                            </span>
                        </h2>
                        <p className="text-slate-400 text-sm tracking-wide uppercase font-medium">Admin Access Portal</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div className="group">
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider ml-1">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        value={credentials.email}
                                        onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                                        className="glass-input pl-14 py-3.5"
                                        placeholder="admin@sdet.com"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider ml-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        value={credentials.password}
                                        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                        className="glass-input pl-14 py-3.5"
                                        placeholder="••••••••"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full group glass-button-primary py-3.5 mt-2 flex items-center justify-center gap-2 text-base shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <span>Access Dashboard</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer Signature */}
                <div className="mt-8 text-center">
                    <p className="font-script text-white/20 text-lg select-none">AJ</p>
                </div>
            </div>
        </div>
    );
}

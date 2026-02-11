import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
        });
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin');
    };

    const navItems = [
        { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/admin/schedule', label: 'Schedule', icon: '📅' },
        { path: '/admin/criteria', label: 'Criteria', icon: '📋' },
        { path: '/admin/questions', label: 'Questions', icon: '❓' },
        { path: '/admin/results', label: 'Results', icon: '📈' },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="orb-1"></div>
                <div className="orb-2"></div>
                <div className="orb-3"></div>
                <div className="grid-texture"></div>
            </div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/5 backdrop-blur-2xl">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition-opacity"></div>
                            <div className="relative p-1 bg-slate-900 border border-white/10 rounded-xl">
                                <img src="/logo_new.png" alt="Company Logo" className="w-10 h-10 rounded-lg object-contain bg-white p-1" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">
                                SDET <span className="text-cyan-400">ADMIN</span>
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:block text-right">
                            <p className="text-xs text-slate-400 uppercase tracking-wider">Logged in as</p>
                            <p className="text-sm font-medium text-white">{user?.email}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="glass-button-danger text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                        >
                            <span>Logout</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40">
                <nav className="glass-panel p-1 rounded-2xl flex items-center gap-1 shadow-2xl shadow-cyan-900/10">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`
                                relative px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center gap-2
                                ${isActive(item.path)
                                    ? 'text-white shadow-lg shadow-cyan-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }
                            `}
                        >
                            {isActive(item.path) && (
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl -z-10"></div>
                            )}
                            <span className="text-lg">{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <main className="pt-40 pb-20 px-4 max-w-7xl mx-auto min-h-screen relative z-10 animate-fade-in-up">
                <Outlet />
            </main>

            {/* Signature */}
            <div className="fixed bottom-6 left-6 font-script text-white/20 text-sm pointer-events-none select-none mix-blend-overlay">
                AJ
            </div>
        </div>
    );
}

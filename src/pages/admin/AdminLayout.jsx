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
        { path: '/admin/criteria', label: 'Criteria', icon: '📋' },
        { path: '/admin/questions', label: 'Questions', icon: '❓' },
        { path: '/admin/results', label: 'Results', icon: '📈' },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl top-10 left-10 animate-pulse"></div>
                <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl bottom-10 right-10 animate-pulse"></div>
            </div>

            {/* Grid Overlay */}
            <div className="fixed inset-0 bg-[linear-gradient(rgba(0,255,229,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,229,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>

            {/* Header */}
            <header className="relative z-10 bg-white/5 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-cyan-400 uppercase tracking-wider font-display">
                                    SDET Admin Portal
                                </h1>
                                <p className="text-xs text-slate-400">Fresher Drive Management</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-sm text-slate-400">Logged in as</p>
                                <p className="text-white font-semibold">{user?.email}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-lg transition-all uppercase text-sm font-semibold"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <nav className="relative z-10 bg-white/5 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-2 py-3">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`
                  px-6 py-3 rounded-xl font-semibold uppercase text-sm tracking-wide transition-all
                  ${isActive(item.path)
                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black shadow-lg shadow-cyan-500/50'
                                        : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                                    }
                `}
                            >
                                <span className="mr-2">{item.icon}</span>
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
                <Outlet />
            </main>

            {/* Signature */}
            <div className="fixed bottom-4 left-4 font-script text-white/10 text-sm pointer-events-none select-none">
                AJ
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import AdminResults from '../admin/AdminResults';
import AppSignature from '@/components/AppSignature';
import { Sun, Moon } from 'lucide-react';

export default function HRDashboard() {
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') || 'dark';
        }
        return 'dark';
    });

    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return (
        <div className="min-h-screen bg-universe font-sans selection:bg-cyan-500/30 relative overflow-x-hidden transition-colors duration-300">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="orb-1"></div>
                <div className="orb-2"></div>
                <div className="orb-3"></div>
                <div className="grid-texture"></div>
            </div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-[var(--glass-border)] backdrop-blur-2xl transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition-opacity"></div>
                            <div className="relative p-1 bg-slate-900 border border-white/10 rounded-xl">
                                <img src="/logo_new.png" alt="Company Logo" className="w-10 h-10 rounded-lg object-contain bg-white p-1" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-[var(--text-main)] tracking-tight">
                                SDET <span className="text-cyan-400">ANALYTICS</span>
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--glass-border)] transition-all"
                            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <div className="hidden sm:block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest border border-[var(--glass-border)] px-3 py-1 rounded-full bg-[var(--glass-bg)]">
                            HR View (Read-Only)
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-24 pb-12 px-4 max-w-7xl mx-auto relative z-10 animate-fade-in-up">
                <AdminResults readOnly={true} theme={theme} />
            </main>

            <AppSignature />
        </div>
    );
}

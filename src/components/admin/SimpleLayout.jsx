import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Upload, FileText, List, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SimpleLayout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin/login');
    };

    const navItems = [
        { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin/upload', label: 'Upload', icon: Upload },
        { path: '/admin/questions', label: 'Manage Questions', icon: List },
        { path: '/admin/criteria', label: 'Configuration', icon: Settings },
        { path: '/admin/results', label: 'Results', icon: FileText }
    ];

    return (
        <div className="h-full w-full bg-universe font-sans text-slate-100 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-[#0b101b]/90 backdrop-blur-xl border-b border-white/10 flex-none z-50">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <img src="/sdet-logo.png" alt="SDET Logo" className="h-10 w-auto object-contain" />
                            <div>
                                <h1 className="text-lg font-bold text-white">SDET Admin</h1>
                                <p className="text-xs text-slate-400">Fresher Drive System</p>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="hidden md:flex items-center gap-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <button
                                        key={item.path}
                                        onClick={() => navigate(item.path)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${isActive
                                            ? 'bg-brand-blue text-white'
                                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                            }`}
                                    >
                                        <Icon size={18} />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm font-medium"
                        >
                            <LogOut size={18} />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto w-full px-4 sm:px-6 lg:px-8 py-8 scroll-smooth custom-scrollbar">
                <div className="w-[90%] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

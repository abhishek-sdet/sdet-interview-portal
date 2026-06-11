import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LogOut, LayoutDashboard, Upload, FileText, List,
    Settings, ShieldCheck, Calendar, ChevronLeft, ChevronRight,
    Menu, X, Bell
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, color: 'blue' },
    { path: '/admin/upload', label: 'Upload Questions', icon: Upload, color: 'cyan' },
    { path: '/admin/questions', label: 'Manage Questions', icon: List, color: 'indigo' },
    { path: '/admin/criteria', label: 'Configuration', icon: Settings, color: 'violet' },
    { path: '/admin/access', label: 'Access Control', icon: ShieldCheck, color: 'amber' },
    { path: '/admin/drives', label: 'Drives', icon: Calendar, color: 'emerald' },
    { path: '/admin/results', label: 'Results', icon: FileText, color: 'rose' },
];

const colorAccent = {
    blue:   { bg: 'bg-blue-500/15',   text: 'text-blue-400',   border: 'border-blue-500/30',   activeBg: 'bg-blue-500/20' },
    cyan:   { bg: 'bg-cyan-500/15',   text: 'text-cyan-400',   border: 'border-cyan-500/30',   activeBg: 'bg-cyan-500/20' },
    indigo: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30', activeBg: 'bg-indigo-500/20' },
    violet: { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/30', activeBg: 'bg-violet-500/20' },
    amber:  { bg: 'bg-amber-500/15',  text: 'text-amber-400',  border: 'border-amber-500/30',  activeBg: 'bg-amber-500/20' },
    emerald:{ bg: 'bg-emerald-500/15',text: 'text-emerald-400',border: 'border-emerald-500/30',activeBg: 'bg-emerald-500/20' },
    rose:   { bg: 'bg-rose-500/15',   text: 'text-rose-400',   border: 'border-rose-500/30',   activeBg: 'bg-rose-500/20' },
};

export default function SimpleLayout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        checkAuth();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) navigate('/admin/login');
        });
        return () => subscription.unsubscribe();
    }, [location.pathname]);

    const checkAuth = async () => {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) { navigate('/admin/login'); return; }
        setLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin/login');
    };

    const currentPage = navItems.find(n => n.path === location.pathname) || navItems[0];

    if (loading) {
        return (
            <div className="h-screen w-full bg-[#080c14] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
                    <p className="text-slate-500 text-sm">Loading admin panel...</p>
                </div>
            </div>
        );
    }

    const SidebarContent = ({ isMobile = false }) => (
        <div className={`flex flex-col h-full ${isMobile ? 'w-72' : collapsed ? 'w-[68px]' : 'w-60'} transition-all duration-300`}>
            {/* Logo */}
            <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/[0.06] flex-shrink-0 ${collapsed && !isMobile ? 'justify-center px-2' : ''}`}>
                <img src="/sdet-logo.png" alt="SDET" className="h-8 w-auto object-contain flex-shrink-0" />
                {(!collapsed || isMobile) && (
                    <div className="min-w-0">
                        <div className="text-sm font-black text-white tracking-wide">SDET Admin</div>
                        <div className="text-[10px] text-slate-500 tracking-wider uppercase">Fresher Drive System</div>
                    </div>
                )}
            </div>

            {/* Nav Items */}
            <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5 custom-scrollbar">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    const accent = colorAccent[item.color];
                    return (
                        <button
                            key={item.path}
                            onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false); }}
                            title={collapsed && !isMobile ? item.label : undefined}
                            className={`
                                w-full flex items-center gap-3 rounded-xl transition-all duration-200 group relative
                                ${collapsed && !isMobile ? 'justify-center p-3' : 'px-3 py-2.5'}
                                ${isActive
                                    ? `${accent.activeBg} border ${accent.border}`
                                    : 'hover:bg-white/5 border border-transparent'
                                }
                            `}
                        >
                            <div className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${isActive ? accent.bg : 'group-hover:bg-white/5'}`}>
                                <Icon size={16} className={isActive ? accent.text : 'text-slate-400 group-hover:text-slate-200'} />
                            </div>
                            {(!collapsed || isMobile) && (
                                <span className={`text-sm font-semibold truncate transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                    {item.label}
                                </span>
                            )}
                            {isActive && (!collapsed || isMobile) && (
                                <div className={`ml-auto w-1.5 h-1.5 rounded-full ${accent.text.replace('text-', 'bg-')}`} />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Bottom: Logout */}
            <div className="flex-shrink-0 border-t border-white/[0.06] p-2 space-y-1">
                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all ${collapsed && !isMobile ? 'justify-center' : ''}`}
                    title={collapsed && !isMobile ? 'Logout' : undefined}
                >
                    <LogOut size={16} className="flex-shrink-0" />
                    {(!collapsed || isMobile) && <span className="text-sm font-semibold">Logout</span>}
                </button>
            </div>
        </div>
    );

    return (
        <div className="h-screen w-full bg-[#080c14] font-sans text-slate-100 flex overflow-hidden">

            {/* Desktop Sidebar */}
            <aside className={`hidden md:flex flex-col flex-shrink-0 bg-[#0b101b]/80 backdrop-blur border-r border-white/[0.06] ${collapsed ? 'w-[68px]' : 'w-60'} transition-all duration-300`}>
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar Overlay */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                    <aside className="relative z-10 flex flex-col bg-[#0b101b] border-r border-white/10 shadow-2xl">
                        <SidebarContent isMobile />
                    </aside>
                </div>
            )}

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Bar */}
                <header className="flex-shrink-0 h-14 bg-[#0b101b]/60 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-4 sm:px-6 gap-4">
                    {/* Left: hamburger + breadcrumb */}
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="md:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                        >
                            <Menu size={18} />
                        </button>
                        <button
                            onClick={() => setCollapsed(c => !c)}
                            className="hidden md:flex p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            <Menu size={18} />
                        </button>
                        <div className="flex items-center gap-2 text-sm min-w-0">
                            <span className="text-slate-500 font-medium hidden sm:inline">Admin</span>
                            <span className="text-slate-600 hidden sm:inline">/</span>
                            <span className="font-bold text-white truncate">{currentPage.label}</span>
                        </div>
                    </div>

                    {/* Right: date + notification placeholder */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <span className="hidden lg:block text-xs text-slate-500">
                            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <div className="w-px h-4 bg-white/10 hidden sm:block" />
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-blue to-purple-600 flex items-center justify-center text-xs font-black text-white">
                                A
                            </div>
                            <span className="text-sm font-semibold text-slate-300 hidden sm:block">Admin</span>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

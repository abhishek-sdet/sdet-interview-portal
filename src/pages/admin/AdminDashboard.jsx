import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleLayout from '@/components/admin/SimpleLayout';
import { supabase } from '@/lib/supabase';
import {
    Users, CheckCircle2, TrendingUp, Upload, FileText,
    Calendar, ArrowRight, Activity, Clock, Award, BarChart3
} from 'lucide-react';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalToday: 0,
        completedToday: 0,
        passedToday: 0,
        passRate: 0,
        recentActivity: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchTodayStats(); }, []);

    const fetchTodayStats = async () => {
        try {
            setLoading(true);
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

            const { data: interviews, error } = await supabase
                .from('interviews')
                .select('*')
                .eq('status', 'completed')
                .gte('completed_at', startOfDay)
                .lte('completed_at', endOfDay);

            if (error) throw error;

            const total = interviews?.length || 0;
            const passed = interviews?.filter(i => i.passed === true).length || 0;
            const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

            const { data: recent } = await supabase
                .from('interviews')
                .select('*, candidates(full_name), criteria(name)')
                .eq('status', 'completed')
                .order('completed_at', { ascending: false })
                .limit(8);

            setStats({ totalToday: total, completedToday: total, passedToday: passed, passRate, recentActivity: recent || [] });
        } catch (err) {
            console.error('Error fetching stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            icon: Users, label: 'Total Today', value: stats.totalToday,
            sublabel: 'Candidates assessed',
            gradient: 'from-blue-600/20 to-blue-500/5',
            border: 'border-blue-500/20', iconBg: 'bg-blue-500/15', iconColor: 'text-blue-400',
            glow: 'shadow-blue-500/10'
        },
        {
            icon: CheckCircle2, label: 'Completed', value: stats.completedToday,
            sublabel: 'Finished assessments',
            gradient: 'from-emerald-600/20 to-emerald-500/5',
            border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-400',
            glow: 'shadow-emerald-500/10'
        },
        {
            icon: Award, label: 'Passed', value: stats.passedToday,
            sublabel: 'Met passing criteria',
            gradient: 'from-purple-600/20 to-purple-500/5',
            border: 'border-purple-500/20', iconBg: 'bg-purple-500/15', iconColor: 'text-purple-400',
            glow: 'shadow-purple-500/10'
        },
        {
            icon: BarChart3, label: 'Pass Rate', value: `${stats.passRate}%`,
            sublabel: 'Success percentage',
            gradient: 'from-amber-600/20 to-amber-500/5',
            border: 'border-amber-500/20', iconBg: 'bg-amber-500/15', iconColor: 'text-amber-400',
            glow: 'shadow-amber-500/10'
        },
    ];

    const quickActions = [
        { label: 'Upload Questions', desc: 'Import from Word document', icon: Upload, path: '/admin/upload', gradient: 'from-blue-600/20 to-cyan-600/10', border: 'border-blue-500/20 hover:border-blue-500/40', iconBg: 'bg-blue-500/15', iconColor: 'text-blue-400' },
        { label: 'View Results', desc: 'Scores & performance', icon: FileText, path: '/admin/results', gradient: 'from-purple-600/20 to-violet-600/10', border: 'border-purple-500/20 hover:border-purple-500/40', iconBg: 'bg-purple-500/15', iconColor: 'text-purple-400' },
        { label: 'Manage Drives', desc: 'Organize interview batches', icon: Calendar, path: '/admin/drives', gradient: 'from-emerald-600/20 to-teal-600/10', border: 'border-emerald-500/20 hover:border-emerald-500/40', iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-400' },
        { label: 'Configuration', desc: 'Criteria & settings', icon: Activity, path: '/admin/criteria', gradient: 'from-amber-600/20 to-orange-600/10', border: 'border-amber-500/20 hover:border-amber-500/40', iconBg: 'bg-amber-500/15', iconColor: 'text-amber-400' },
    ];

    return (
        <SimpleLayout>
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Dashboard</h1>
                        <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-1.5">
                            <Calendar size={13} />
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <button
                        onClick={fetchTodayStats}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white text-xs font-semibold transition-all"
                    >
                        <Activity size={13} /> Refresh
                    </button>
                </div>

                {/* Stats Grid */}
                {loading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-28 rounded-2xl bg-white/5 border border-white/[0.06] animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {statCards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <div key={card.label} className={`relative bg-gradient-to-br ${card.gradient} backdrop-blur border ${card.border} rounded-2xl p-4 sm:p-5 shadow-lg ${card.glow} overflow-hidden group hover:scale-[1.02] transition-transform duration-200`}>
                                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20 bg-current -translate-y-1/2 translate-x-1/2" />
                                    <div className="relative z-10">
                                        <div className={`inline-flex p-2 rounded-xl ${card.iconBg} mb-3`}>
                                            <Icon size={18} className={card.iconColor} />
                                        </div>
                                        <div className="text-2xl sm:text-3xl font-black text-white tabular-nums">{card.value}</div>
                                        <div className="text-xs sm:text-sm font-semibold text-slate-300 mt-0.5">{card.label}</div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">{card.sublabel}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Quick Actions */}
                    <div className="lg:col-span-1">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h2>
                        <div className="space-y-2">
                            {quickActions.map((action) => {
                                const Icon = action.icon;
                                return (
                                    <button
                                        key={action.path}
                                        onClick={() => navigate(action.path)}
                                        className={`w-full flex items-center gap-3 p-3 bg-gradient-to-r ${action.gradient} border ${action.border} rounded-xl transition-all group text-left`}
                                    >
                                        <div className={`p-2 rounded-lg ${action.iconBg} flex-shrink-0 group-hover:scale-110 transition-transform`}>
                                            <Icon size={16} className={action.iconColor} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-white">{action.label}</div>
                                            <div className="text-xs text-slate-500 truncate">{action.desc}</div>
                                        </div>
                                        <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Recent Activity</h2>
                            <button
                                onClick={() => navigate('/admin/results')}
                                className="text-xs text-brand-blue hover:text-blue-300 transition-colors flex items-center gap-1 font-semibold"
                            >
                                View all <ArrowRight size={11} />
                            </button>
                        </div>

                        <div className="bg-[#0b101b]/60 backdrop-blur border border-white/[0.06] rounded-2xl overflow-hidden">
                            {loading ? (
                                <div className="p-8 flex justify-center">
                                    <div className="w-6 h-6 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
                                </div>
                            ) : stats.recentActivity.length === 0 ? (
                                <div className="p-10 text-center">
                                    <Clock className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                                    <p className="text-slate-500 text-sm">No activity yet today</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/[0.04]">
                                    {stats.recentActivity.map((activity, idx) => {
                                        const name = activity.candidates?.full_name || 'Unknown';
                                        const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
                                        const scorePercent = activity.total_questions > 0
                                            ? Math.round((activity.score / activity.total_questions) * 100)
                                            : 0;
                                        return (
                                            <div key={activity.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                                                {/* Avatar */}
                                                <div className={`flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-black ${activity.passed ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                                                    {activity.metadata?.initial_photo ? (
                                                        <img src={activity.metadata.initial_photo} alt={name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        initials
                                                    )}
                                                </div>
                                                {/* Name + Criteria */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-semibold text-white truncate">{name}</div>
                                                    <div className="text-xs text-slate-500 truncate">{activity.criteria?.name || '—'}</div>
                                                </div>
                                                {/* Score */}
                                                <div className="text-right flex-shrink-0">
                                                    <div className="text-sm font-mono font-bold text-slate-300">
                                                        {activity.score}/{activity.total_questions}
                                                    </div>
                                                    <div className="text-[10px] text-slate-600">{scorePercent}%</div>
                                                </div>
                                                {/* Status badge */}
                                                <div className="flex-shrink-0">
                                                    {activity.passed ? (
                                                        <span className="text-[10px] font-black px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-wider">Pass</span>
                                                    ) : (
                                                        <span className="text-[10px] font-black px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 uppercase tracking-wider">Fail</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </SimpleLayout>
    );
}

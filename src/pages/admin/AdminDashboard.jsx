import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleLayout from '@/components/admin/SimpleLayout';
import { supabase } from '@/lib/supabase';
import { Users, CheckCircle2, TrendingUp, Upload, FileText, Calendar } from 'lucide-react';

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

    useEffect(() => {
        fetchTodayStats();
    }, []);

    const fetchTodayStats = async () => {
        try {
            setLoading(true);
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

            // Get today's interviews (using local day boundaries)
            const { data: interviews, error } = await supabase
                .from('interviews')
                .select('*')
                .gte('started_at', startOfDay)
                .lte('started_at', endOfDay);

            if (error) throw error;

            const total = interviews?.length || 0;
            const completed = interviews?.filter(i => i.status === 'completed').length || 0;
            const passed = interviews?.filter(i => i.passed === true).length || 0;
            const passRate = completed > 0 ? ((passed / completed) * 100).toFixed(1) : 0;

            // Get recent 5 interviews for activity feed - ordered by started_at 
            // to show active sessions at the top
            const { data: recent, error: recentError } = await supabase
                .from('interviews')
                .select(`
                    *,
                    candidates(full_name),
                    criteria(name)
                `)
                .order('started_at', { ascending: false })
                .limit(5);

            setStats({
                totalToday: total,
                completedToday: completed,
                passedToday: passed,
                passRate,
                recentActivity: recent || []
            });
        } catch (err) {
            console.error('Error fetching stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ icon: Icon, label, value, color, sublabel }) => (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg bg-${color}-500/10`}>
                    <Icon className={`w-6 h-6 text-${color}-400`} />
                </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{value}</div>
            <div className="text-sm text-slate-400">{label}</div>
            {sublabel && <div className="text-xs text-slate-500 mt-1">{sublabel}</div>}
        </div>
    );

    if (loading) {
        return (
            <SimpleLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin"></div>
                </div>
            </SimpleLayout>
        );
    }

    return (
        <SimpleLayout>
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                    <p className="text-slate-400 flex items-center gap-2">
                        <Calendar size={16} />
                        {new Date().toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        icon={Users}
                        label="Total Candidates"
                        value={stats.totalToday}
                        color="blue"
                        sublabel="Registered today"
                    />
                    <StatCard
                        icon={CheckCircle2}
                        label="Completed"
                        value={stats.completedToday}
                        color="green"
                        sublabel="Finished assessments"
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="Passed"
                        value={stats.passedToday}
                        color="emerald"
                        sublabel="Met passing criteria"
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="Pass Rate"
                        value={`${stats.passRate}%`}
                        color="purple"
                        sublabel="Success percentage"
                    />
                </div>

                {/* Quick Actions */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8">
                    <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={() => navigate('/admin/upload')}
                            className="flex items-center gap-4 p-6 bg-brand-blue/10 hover:bg-brand-blue/20 border border-brand-blue/20 hover:border-brand-blue/40 rounded-xl transition-all group"
                        >
                            <div className="p-3 bg-brand-blue/20 rounded-lg group-hover:scale-110 transition-transform">
                                <Upload className="w-6 h-6 text-brand-blue" />
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-white mb-1">Upload Questions</div>
                                <div className="text-sm text-slate-400">Import questions from Word document</div>
                            </div>
                        </button>

                        <button
                            onClick={() => navigate('/admin/results')}
                            className="flex items-center gap-4 p-6 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 rounded-xl transition-all group"
                        >
                            <div className="p-3 bg-purple-500/20 rounded-lg group-hover:scale-110 transition-transform">
                                <FileText className="w-6 h-6 text-purple-400" />
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-white mb-1">View Results</div>
                                <div className="text-sm text-slate-400">Check candidate scores and performance</div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Interview Date Reminder */}
                <div className="bg-gradient-to-r from-brand-orange/10 to-red-500/10 border border-brand-orange/20 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-brand-orange/20 rounded-lg">
                            <Calendar className="w-6 h-6 text-brand-orange" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white mb-1">Upcoming Interview</h3>
                            <p className="text-slate-300 text-sm mb-2">
                                Scheduled for <span className="font-bold text-brand-orange">February 21, 2026</span>
                            </p>
                            <p className="text-slate-400 text-xs">
                                {Math.ceil((new Date('2026-02-21') - new Date()) / (1000 * 60 * 60 * 24))} days remaining
                            </p>
                        </div>
                    </div>
                </div>
                {/* Recent Activity Table */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-white/10 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                        <button
                            onClick={() => navigate('/admin/results')}
                            className="text-sm text-brand-blue hover:text-brand-blue/80 transition-colors"
                        >
                            View All Results
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#0f172a] border-b border-white/10 relative z-10">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Candidate</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Score</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {stats.recentActivity?.length > 0 ? (
                                    stats.recentActivity.map((activity) => (
                                        <tr key={activity.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-white">{activity.candidates?.full_name || 'N/A'}</div>
                                                <div className="text-xs text-slate-400">{activity.criteria?.name}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-mono font-bold text-slate-300">
                                                {activity.status === 'in_progress' ? (
                                                    <span className="text-brand-blue animate-pulse italic">Active...</span>
                                                ) : (
                                                    `${activity.score}/${activity.total_questions}`
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {activity.status === 'in_progress' ? (
                                                    <span className="inline-flex px-2 py-1 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-bold">In Progress</span>
                                                ) : activity.passed ? (
                                                    <span className="inline-flex px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-bold">Passed</span>
                                                ) : (
                                                    <span className="inline-flex px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-xs font-bold">Failed</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm text-slate-400">
                                                {new Date(activity.completed_at || activity.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-slate-500">No recent activity</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </SimpleLayout>
    );
}

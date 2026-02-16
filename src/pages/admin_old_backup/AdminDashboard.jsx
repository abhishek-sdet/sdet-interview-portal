import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Calendar, X } from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalCandidates: 0,
        totalInterviews: 0,
        qualified: 0,
        notQualified: 0,
        successRate: 0,
        inProgress: 0
    });
    const [recentResults, setRecentResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [upcomingSchedules, setUpcomingSchedules] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, [selectedDate]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Build date range filters if needed
            let dateStart = null;
            let dateEnd = null;

            if (selectedDate) {
                const startLocal = new Date(`${selectedDate}T00:00:00`);
                const endLocal = new Date(`${selectedDate}T23:59:59.999`);
                dateStart = startLocal.toISOString();
                dateEnd = endLocal.toISOString();
            }

            // Execute queries in parallel
            const [interviewsRes, candidatesRes, resultsRes, upcomingRes] = await Promise.all([
                // 1. Interviews: Fetch only needed columns
                (async () => {
                    let query = supabase.from('interviews')
                        .select('id, status, passed, started_at', { count: 'exact' });

                    if (dateStart) {
                        query = query.gte('started_at', dateStart).lte('started_at', dateEnd);
                    }
                    return query;
                })(),

                // 2. Candidates: Just get the count
                supabase.from('candidates').select('*', { count: 'exact', head: true }),

                // 3. Recent Results: Limit to 10
                (async () => {
                    let query = supabase.from('results')
                        .select('*')
                        .order('started_at', { ascending: false })
                        .limit(10);

                    if (dateStart) {
                        query = query.gte('started_at', dateStart).lte('started_at', dateEnd);
                    }
                    return query;
                })(),

                // 4. Upcoming Schedules (only if no date filter, or specific date)
                (async () => {
                    if (selectedDate) return { data: [] }; // Don't fetch if filtering history
                    return supabase.from('scheduled_interviews_view').select('*').limit(5);
                })()
            ]);

            if (interviewsRes.error) throw interviewsRes.error;
            if (candidatesRes.error) throw candidatesRes.error;
            if (resultsRes.error) throw resultsRes.error;

            const interviews = interviewsRes.data || [];
            const completed = interviews.filter(i => i.status === 'completed');
            const qualified = completed.filter(i => i.passed).length;
            const notQualified = completed.filter(i => !i.passed).length;
            const inProgress = interviews.filter(i => i.status === 'in_progress').length;

            setStats({
                totalCandidates: candidatesRes.count || 0,
                totalInterviews: interviews.length, // Or use interviewsRes.count if paginated
                qualified,
                notQualified,
                successRate: completed.length > 0 ? ((qualified / completed.length) * 100).toFixed(1) : 0,
                inProgress
            });

            setRecentResults(resultsRes.data || []);
            setUpcomingSchedules(upcomingRes.data || []);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 min-h-[60vh]">
                <div className="relative">
                    <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 animate-pulse"></div>
                    <div className="relative animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Section */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Dashboard Overview</h2>
                    <p className="text-slate-400">
                        {selectedDate
                            ? `Showing data for ${new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
                            : 'Real-time insights and recruitment metrics.'}
                    </p>
                </div>
                <div className="flex gap-3">
                    {/* Date Filter */}
                    <div className="flex items-center gap-2 glass-panel px-4 py-2 rounded-xl">
                        <Calendar size={18} className="text-cyan-400" />
                        <input
                            type="date"
                            value={selectedDate || ''}
                            onChange={(e) => setSelectedDate(e.target.value || null)}
                            className="bg-transparent border-none text-white text-sm focus:outline-none cursor-pointer"
                        />
                    </div>
                    {selectedDate && (
                        <button
                            onClick={() => setSelectedDate(null)}
                            className="glass-button flex items-center gap-2"
                        >
                            <X size={18} />
                            Clear Filter
                        </button>
                    )}
                    <button
                        onClick={fetchDashboardData}
                        className="glass-button flex items-center gap-2 hover:bg-cyan-500/10 hover:text-cyan-400"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Refresh
                    </button>
                    <button className="glass-button-primary flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Download Report
                    </button>
                </div>
            </div>

            {/* Quick Actions Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Link to="/admin/schedule" className="glass-panel p-4 rounded-xl flex items-center gap-3 hover:bg-cyan-500/10 transition-colors group">
                    <div className="p-2 bg-cyan-500/20 rounded-lg group-hover:scale-110 transition-transform">
                        <span className="text-xl">📅</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">Schedule Interview</h3>
                        <p className="text-xs text-slate-400">Create new sessions</p>
                    </div>
                </Link>
                <Link to="/admin/results" className="glass-panel p-4 rounded-xl flex items-center gap-3 hover:bg-emerald-500/10 transition-colors group">
                    <div className="p-2 bg-emerald-500/20 rounded-lg group-hover:scale-110 transition-transform">
                        <span className="text-xl">📈</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">View Results</h3>
                        <p className="text-xs text-slate-400">Analyze performance</p>
                    </div>
                </Link>
                <Link to="/admin/questions" className="glass-panel p-4 rounded-xl flex items-center gap-3 hover:bg-purple-500/10 transition-colors group">
                    <div className="p-2 bg-purple-500/20 rounded-lg group-hover:scale-110 transition-transform">
                        <span className="text-xl">❓</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">Manage Questions</h3>
                        <p className="text-xs text-slate-400">Update question bank</p>
                    </div>
                </Link>
                <Link to="/admin/criteria" className="glass-panel p-4 rounded-xl flex items-center gap-3 hover:bg-orange-500/10 transition-colors group">
                    <div className="p-2 bg-orange-500/20 rounded-lg group-hover:scale-110 transition-transform">
                        <span className="text-xl">📋</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">Update Criteria</h3>
                        <p className="text-xs text-slate-400">Set passing marks</p>
                    </div>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    label="Total Candidates"
                    value={stats.totalCandidates}
                    icon="👥"
                    color="cyan"
                    trend="+12%"
                />
                <StatCard
                    label="Qualified"
                    value={stats.qualified}
                    icon="✅"
                    color="green"
                    trend="+5%"
                />
                <StatCard
                    label="Not Qualified"
                    value={stats.notQualified}
                    icon="❌"
                    color="red"
                    trend="-2%"
                />
                <StatCard
                    label="Success Rate"
                    value={`${stats.successRate}%`}
                    icon="📊"
                    color="blue"
                    subtext="Based on completed interviews"
                />
            </div>

            {/* Upcoming Schedules Section */}
            {!selectedDate && upcomingSchedules.length > 0 && (
                <div className="glass-panel rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Calendar size={20} className="text-cyan-400" />
                            Upcoming Scheduled Interviews
                        </h3>
                        <Link to="/admin/schedule" className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1">
                            View All →
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {upcomingSchedules.length > 0 ? (
                            upcomingSchedules.map((schedule) => (
                                <div key={schedule.id} className="glass-panel p-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-cyan-500/20 rounded-lg">
                                            <Calendar size={18} className="text-cyan-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-medium">{schedule.criteria_name}</h4>
                                            <p className="text-sm text-slate-400">
                                                {new Date(schedule.scheduled_date).toLocaleDateString('en-IN', {
                                                    weekday: 'short',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })} • {schedule.time_limit_minutes} min
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-white font-medium">{schedule.total_interviews} / {schedule.max_candidates || '∞'}</div>
                                        <div className="text-xs text-slate-400">candidates</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-slate-400 py-4">No upcoming schedules</div>
                        )}
                    </div>
                </div>
            )}

            {/* Recent Results Table */}
            <div className="glass-panel rounded-2xl p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-1">Recent Results</h2>
                        <p className="text-sm text-slate-400">Latest candidate submissions</p>
                    </div>
                    <Link to="/admin/results" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                        View All Results &rarr;
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="text-left py-4 px-4 text-xs uppercase text-slate-500 font-bold tracking-wider">Candidate</th>
                                <th className="text-left py-4 px-4 text-xs uppercase text-slate-500 font-bold tracking-wider">Criteria</th>
                                <th className="text-left py-4 px-4 text-xs uppercase text-slate-500 font-bold tracking-wider">Score</th>
                                <th className="text-left py-4 px-4 text-xs uppercase text-slate-500 font-bold tracking-wider">Percentage</th>
                                <th className="text-left py-4 px-4 text-xs uppercase text-slate-500 font-bold tracking-wider">Status</th>
                                <th className="text-left py-4 px-4 text-xs uppercase text-slate-500 font-bold tracking-wider">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {recentResults.map((result) => (
                                <tr key={result.interview_id} className="hover:bg-white/5 transition-colors group">
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-cyan-400 border border-white/10 group-hover:border-cyan-500/50 transition-colors">
                                                {result.full_name?.charAt(0)}
                                            </div>
                                            <span className="text-white font-medium group-hover:text-cyan-400 transition-colors">{result.full_name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-slate-400 text-sm">{result.criteria_name}</td>
                                    <td className="py-4 px-4 text-white font-mono text-sm">{result.score}/{result.total_questions}</td>
                                    <td className="py-4 px-4">
                                        <div className="w-full bg-slate-800 rounded-full h-1.5 w-24 mb-1">
                                            <div
                                                className={`h-1.5 rounded-full ${result.passed ? 'bg-green-500' : 'bg-red-500'}`}
                                                style={{ width: `${result.percentage}%` }}
                                            ></div>
                                        </div>
                                        <span className={`text-xs font-bold ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                                            {result.percentage}%
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${result.passed
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                            {result.passed ? 'QUALIFIED' : 'NOT QUALIFIED'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-slate-500 text-sm">
                                        {new Date(result.completed_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {recentResults.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            No recent results found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color, trend, subtext }) {
    const colorStyles = {
        cyan: { bg: 'from-cyan-500/10 to-blue-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', shadow: 'shadow-cyan-500/10' },
        green: { bg: 'from-emerald-500/10 to-green-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', shadow: 'shadow-emerald-500/10' },
        red: { bg: 'from-red-500/10 to-orange-500/10', border: 'border-red-500/20', text: 'text-red-400', shadow: 'shadow-red-500/10' },
        blue: { bg: 'from-blue-500/10 to-indigo-500/10', border: 'border-blue-500/20', text: 'text-blue-400', shadow: 'shadow-blue-500/10' },
    };

    const style = colorStyles[color];

    return (
        <div className={`relative overflow-hidden rounded-2xl border ${style.border} bg-gradient-to-br ${style.bg} p-6 transition-all hover:scale-[1.02] hover:shadow-xl ${style.shadow} group`}>
            {/* Background Glow */}
            <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${style.text} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`}></div>

            <div className="relative">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-slate-400 tracking-wide uppercase">{label}</p>
                    <span className={`text-2xl opacity-80 group-hover:scale-110 transition-transform duration-300`}>{icon}</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
                    {trend && (
                        <span className={`text-xs font-medium ${trend.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                            {trend}
                        </span>
                    )}
                </div>
                {subtext && <p className="mt-1 text-xs text-slate-500">{subtext}</p>}
            </div>
        </div>
    );
}

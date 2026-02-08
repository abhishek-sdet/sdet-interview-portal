import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Fetch stats
            const { data: interviews, error: interviewsError } = await supabase
                .from('interviews')
                .select('*');

            if (interviewsError) throw interviewsError;

            const completed = interviews.filter(i => i.status === 'completed');
            const qualified = completed.filter(i => i.passed).length;
            const notQualified = completed.filter(i => !i.passed).length;
            const inProgress = interviews.filter(i => i.status === 'in_progress').length;

            const { data: candidates } = await supabase
                .from('candidates')
                .select('id');

            setStats({
                totalCandidates: candidates?.length || 0,
                totalInterviews: interviews.length,
                qualified,
                notQualified,
                successRate: completed.length > 0 ? ((qualified / completed.length) * 100).toFixed(1) : 0,
                inProgress
            });

            // Fetch recent results
            const { data: results, error: resultsError } = await supabase
                .from('results')
                .select('*')
                .order('started_at', { ascending: false })
                .limit(10);

            if (resultsError) throw resultsError;
            setRecentResults(results || []);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    label="Total Candidates"
                    value={stats.totalCandidates}
                    icon="👥"
                    color="cyan"
                />
                <StatCard
                    label="Qualified"
                    value={stats.qualified}
                    icon="✅"
                    color="green"
                />
                <StatCard
                    label="Not Qualified"
                    value={stats.notQualified}
                    icon="❌"
                    color="red"
                />
                <StatCard
                    label="Success Rate"
                    value={`${stats.successRate}%`}
                    icon="📊"
                    color="blue"
                />
            </div>

            {/* Recent Results Table */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-cyan-400 uppercase tracking-wide">Recent Results</h2>
                    <span className="text-sm text-slate-400">{recentResults.length} results</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left py-3 px-4 text-xs uppercase text-cyan-400 font-semibold">Candidate</th>
                                <th className="text-left py-3 px-4 text-xs uppercase text-cyan-400 font-semibold">Criteria</th>
                                <th className="text-left py-3 px-4 text-xs uppercase text-cyan-400 font-semibold">Score</th>
                                <th className="text-left py-3 px-4 text-xs uppercase text-cyan-400 font-semibold">Percentage</th>
                                <th className="text-left py-3 px-4 text-xs uppercase text-cyan-400 font-semibold">Status</th>
                                <th className="text-left py-3 px-4 text-xs uppercase text-cyan-400 font-semibold">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentResults.map((result) => (
                                <tr key={result.interview_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="py-3 px-4 text-white">{result.full_name}</td>
                                    <td className="py-3 px-4 text-slate-300">{result.criteria_name}</td>
                                    <td className="py-3 px-4 text-white font-mono">{result.score}/{result.total_questions}</td>
                                    <td className="py-3 px-4">
                                        <span className={`font-semibold ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                                            {result.percentage}%
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${result.passed
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                                : 'bg-red-500/20 text-red-400 border border-red-500/50'
                                            }`}>
                                            {result.passed ? 'QUALIFIED' : 'NOT QUALIFIED'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-400 text-sm">
                                        {new Date(result.completed_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {recentResults.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            No results available yet
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color }) {
    const colorClasses = {
        cyan: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30',
        green: 'from-green-500/20 to-green-600/20 border-green-500/30',
        red: 'from-red-500/20 to-red-600/20 border-red-500/30',
        blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    };

    return (
        <div className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-xl border rounded-2xl p-6 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 text-6xl opacity-10">{icon}</div>
            <div className="relative z-10">
                <p className="text-sm text-slate-400 uppercase tracking-wide mb-2">{label}</p>
                <p className="text-4xl font-bold text-white font-mono">{value}</p>
            </div>
        </div>
    );
}

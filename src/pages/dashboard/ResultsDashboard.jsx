import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import InsightLogo from '@/components/InsightLogo';

import { useTheme } from '@/context/ThemeContext';

export default function ResultsDashboard() {
    const [results, setResults] = useState([]);
    const [filteredResults, setFilteredResults] = useState([]);
    const [stats, setStats] = useState({ total: 0, qualified: 0, notQualified: 0, successRate: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const { theme, toggleTheme } = useTheme();
    const [loading, setLoading] = useState(true);

    const bgClass = theme === 'dark'
        ? 'bg-slate-900 text-white'
        : 'bg-gray-100 text-gray-900';

    const cardBg = theme === 'dark'
        ? 'bg-white/5 border-white/10'
        : 'bg-white border-gray-200';

    if (loading) {
        return (
            <div className={`min-h-screen ${bgClass} flex items-center justify-center`}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                    <p className="text-slate-400">Syncing Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-full w-full relative overflow-y-auto ${bgClass} transition-colors duration-300`}>
            {/* Animated Background */}
            {theme === 'dark' && (
                <>
                    <div className="fixed inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl top-[15%] left-[15%] animate-pulse"></div>
                        <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl bottom-[15%] right-[15%] animate-pulse"></div>
                    </div>
                    <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] pointer-events-none"></div>
                </>
            )}

            {/* Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <header className={`${cardBg} backdrop-blur-xl border rounded-3xl p-6 mb-8`}>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <InsightLogo size={80} />
                            <div>
                                <h1 className="text-3xl font-bold font-display">
                                    <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                                        SDET INSIGHT
                                    </span>
                                </h1>
                                <p className={`text-sm uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                                    Results & Analytics Portal
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className={`px-4 py-2 rounded-full ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`}>
                                <span className="text-cyan-400 font-semibold">
                                    {new Date().toLocaleDateString()}
                                </span>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className={`p-3 rounded-full ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}
                                title="Toggle Theme"
                            >
                                {theme === 'dark' ? '☀️' : '🌙'}
                            </button>
                        </div>
                    </div>
                </header>

                {/* KPI Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <KPICard label="Total Candidates" value={stats.total} theme={theme} />
                    <KPICard label="Qualified" value={stats.qualified} theme={theme} color="green" />
                    <KPICard label="Not Qualified" value={stats.notQualified} theme={theme} color="red" />
                    <KPICard label="Success Rate" value={`${stats.successRate}%`} theme={theme} color="blue" />
                </div>

                {/* Search */}
                <div className={`${cardBg} backdrop-blur-xl border rounded-3xl p-6 mb-8`}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            Global Candidate Search
                        </h2>
                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                            {filteredResults.length} results
                        </span>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by Name or Email..."
                            className={`w-full px-4 py-3 pl-12 rounded-xl border ${theme === 'dark'
                                ? 'bg-white/5 border-white/10 text-white placeholder-slate-500'
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                                } focus:outline-none focus:ring-2 focus:ring-cyan-400`}
                        />
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </div>
                </div>

                {/* Results Table */}
                <div className={`${cardBg} backdrop-blur-xl border rounded-3xl p-6 overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className={`border-b sticky top-0 z-10 ${theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'}`}>
                                    <th className="text-left py-4 px-4 text-xs uppercase text-cyan-400 font-semibold">Criteria</th>
                                    <th className="text-left py-4 px-4 text-xs uppercase text-cyan-400 font-semibold">Status</th>
                                    <th className="text-left py-4 px-4 text-xs uppercase text-cyan-400 font-semibold">Name</th>
                                    <th className="text-left py-4 px-4 text-xs uppercase text-cyan-400 font-semibold">Email</th>
                                    <th className="text-left py-4 px-4 text-xs uppercase text-cyan-400 font-semibold">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredResults.map((result) => (
                                    <tr
                                        key={result.interview_id}
                                        className={`border-b ${theme === 'dark' ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'} transition-colors`}
                                    >
                                        <td className="py-4 px-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${theme === 'dark' ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-800'
                                                }`}>
                                                {result.criteria_name || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${result.passed
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                                : 'bg-red-500/20 text-red-400 border border-red-500/50'
                                                }`}>
                                                {result.passed ? 'QUALIFIED' : 'NOT QUALIFIED'}
                                            </span>
                                        </td>
                                        <td className={`py-4 px-4 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                            {result.full_name}
                                        </td>
                                        <td className={`py-4 px-4 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                                            {result.email || '-'}
                                        </td>
                                        <td className={`py-4 px-4 text-sm font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                                            {new Date(result.completed_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredResults.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                No matching candidates found
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Signature */}
            <div className="fixed bottom-4 left-4 font-script text-white/10 text-sm pointer-events-none select-none">
                AJ
            </div>
        </div>
    );
}

function KPICard({ label, value, theme, color = 'default' }) {
    const colorClasses = {
        default: theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200',
        green: theme === 'dark' ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200',
        red: theme === 'dark' ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200',
        blue: theme === 'dark' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200',
    };

    const textColor = {
        default: theme === 'dark' ? 'text-white' : 'text-gray-900',
        green: 'text-green-400',
        red: 'text-red-400',
        blue: 'text-blue-400',
    };

    return (
        <div className={`${colorClasses[color]} backdrop-blur-xl border rounded-2xl p-6`}>
            <p className={`text-xs uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                {label}
            </p>
            <p className={`text-4xl font-bold font-mono ${textColor[color]}`}>
                {value}
            </p>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminResults() {
    const [results, setResults] = useState([]);
    const [filteredResults, setFilteredResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        date: 'all'
    });

    useEffect(() => {
        fetchResults();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [filters, results]);

    const fetchResults = async () => {
        try {
            setLoading(true);

            // Fetch candidates
            const { data: candidates, error: candidatesError } = await supabase
                .from('candidates')
                .select('*')
                .order('created_at', { ascending: false });

            if (candidatesError) throw candidatesError;

            // Fetch results
            const { data: resultsData, error: resultsError } = await supabase
                .from('results')
                .select('*');

            if (resultsError) throw resultsError;

            // Fetch interviews to get in-progress status
            const { data: interviews, error: interviewsError } = await supabase
                .from('interviews')
                .select('*');

            if (interviewsError) throw interviewsError;

            // Merge data
            const mergedData = candidates.map(candidate => {
                const result = resultsData.find(r => r.candidate_id === candidate.id);
                const interview = interviews.find(i => i.candidate_id === candidate.id);

                return {
                    id: candidate.id,
                    name: candidate.full_name,
                    email: candidate.email,
                    phone: candidate.phone_number,
                    experience: candidate.experience_level,
                    created_at: candidate.created_at,
                    score: result ? result.score : null,
                    total: result ? result.total_questions : null,
                    percentage: result ? result.percentage : null,
                    passed: result ? result.passed : null,
                    status: result ? (result.passed ? 'QUALIFIED' : 'NOT QUALIFIED') : (interview ? 'IN PROGRESS' : 'REGISTERED'),
                    criteria_name: result?.criteria_name || interview?.criteria_id || '-' // Simplification, ideally fetch criteria name properly
                };
            });

            setResults(mergedData);
            setFilteredResults(mergedData);

        } catch (err) {
            console.error('Error fetching results:', err);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let sorted = [...results];

        // Text Search
        if (filters.search) {
            const term = filters.search.toLowerCase();
            sorted = sorted.filter(r =>
                r.name.toLowerCase().includes(term) ||
                r.email.toLowerCase().includes(term) ||
                r.phone.toLowerCase().includes(term)
            );
        }

        // Status Filter
        if (filters.status !== 'all') {
            sorted = sorted.filter(r => r.status === filters.status);
        }

        setFilteredResults(sorted);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-white font-display mb-2">Candidate Results</h2>
                <p className="text-slate-400">View and analyze assessment performance records.</p>
            </div>

            {/* Filters */}
            <div className="glass-panel border-white/10 rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <input
                        type="text"
                        placeholder="Search candidates by name, email..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 glass-input rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-cyan/50"
                    />
                    <svg className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="glass-input px-4 py-3 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan/50 cursor-pointer"
                    >
                        <option value="all">All Statuses</option>
                        <option value="QUALIFIED">Qualified</option>
                        <option value="NOT QUALIFIED">Not Qualified</option>
                        <option value="IN PROGRESS">In Progress</option>
                        <option value="REGISTERED">Registered</option>
                    </select>
                </div>
            </div>

            {/* Results Table */}
            <div className="glass-panel border-white/10 rounded-2xl overflow-hidden min-h-[500px]">
                {loading ? (
                    <div className="p-20 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-cyan mx-auto mb-4"></div>
                        <p className="text-slate-400">Loading results...</p>
                    </div>
                ) : filteredResults.length === 0 ? (
                    <div className="p-20 text-center">
                        <p className="text-slate-400 text-lg">No results found matching your filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/5">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate Info</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Score</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredResults.map((r) => (
                                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-brand-cyan font-bold text-sm">
                                                    {r.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">{r.name}</div>
                                                    <div className="text-xs text-slate-500">{r.email} • {r.phone}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {r.score !== null ? (
                                                <div className="font-mono">
                                                    <span className={`text-lg font-bold ${r.passed ? 'text-green-400' : 'text-red-400'}`}>{r.percentage}%</span>
                                                    <div className="text-xs text-slate-500">{r.score}/{r.total}</div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-600">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyles(r.status)}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-slate-500 font-mono">
                                            {new Date(r.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function getStatusStyles(status) {
    switch (status) {
        case 'QUALIFIED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        case 'NOT QUALIFIED': return 'bg-red-500/10 text-red-400 border-red-500/20';
        case 'IN PROGRESS': return 'bg-brand-blue/10 text-brand-blue border-brand-blue/20';
        default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
}

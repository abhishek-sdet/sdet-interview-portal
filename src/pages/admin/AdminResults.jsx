import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleLayout from '@/components/admin/SimpleLayout';
import { supabase } from '@/lib/supabase';
import { Search, Download, CheckCircle2, XCircle, Calendar, Filter, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminResults() {
    const navigate = useNavigate();
    const [results, setResults] = useState([]);
    const [filteredResults, setFilteredResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('all');
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // Score Editing State
    const [editingScoreId, setEditingScoreId] = useState(null);
    const [tempScore, setTempScore] = useState('');
    const [updatingScore, setUpdatingScore] = useState(false);

    useEffect(() => {
        checkAuth();
        fetchResults();

        // Subscribe to real-time changes
        const subscription = supabase
            .channel('admin-results-channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'interviews' },
                (payload) => {
                    console.log('Real-time update:', payload);
                    fetchResults();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [dateFilter]);

    useEffect(() => {
        filterResults();
    }, [searchTerm, results]);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate('/admin/login');
        }
    };

    const fetchResults = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('interviews')
                .select(`
                    *,
                    candidates(full_name, email, phone),
                    criteria(name)
                `)
                .order('completed_at', { ascending: false });

            // Apply date filter
            if (dateFilter === 'today') {
                const today = new Date().toISOString().split('T')[0];
                query = query.gte('started_at', `${today}T00:00:00`);
            } else if (dateFilter === 'week') {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                query = query.gte('started_at', weekAgo.toISOString());
            }

            const { data, error } = await query;

            if (error) throw error;
            setResults(data || []);
            setFilteredResults(data || []);
        } catch (err) {
            console.error('Error fetching results:', err);
        } finally {
            setLoading(false);
        }
    };

    const filterResults = () => {
        if (!searchTerm) {
            setFilteredResults(results);
            return;
        }

        const filtered = results.filter(r =>
            r.candidates?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.candidates?.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredResults(filtered);
    };

    const exportToCSV = () => {
        const headers = ['Name', 'Email', 'Phone', 'Criteria', 'Score', 'Total', 'Percentage', 'Status', 'Date'];
        const rows = filteredResults.map(r => [
            r.candidates?.full_name || 'N/A',
            r.candidates?.email || 'N/A',
            r.candidates?.phone || 'N/A',
            r.criteria?.name || 'N/A',
            r.score || 0,
            r.total_questions || 0,
            r.total_questions ? ((r.score / r.total_questions) * 100).toFixed(1) : '0',
            r.passed ? 'PASSED' : 'FAILED',
            new Date(r.completed_at).toLocaleString()
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `interview_results_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const handleDeleteInterview = async (interviewId) => {
        setDeletingId(interviewId);

        try {
            console.log('[DELETE] Attempting to delete interview:', interviewId);

            const { error } = await supabase
                .from('interviews')
                .delete()
                .eq('id', interviewId);

            if (error) {
                console.error('[DELETE] Supabase error:', error);
                throw error;
            }

            console.log('[DELETE] Interview deleted successfully');
            toast.success('Interview deleted successfully');
            fetchResults(); // Refresh list
        } catch (err) {
            console.error('[DELETE] Error deleting interview:', err);

            // Check if it's a permission error
            if (err.message?.includes('permission') || err.message?.includes('policy')) {
                toast.error('Permission denied. Please run fix_delete_permissions.sql in Supabase Dashboard.');
            } else {
                toast.error(`Failed to delete: ${err.message || 'Unknown error'}`);
            }
        } finally {
            setDeletingId(null);
        }
    };

    const handleResetAll = async () => {
        try {
            // Delete all interviews
            const { error: interviewError } = await supabase
                .from('interviews')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

            if (interviewError) throw interviewError;

            // Optionally delete all candidates too
            const { error: candidateError } = await supabase
                .from('candidates')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

            if (candidateError) throw candidateError;

            toast.success('All interview records reset successfully!');
            setShowResetConfirm(false);
            fetchResults();
        } catch (err) {
            console.error('Error resetting data:', err);
            toast.error('Failed to reset data');
        }
    };

    const startEditingScore = (result) => {
        setEditingScoreId(result.id);
        setTempScore(String(result.score || 0));
    };

    const cancelEditingScore = () => {
        setEditingScoreId(null);
        setTempScore('');
    };

    const saveScore = async (result) => {
        const newScore = parseInt(tempScore);

        if (isNaN(newScore) || newScore < 0) {
            toast.error('Please enter a valid non-negative score');
            return;
        }

        if (newScore > result.total_questions) {
            toast.error(`Score cannot exceed total questions (${result.total_questions})`);
            return;
        }

        setUpdatingScore(true);

        try {
            // 1. Get passing percentage for this criteria
            // We can try to get it from the result object if joined, otherwise fetch it
            let passingPercentage = 70; // Default fallback

            // Fetch criteria details to be sure
            const { data: criteriaData, error: criteriaError } = await supabase
                .from('criteria')
                .select('passing_percentage')
                .eq('id', result.criteria_id)
                .single();

            if (!criteriaError && criteriaData) {
                passingPercentage = criteriaData.passing_percentage;
            }

            // 2. Calculate new status
            const totalQuestions = result.total_questions || 1; // Prevent division by zero
            const newPercentage = (newScore / totalQuestions) * 100;
            const newPassed = newPercentage >= passingPercentage;

            console.log('[UPDATE SCORE]', {
                id: result.id,
                oldScore: result.score,
                newScore,
                total: totalQuestions,
                newPercentage,
                passingCutoff: passingPercentage,
                passed: newPassed
            });

            // 3. Update Database
            const { error: updateError } = await supabase
                .from('interviews')
                .update({
                    score: newScore,
                    passed: newPassed
                })
                .eq('id', result.id);

            if (updateError) throw updateError;

            toast.success(`Score updated. Candidate is now ${newPassed ? 'QUALIFIED' : 'UNQUALIFIED'}`);
            setEditingScoreId(null);
            fetchResults(); // Refresh UI

        } catch (err) {
            console.error('Error updating score:', err);
            toast.error('Failed to update score');
        } finally {
            setUpdatingScore(false);
        }
    };

    return (
        <SimpleLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Interview Results</h1>
                        <p className="text-slate-400">View candidate performance and scores</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowResetConfirm(true)}
                            disabled={results.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Trash2 size={18} />
                            Reset All
                        </button>
                        <button
                            onClick={exportToCSV}
                            disabled={filteredResults.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 text-green-400 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download size={18} />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name or email..."
                            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                        />
                    </div>

                    {/* Date Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="pl-11 pr-8 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all appearance-none cursor-pointer"
                        >
                            <option value="today" className="bg-[#0b101b]">Today</option>
                            <option value="week" className="bg-[#0b101b]">Last 7 Days</option>
                            <option value="all" className="bg-[#0b101b]">All Time</option>
                        </select>
                    </div>
                </div>

                {/* Results Table */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin"></div>
                    </div>
                ) : filteredResults.length === 0 ? (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-12 text-center">
                        <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400">No results found</p>
                    </div>
                ) : (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            Candidate
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            Phone
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            Criteria
                                        </th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            Score
                                        </th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            Percentage
                                        </th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredResults.map((result) => {
                                        const percentage = result.total_questions
                                            ? ((result.score / result.total_questions) * 100).toFixed(1)
                                            : 0;

                                        return (
                                            <tr key={result.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <div className="font-medium text-white">
                                                            {result.candidates?.full_name || 'N/A'}
                                                        </div>
                                                        <div className="text-sm text-slate-400">
                                                            {result.candidates?.email || 'N/A'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-slate-300 font-mono">
                                                        {result.candidates?.phone || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-slate-300">
                                                        {result.criteria?.name || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {editingScoreId === result.id ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <input
                                                                type="number"
                                                                value={tempScore}
                                                                onChange={(e) => setTempScore(e.target.value)}
                                                                className="w-16 bg-black/40 border border-brand-blue/50 rounded px-2 py-1 text-white text-center text-sm focus:outline-none"
                                                                min="0"
                                                                max={result.total_questions}
                                                                autoFocus
                                                            />
                                                            <div className="flex flex-col gap-1">
                                                                <button
                                                                    onClick={() => saveScore(result)}
                                                                    disabled={updatingScore}
                                                                    className="p-1 bg-green-500/20 hover:bg-green-500/40 text-green-400 rounded transition-colors"
                                                                    title="Save"
                                                                >
                                                                    <CheckCircle2 size={12} />
                                                                </button>
                                                                <button
                                                                    onClick={cancelEditingScore}
                                                                    className="p-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded transition-colors"
                                                                    title="Cancel"
                                                                >
                                                                    <XCircle size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="group relative flex items-center justify-center gap-2">
                                                            <span className="font-mono font-bold text-white">
                                                                {result.score || 0}/{result.total_questions || 0}
                                                            </span>
                                                            <button
                                                                onClick={() => startEditingScore(result)}
                                                                className="p-1 text-slate-500 hover:text-brand-blue transition-all"
                                                                title="Edit Score"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`font-bold ${percentage >= 70 ? 'text-green-400' : 'text-red-400'
                                                        }`}>
                                                        {percentage}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {result.passed ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-bold">
                                                            <CheckCircle2 size={14} />
                                                            PASSED
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-xs font-bold">
                                                            <XCircle size={14} />
                                                            FAILED
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-slate-300">
                                                        {new Date(result.completed_at).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {new Date(result.completed_at).toLocaleTimeString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleDeleteInterview(result.id)}
                                                        disabled={deletingId === result.id}
                                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                                                        title="Delete this interview"
                                                    >
                                                        {deletingId === result.id ? (
                                                            <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                                                        ) : (
                                                            <Trash2 size={16} />
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-white/5 border-t border-white/10">
                            <p className="text-sm text-slate-400">
                                Showing {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                )}

                {/* Reset Confirmation Modal */}
                {showResetConfirm && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-[#0f172a] border border-red-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-red-500/10 rounded-lg">
                                    <AlertTriangle className="w-6 h-6 text-red-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white">Reset All Data?</h3>
                            </div>
                            <p className="text-slate-300 mb-6">
                                This will permanently delete <strong>all interview records and candidates</strong> from the database. This action cannot be undone.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-lg transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleResetAll}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all font-medium"
                                >
                                    Yes, Reset All
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </SimpleLayout>
    );
}

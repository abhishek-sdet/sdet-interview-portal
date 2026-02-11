import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Calendar, Search, Trash2, RefreshCw, X, Filter, LayoutGrid } from 'lucide-react';
import { showToast } from '@/components/Toast';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function AdminResults({ readOnly = false, theme = 'dark' }) {
    // State
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState([]);
    const [originalResults, setOriginalResults] = useState([]); // For date filtering
    const [criteriaList, setCriteriaList] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    // Chart Data & Theme Logic
    const [chartColors, setChartColors] = useState({
        text: 'rgba(255, 255, 255, 0.7)',
        grid: 'rgba(255, 255, 255, 0.1)'
    });

    useEffect(() => {
        // Update chart colors based on theme
        const root = document.documentElement;
        const computed = getComputedStyle(root);
        // We use a timeout to ensure DOM has updated styles if theme changed
        const timer = setTimeout(() => {
            setChartColors({
                text: getComputedStyle(document.documentElement).getPropertyValue('--chart-text').trim() || 'rgba(255,255,255,0.7)',
                grid: getComputedStyle(document.documentElement).getPropertyValue('--chart-grid').trim() || 'rgba(255,255,255,0.1)'
            });
        }, 50);
        return () => clearTimeout(timer);
    }, [theme]);

    // Initial Fetch
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    // Filter Logic
    useEffect(() => {
        let filtered = [...originalResults];

        // Date Filter
        if (selectedDate) {
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            filtered = filtered.filter(r => {
                const recordDate = new Date(r.started_at);
                const recordDateStr = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;
                return recordDateStr === selectedDate;
            });
        }

        setResults(filtered);
    }, [selectedDate, originalResults]);

    const fetchData = async () => {
        try {
            // Fetch Interviews with Joins to get Set Name
            // We fetch from 'interviews' table directly instead of 'results' view
            // to access the nested 'set_name' via answers -> questions
            const { data: interviewsData, error: interviewsError } = await supabase
                .from('interviews')
                .select(`
                    id,
                    status,
                    started_at,
                    completed_at,
                    score,
                    total_questions,
                    passed,
                    metadata,
                    candidates (id, full_name, email, phone),
                    criteria (name, passing_percentage),
                    answers (
                        questions (set_name)
                    )
                `)
                .order('started_at', { ascending: false })
                // We limit to 1 answer per interview to get the set name efficiently
                // Note: If no answers, array will be empty
                .limit(1, { foreignTable: 'answers' });

            if (interviewsError) throw interviewsError;

            // Fetch Criteria List for Tabs (Same as before)
            const { data: criteriaData, error: criteriaError } = await supabase
                .from('criteria')
                .select('*')
                .order('name');

            if (criteriaError) throw criteriaError;

            // Process and Flatten Data to match previous structure
            const processedResults = (interviewsData || []).map(item => {
                const setName = item.answers?.[0]?.questions?.set_name || 'N/A';

                return {
                    interview_id: item.id,
                    candidate_id: item.candidates?.id,
                    full_name: item.candidates?.full_name || 'Unknown',
                    email: item.candidates?.email || '',
                    phone: item.candidates?.phone || '',
                    criteria_name: item.criteria?.name || 'Unknown',
                    passing_percentage: item.criteria?.passing_percentage || 70,
                    score: item.score,
                    total_questions: item.total_questions,
                    percentage: item.total_questions > 0
                        ? ((item.score / item.total_questions) * 100).toFixed(2)
                        : '0.00',
                    passed: item.passed,
                    status: item.status,
                    completed_at: item.completed_at,
                    started_at: item.started_at,
                    metadata: item.metadata,
                    set_name: setName // New Field
                };
            });

            setResults(processedResults);
            setOriginalResults(processedResults);
            setCriteriaList(criteriaData || []);
        } catch (err) {
            console.error('Error fetching data:', err);
            showToast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this result? This cannot be undone.')) return;

        setDeletingId(id);
        try {
            const { error } = await supabase
                .from('interviews')
                .delete()
                .eq('id', id);

            if (error) throw error;

            showToast.success('Result deleted successfully');
            // Remove from local state
            setResults(prev => prev.filter(r => r.interview_id !== id));
            setOriginalResults(prev => prev.filter(r => r.interview_id !== id));
        } catch (err) {
            console.error('Error deleting result:', err);
            showToast.error('Failed to delete result');
        } finally {
            setDeletingId(null);
        }
    };

    // Derived Stats
    const stats = useMemo(() => {
        const total = results.length;
        const qualified = results.filter(r => r.passed).length;
        const notQualified = results.filter(r => !r.passed).length; // passed is false or null
        const successRate = total > 0 ? ((qualified / total) * 100).toFixed(1) : 0;

        return { total, qualified, notQualified, successRate };
    }, [results]);

    // Chart Data
    const chartData = useMemo(() => {
        const labels = criteriaList.map(c => c.name.split(' ')[0]); // Shorten names
        const qualifiedData = criteriaList.map(c =>
            results.filter(r => r.criteria_name === c.name && r.passed).length
        );
        const notQualifiedData = criteriaList.map(c =>
            results.filter(r => r.criteria_name === c.name && !r.passed).length
        );

        return {
            bar: {
                labels,
                datasets: [
                    {
                        label: 'Qualified',
                        data: qualifiedData,
                        backgroundColor: '#10b981', // emerald-500
                        borderRadius: 4,
                    },
                    {
                        label: 'Not Qualified',
                        data: notQualifiedData,
                        backgroundColor: '#ef4444', // red-500
                        borderRadius: 4,
                    }
                ]
            },
            doughnut: {
                labels: ['Qualified', 'Not Qualified'],
                datasets: [{
                    data: [stats.qualified, stats.notQualified],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 0,
                }]
            }
        };
    }, [results, criteriaList, stats]);

    // Global Search Filter
    const globalFilteredResults = results.filter(r =>
        r.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.email && r.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top', labels: { color: chartColors.text } },
            title: { display: false }
        },
        scales: {
            x: {
                grid: { color: chartColors.grid },
                ticks: { color: chartColors.text }
            },
            y: {
                grid: { color: chartColors.grid },
                ticks: { color: chartColors.text }
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header Actions (Date Pill, Reset) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    {!readOnly && (
                        <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest border border-[var(--glass-border)] px-3 py-1 rounded-full bg-[var(--glass-bg)]">
                            ADMIN MODE
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {/* Date Pill */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-cyan-500/20 blur opacity-0 group-hover:opacity-100 transition-opacity rounded-full"></div>
                        <div className="relative flex items-center gap-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-full px-4 py-2 hover:bg-[var(--glass-border)] transition-all cursor-pointer">
                            <Calendar size={16} className="text-cyan-400" />
                            <input
                                type="date"
                                value={selectedDate || ''}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent border-none text-sm text-[var(--text-main)] focus:outline-none w-[130px] cursor-pointer"
                            />
                            {selectedDate && (
                                <button onClick={() => setSelectedDate(null)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={fetchData}
                        className="p-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-full hover:bg-[var(--glass-border)] text-cyan-400 transition-all"
                        title="Refresh Data"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* 1. KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard label="Total Candidates" value={stats.total} icon="👥" />
                <KPICard label="Qualified" value={stats.qualified} color="green" />
                <KPICard label="Not Qualified" value={stats.notQualified} color="red" />
                <KPICard label="Success Rate" value={`${stats.successRate}%`} icon="📈" color="blue" />
            </div>

            {/* 2. Global Search Section */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                <div className="flex items-center justify-between mb-6 relative flex-wrap gap-4">
                    <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                        <Search size={20} className="text-cyan-400" /> Global Candidate Search
                    </h2>
                    <div className="relative w-full max-w-sm">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search by Name or Email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl py-2 pl-10 pr-4 text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500/50 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
                    <table className="w-full border-collapse text-left">
                        <thead className="sticky top-0 bg-[var(--bg-body)] z-10">
                            <tr>
                                <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--glass-border)]">Set / Criteria</th>
                                <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--glass-border)]">Status</th>
                                <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--glass-border)]">Candidate</th>
                                <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--glass-border)] text-right">
                                    {!readOnly && 'Actions'}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {globalFilteredResults.length > 0 ? (
                                globalFilteredResults.map((result) => (
                                    // Update Global Search Table Row
                                    <tr key={result.interview_id} className="border-b border-[var(--glass-border)] hover:bg-[var(--glass-bg)] transition-colors group/row">
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="inline-block px-2 py-1 rounded-md bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs font-mono text-[var(--text-muted)]">
                                                    {result.criteria_name?.split(' ')[0] || 'Unknown'}
                                                </span>
                                                {result.set_name && result.set_name !== 'N/A' && (
                                                    <span className="inline-block px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono text-cyan-400 w-fit">
                                                        {result.set_name}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <StatusBadge passed={result.passed} />
                                        </td>


                                        <td className="p-4">
                                            <div className="font-medium text-[var(--text-main)]">{result.full_name}</div>
                                            <div className="text-xs text-[var(--text-muted)]">{result.email}</div>
                                            <div className="text-[10px] text-[var(--text-muted)] font-mono mt-1">
                                                {new Date(result.started_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            {!readOnly && (
                                                <button
                                                    onClick={() => handleDelete(result.interview_id)}
                                                    disabled={deletingId === result.interview_id}
                                                    className="p-2 rounded-lg bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger)] hover:bg-red-500/20 transition-all opacity-100"
                                                    title="Delete Result"
                                                >
                                                    {deletingId === result.interview_id ? (
                                                        <div className="animate-spin h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full"></div>
                                                    ) : (
                                                        <Trash2 size={16} />
                                                    )}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={readOnly ? 3 : 4} className="p-8 text-center text-[var(--text-muted)] italic">
                                        No candidates found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 3. Analytics Section (Charts) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 rounded-2xl h-[350px] md:col-span-2 relative">
                    <Bar data={chartData.bar} options={chartOptions} />
                </div>
                <div className="glass-panel p-6 rounded-2xl h-[350px] relative">
                    <Doughnut data={chartData.doughnut} options={{
                        ...chartOptions,
                        cutout: '70%',
                        plugins: { legend: { position: 'bottom', labels: { color: chartColors.text } } }
                    }} />
                </div>
            </div>

            {/* 4. Sets Breakdown Section */}
            <div className="space-y-6">
                <h3 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                    <LayoutGrid size={20} className="text-cyan-400" /> Set Breakdown
                </h3>

                {/* Sets Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {criteriaList.map(criteria => (
                        <SetPanel
                            key={criteria.id}
                            criteria={criteria}
                            results={results.filter(r => r.criteria_name === criteria.name)}
                        />
                    ))}
                    {criteriaList.length === 0 && (
                        <div className="xl:col-span-2 text-center py-10 text-[var(--text-muted)]">
                            No criteria sets found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Sub-components

function SetPanel({ criteria, results }) {
    const qualified = results.filter(r => r.passed);
    const notQualified = results.filter(r => !r.passed);

    return (
        <div className="glass-panel rounded-2xl border border-[var(--glass-border)] overflow-hidden shadow-xl">
            {/* Set Header */}
            <div className="bg-[var(--glass-bg)] p-4 border-b border-[var(--glass-border)] flex justify-between items-center">
                <span className="text-lg font-bold text-[var(--text-main)] tracking-tight">{criteria.name}</span>
                <span className="text-xs font-mono text-[var(--text-muted)]">{results.length} Total</span>
            </div>

            {/* Split Columns */}
            <div className="grid grid-cols-2 h-[400px] divide-x divide-[var(--glass-border)]">
                {/* Qualified Column */}
                <div className="flex flex-col">
                    <div className="p-3 text-center text-xs font-bold text-[var(--success)] uppercase tracking-widest bg-[var(--success-bg)] sticky top-0 backdrop-blur-sm border-b border-[var(--glass-border)] z-10">
                        Qualified
                    </div>
                    <div className="overflow-y-auto custom-scrollbar flex-1 p-3 space-y-2">
                        {qualified.map(r => (
                            <MiniCard key={r.interview_id} result={r} type="qualified" />
                        ))}
                        {qualified.length === 0 && <EmptyState />}
                    </div>
                </div>

                {/* Not Qualified Column */}
                <div className="flex flex-col">
                    <div className="p-3 text-center text-xs font-bold text-[var(--danger)] uppercase tracking-widest bg-[var(--danger-bg)] sticky top-0 backdrop-blur-sm border-b border-[var(--glass-border)] z-10">
                        Not Qualified
                    </div>
                    <div className="overflow-y-auto custom-scrollbar flex-1 p-3 space-y-2">
                        {notQualified.map(r => (
                            <MiniCard key={r.interview_id} result={r} type="notQualified" />
                        ))}
                        {notQualified.length === 0 && <EmptyState />}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MiniCard({ result, type }) {
    const isQ = type === 'qualified';
    return (
        <div className={`p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--input-bg)] ${isQ ? 'border-l-2 border-l-[var(--success)]' : 'border-l-2 border-l-[var(--danger)]'}`}>
            <div className="flex justify-between items-start gap-2">
                <div className="text-sm font-medium text-[var(--text-main)] truncate max-w-[75%]">{result.full_name}</div>
                {result.set_name && result.set_name !== 'N/A' && (
                    <span className="text-[10px] items-center px-1.5 py-0.5 rounded border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)] font-mono whitespace-nowrap">
                        {result.set_name}
                    </span>
                )}
            </div>
            <div className="text-xs text-[var(--text-muted)] truncate">{result.email}</div>
            <div className="mt-1 pt-1 border-t border-[var(--glass-border)] flex justify-between items-center text-[10px] font-mono text-[var(--text-muted)]">
                <span>{result.score}/{result.total_questions} ({result.percentage}%)</span>
                <span>{new Date(result.started_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="text-center py-8 text-xs text-[var(--text-muted)] italic">
            No candidates
        </div>
    );
}

function KPICard({ label, value, icon, color = 'cyan' }) {
    const colors = {
        cyan: 'text-cyan-400',
        green: 'text-[var(--success)]',
        red: 'text-[var(--danger)]',
        blue: 'text-blue-400'
    };

    // Disable shadow/glow logic for now or update it later
    const glowColors = {
        cyan: 'shadow-cyan-500/10',
        green: 'shadow-emerald-500/10', // Not perfect but OK
        red: 'shadow-red-500/10',
        blue: 'shadow-blue-500/10'
    };

    return (
        <div className={`glass-panel p-6 rounded-2xl border border-[var(--glass-border)] shadow-xl hover:-translate-y-1 transition-transform duration-300`}>
            <div className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2">{label}</div>
            <div className={`text-4xl font-bold font-mono ${colors[color]} flex items-center gap-2`}>
                {value}
                {icon && <span className="text-2xl opacity-50">{icon}</span>}
            </div>
        </div>
    );
}

function StatusBadge({ passed }) {
    return (
        <span className={`inline-flex px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${passed
            ? 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--glass-border)]'
            : 'bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--glass-border)]'
            }`}>
            {passed ? 'Qualified' : 'Not Qualified'}
        </span>
    );
}

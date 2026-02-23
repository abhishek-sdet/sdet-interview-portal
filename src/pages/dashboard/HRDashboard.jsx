import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Sun, Moon, Search, BarChart3, TrendingUp, Calendar, CheckCircle, XCircle, Users, LayoutDashboard, Database, Activity, Briefcase, GraduationCap } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import AppSignature from '@/components/AppSignature';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

export default function HRDashboard() {
    // Dashboard manages its own theme (always starts light per decided preference, but toggleable)
    const [theme, setTheme] = useState('light');
    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [driveFilter, setDriveFilter] = useState('all');
    const [drives, setDrives] = useState([]);
    const [activeTab, setActiveTab] = useState('fresher');

    useEffect(() => {
        fetchData();
        fetchDrives();

        const channel = supabase
            .channel('hr-dashboard-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'interviews' },
                () => {
                    setTimeout(() => fetchData(true), 1000);
                }
            )
            .subscribe();

        // Add fonts
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);

        // Fallback polling
        const pollInterval = setInterval(() => {
            fetchData(true);
        }, 10000);

        return () => {
            document.head.removeChild(link);
            supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };
    }, []);

    const fetchData = async (isBackgroundRefresh = false) => {
        if (!isBackgroundRefresh) {
            setLoading(true);
        }
        try {
            let query = supabase
                .from('interviews')
                .select(`
                    *,
                    candidates(*),
                    criteria(name, passing_percentage)
                `)
                .order('completed_at', { ascending: false })
                .order('started_at', { ascending: false });

            if (driveFilter !== 'all') {
                query = query.eq('scheduled_interview_id', driveFilter);
            }

            const { data: interviewData, error } = await query;

            if (error) throw error;
            setInterviews(interviewData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDrives = async () => {
        try {
            const { data, error } = await supabase
                .from('scheduled_interviews')
                .select('id, description, scheduled_date')
                .order('scheduled_date', { ascending: false });
            if (!error) setDrives(data || []);
        } catch (err) {
            console.error('Error fetching drives:', err);
        }
    };

    // Helper to check if an interview passed based on current threshold
    const checkPassed = (item) => {
        if (!item.total_questions) return false;
        const threshold = item.criteria?.passing_percentage || 70;
        const percentage = (item.score / item.total_questions) * 100;
        return percentage >= threshold;
    };

    const filteredInterviews = interviews.filter(item => {
        const query = searchTerm.toLowerCase();
        const candidateName = item.candidates?.full_name?.toLowerCase() || '';
        const candidateEmail = item.candidates?.email?.toLowerCase() || '';

        const matchesSearch = candidateName.includes(query) || candidateEmail.includes(query);

        if (statusFilter === 'all') return matchesSearch;

        const isPassed = checkPassed(item);
        const matchesStatus = statusFilter === 'qualified' ? isPassed : !isPassed;

        return matchesSearch && matchesStatus;
    });

    // Stats Calculation - CONSISTENT: Only count COMPLETED interviews
    const completedInterviews = interviews.filter(i => i.status === 'completed');
    const totalCandidates = completedInterviews.length;


    const qualified = completedInterviews.filter(i => checkPassed(i)).length;
    const notQualified = totalCandidates - qualified;
    const successRate = totalCandidates > 0 ? Math.round((qualified / totalCandidates) * 100) : 0;

    // Categorization Logic: Fresher vs Experience
    const getCategorizedData = () => {
        const categories = {
            'Fresher': { q: [], nq: [] },
            'Experience': { q: [], nq: [] }
        };

        completedInterviews.forEach(item => {
            const criteriaName = item.criteria?.name?.toLowerCase() || '';
            const isExperience = criteriaName.includes('experience') || criteriaName.includes('experienced') || criteriaName.includes('exp');
            const target = isExperience ? 'Experience' : 'Fresher';

            if (checkPassed(item)) categories[target].q.push(item);
            else categories[target].nq.push(item);
        });
        return categories;
    };

    const categoriesData = getCategorizedData();

    // Design Tokens from index.html
    const tokens = {
        dark: {
            bgBody: '#050511',
            bgGradient1: 'rgba(76, 29, 149, 0.15)',
            bgGradient2: 'rgba(56, 189, 248, 0.15)',
            glassBg: 'rgba(255, 255, 255, 0.03)',
            glassBorder: 'rgba(255, 255, 255, 0.08)',
            textMain: '#ffffff',
            textMuted: 'rgba(255, 255, 255, 0.5)',
            cardShadow: '0 20px 40px rgba(0,0,0,0.2)',
            inputBg: 'rgba(0,0,0,0.3)',
            chartGrid: 'rgba(255, 255, 255, 0.1)',
            chartText: 'rgba(255, 255, 255, 0.7)',
            neonBlue: '#4facfe',
            success: '#00f260',
            danger: '#ff5e62',
            successBg: 'rgba(0, 242, 96, 0.1)',
            dangerBg: 'rgba(255, 94, 98, 0.1)'
        },
        light: {
            bgBody: '#f3f4f6',
            bgGradient1: 'rgba(79, 172, 254, 0.1)',
            bgGradient2: 'rgba(161, 140, 209, 0.1)',
            glassBg: 'rgba(255, 255, 255, 0.85)',
            glassBorder: 'rgba(209, 213, 219, 0.8)',
            textMain: '#111827',
            textMuted: '#6b7280',
            cardShadow: '0 10px 25px rgba(0,0,0,0.05)',
            inputBg: '#ffffff',
            chartGrid: 'rgba(0, 0, 0, 0.05)',
            chartText: '#374151',
            neonBlue: '#2563eb',
            success: '#059669',
            danger: '#dc2626',
            successBg: '#d1fae5',
            dangerBg: '#fee2e2'
        }
    };

    const current = theme === 'dark' ? tokens.dark : tokens.light;

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: { color: current.chartText, font: { family: 'Space Grotesk', weight: '600' } }
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleFont: { family: 'Space Grotesk' },
                bodyFont: { family: 'Space Grotesk' },
                padding: 12,
                cornerRadius: 8
            }
        },
        scales: {
            y: {
                grid: { color: current.chartGrid, drawBorder: false },
                ticks: { color: current.chartText, font: { family: 'JetBrains Mono' } }
            },
            x: {
                grid: { display: false },
                ticks: { color: current.chartText, font: { family: 'Space Grotesk' } }
            }
        }
    };

    if (loading) {
        return (
            <div style={{ backgroundColor: current.bgBody }} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 transition-colors duration-500">
                <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
                <p style={{ color: current.textMain, opacity: 0.5 }} className="text-sm font-bold tracking-[0.2em] uppercase">Syncing Intelligence</p>
            </div>
        );
    }

    return (
        <div
            style={{
                backgroundColor: current.bgBody,
                color: current.textMain,
                fontFamily: "'Space Grotesk', sans-serif"
            }}
            className="min-h-screen relative overflow-x-hidden transition-colors duration-500"
        >
            {/* Ambient Backgrounds from index.html */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div
                    className="absolute inset-0 opacity-50"
                    style={{
                        background: `radial-gradient(circle at 15% 50%, ${current.bgGradient1}, transparent 25%), radial-gradient(circle at 85% 30%, ${current.bgGradient2}, transparent 25%)`,
                        animation: 'pulseBg 10s ease-in-out infinite alternate'
                    }}
                />
                <div
                    className="absolute inset-0 opacity-30"
                    style={{
                        backgroundImage: `linear-gradient(${current.glassBorder} 1px, transparent 1px), linear-gradient(90deg, ${current.glassBorder} 1px, transparent 1px)`,
                        backgroundSize: '40px 40px',
                        maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
                    }}
                />
            </div>

            <style>{`
                @keyframes pulseBg { 0% { transform: scale(1); } 100% { transform: scale(1.1); } }
                .glass-card {
                    background: ${current.glassBg};
                    backdrop-filter: blur(20px);
                    border: 1px solid ${current.glassBorder};
                    box-shadow: ${current.cardShadow};
                    border-radius: 24px;
                }
                .text-glow-green { text-shadow: 0 0 10px ${current.success}44; color: ${current.success} !important; }
                .text-glow-red { text-shadow: 0 0 10px ${current.danger}44; color: ${current.danger} !important; }
                .tab-btn {
                    padding: 8px 24px;
                    border-radius: 12px;
                    font-weight: 600;
                    transition: all 0.3s;
                    color: ${current.textMuted};
                }
                .tab-btn.active {
                    background: ${current.bgBody};
                    color: ${current.textMain};
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${current.glassBorder}; border-radius: 10px; }
            `}</style>

            <div className="relative z-10 max-w-[1600px] mx-auto px-6 py-8 flex flex-col gap-8">
                {/* Header Section */}
                <header className="glass-card p-6 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/10 overflow-hidden p-1.5 border border-white/10">
                            <img
                                src="/sdet-logo.png"
                                alt="SDET Logo"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                }}
                            />
                            <LayoutDashboard className="text-white w-7 h-7 hidden" />
                        </div>
                        <div>
                            <h1
                                className={`text-2xl font-bold tracking-tight bg-gradient-to-r bg-clip-text text-transparent ${theme === 'dark' ? 'from-white to-slate-400' : 'from-slate-900 to-slate-600'
                                    }`}
                            >
                                SDET Insight <span className="font-light opacity-50">2025</span>
                            </h1>
                            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Candidate Intelligence Portal</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-slate-800 bg-white/5">
                            <Calendar size={14} className="text-blue-400" />
                            <span className="text-xs font-bold text-slate-400">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <button
                            onClick={toggleTheme}
                            className="w-10 h-10 rounded-full glass-card flex items-center justify-center border-slate-700 hover:scale-110 transition-transform"
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-indigo-600" />}
                        </button>
                    </div>
                </header>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard label="Total Candidates" value={totalCandidates} theme={theme} current={current} />
                    <KPICard label="Qualified" value={qualified} status="success" theme={theme} current={current} />
                    <KPICard label="Not Qualified" value={notQualified} status="danger" theme={theme} current={current} />
                    <KPICard label="Success Rate" value={`${successRate}%`} theme={theme} current={current} />
                </div>

                {/* Main Search Panel */}
                <div className="glass-card p-8 group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Database className="w-5 h-5 text-blue-400" />
                                Global Candidate Search
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Found {filteredInterviews.length} indexed records</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-2xl">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search by name or email address..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ backgroundColor: current.inputBg, border: `1px solid ${current.glassBorder}` }}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-sm"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                style={{ backgroundColor: current.inputBg, border: `1px solid ${current.glassBorder}` }}
                                className="px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-sm min-w-[160px] appearance-none cursor-pointer"
                            >
                                <option value="all">All Status</option>
                                <option value="qualified">Qualified</option>
                                <option value="qualified">Qualified</option>
                                <option value="not_qualified">Not Qualified</option>
                            </select>

                            <select
                                value={driveFilter}
                                onChange={(e) => {
                                    setDriveFilter(e.target.value);
                                    // Trigger refetch since drive filter is handled at query level for perf
                                    setTimeout(() => fetchData(), 10);
                                }}
                                style={{ backgroundColor: current.inputBg, border: `1px solid ${current.glassBorder}` }}
                                className="px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-sm min-w-[160px] appearance-none cursor-pointer"
                            >
                                <option value="all">All Drives</option>
                                {drives.map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.description || `Drive ${new Date(d.scheduled_date).toLocaleDateString()}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="border rounded-2xl overflow-hidden" style={{ borderColor: current.glassBorder }}>
                        <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10" style={{ backgroundColor: current.bgBody }}>
                                    <tr style={{ borderBottom: `1px solid ${current.glassBorder}` }}>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Criteria</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Candidate</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Email Address</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: current.glassBorder }}>
                                    {filteredInterviews.length > 0 ? (
                                        filteredInterviews.map((item) => (
                                            <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold border" style={{ borderColor: current.glassBorder, backgroundColor: current.inputBg }}>
                                                        {item.criteria?.name || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {(() => {
                                                        const isPassed = checkPassed(item);
                                                        return (
                                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${isPassed ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                                                } border`}>
                                                                {isPassed ? 'Qualified' : 'Not Qualified'}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm tracking-tight">{item.candidates?.full_name}</span>
                                                        <span className="text-[10px] font-mono text-slate-500">Score: {item.score}/{item.total_questions}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-semibold text-slate-500">{item.candidates?.email}</td>
                                                <td className="px-6 py-4 text-[10px] font-bold font-mono text-slate-600">
                                                    {new Date(item.completed_at || item.started_at).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-20 text-center text-slate-500 italic opacity-50">No matching candidate records found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Analytics Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="glass-card p-6 min-h-[400px]">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Activity className="w-5 h-5 text-emerald-400" />
                                Category Distribution
                            </h3>
                        </div>
                        <div className="h-[300px]">
                            <Bar
                                options={chartOptions}
                                data={{
                                    labels: ['Fresher', 'Experience'],
                                    datasets: [
                                        { label: 'Qualified', data: ['Fresher', 'Experience'].map(c => categoriesData[c].q.length), backgroundColor: current.success + 'CC', borderRadius: 8 },
                                        { label: 'Not Qualified', data: ['Fresher', 'Experience'].map(c => categoriesData[c].nq.length), backgroundColor: current.danger + 'CC', borderRadius: 8 }
                                    ]
                                }}
                            />
                        </div>
                    </div>
                    <div className="glass-card p-6 min-h-[400px] flex flex-col">
                        <h3 className="text-xl font-bold mb-8">Performance Ratio</h3>
                        <div className="flex-1 min-h-[250px] relative">
                            <Doughnut
                                options={{
                                    ...chartOptions,
                                    cutout: '75%',
                                    plugins: { ...chartOptions.plugins, legend: { position: 'bottom', labels: { color: current.chartText, font: { family: 'Space Grotesk', weight: '600' } } } }
                                }}
                                data={{
                                    labels: ['Qualified', 'Not Qualified'],
                                    datasets: [{
                                        data: [qualified, notQualified],
                                        backgroundColor: [current.success, current.danger],
                                        borderWidth: 0,
                                        hoverOffset: 15
                                    }]
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Tabbed Category View */}
                <div className="flex flex-col gap-6">
                    <div className="flex justify-center">
                        <div className="glass-card p-1 flex gap-2" style={{ backgroundColor: current.inputBg, borderRadius: '18px' }}>
                            <button
                                onClick={() => setActiveTab('fresher')}
                                className={`tab-btn flex items-center gap-2 ${activeTab === 'fresher' ? 'active' : ''}`}
                            >
                                <GraduationCap size={16} />
                                Freshers
                            </button>
                            <button
                                onClick={() => setActiveTab('experience')}
                                className={`tab-btn flex items-center gap-2 ${activeTab === 'experience' ? 'active' : ''}`}
                            >
                                <Briefcase size={16} />
                                Experienced
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {activeTab === 'fresher' ? (
                            <>
                                <CategoryPanel name="Freshers" data={categoriesData['Fresher']} icon={<GraduationCap className="text-blue-500" />} current={current} />
                                <CategorySummary label="Fresher Pass Rate" data={categoriesData['Fresher']} current={current} />
                            </>
                        ) : (
                            <>
                                <CategoryPanel name="Experienced" data={categoriesData['Experience']} icon={<Briefcase className="text-indigo-500" />} current={current} />
                                <CategorySummary label="Experience Pass Rate" data={categoriesData['Experience']} current={current} />
                            </>
                        )}
                    </div>
                </div>

                {/* Footer Signature */}
                <AppSignature />
            </div>
        </div>
    );
}

function KPICard({ label, value, status, theme, current }) {
    const isDark = theme === 'dark';
    const glowClass = status === 'success' ? 'text-glow-green' : status === 'danger' ? 'text-glow-red' : '';

    return (
        <div className="glass-card p-8 group hover:-translate-y-2 transition-all duration-500">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{label}</p>
            <div className={`text-4xl font-extrabold tracking-tight font-mono ${glowClass}`}>
                {value}
            </div>
            <div className="h-1 w-12 bg-blue-500/20 rounded-full mt-4 group-hover:w-full transition-all duration-700"></div>
        </div>
    );
}

function CategoryPanel({ name, data, icon, current }) {
    return (
        <div className="glass-card overflow-hidden flex flex-col h-[500px]">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h4 className="font-bold flex items-center gap-3 tracking-widest bg-white/5 px-4 py-1.5 rounded-xl border border-white/10 uppercase">
                    {icon}
                    {name}
                </h4>
                <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                    {data.q.length + data.nq.length} Total
                </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-x divide-white/5 flex-1 overflow-hidden">
                <div className="flex flex-col overflow-hidden">
                    <div className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-emerald-500 sticky top-0" style={{ backgroundColor: current.bgBody }}>Qualified</div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {data.q.map(item => <CandidateMiniCard key={item.id} item={item} status="q" current={current} />)}
                        {data.q.length === 0 && <div className="text-center py-10 opacity-20 text-[10px] uppercase font-bold tracking-widest">Empty</div>}
                    </div>
                </div>
                <div className="flex flex-col overflow-hidden border-t sm:border-t-0" style={{ borderTopColor: current.glassBorder }}>
                    <div className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-rose-500 sticky top-0" style={{ backgroundColor: current.bgBody }}>Not Qualified</div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {data.nq.map(item => <CandidateMiniCard key={item.id} item={item} status="nq" current={current} />)}
                        {data.nq.length === 0 && <div className="text-center py-10 opacity-20 text-[10px] uppercase font-bold tracking-widest">Empty</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function CategorySummary({ label, data, current }) {
    const total = data.q.length + data.nq.length;
    const rate = total > 0 ? Math.round((data.q.length / total) * 100) : 0;

    return (
        <div className="glass-card p-8 flex flex-col justify-center items-center gap-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{label}</h4>
            <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="96" cy="96" r="80"
                        fill="transparent"
                        stroke={current.glassBorder}
                        strokeWidth="12"
                    />
                    <circle
                        cx="96" cy="96" r="80"
                        fill="transparent"
                        stroke={rate > 50 ? current.success : current.neonBlue}
                        strokeWidth="12"
                        strokeDasharray={502.4}
                        strokeDashoffset={502.4 - (502.4 * rate) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold font-mono">{rate}%</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Success</span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Pass</p>
                    <p className="text-xl font-bold font-mono text-emerald-500">{data.q.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Fail</p>
                    <p className="text-xl font-bold font-mono text-rose-500">{data.nq.length}</p>
                </div>
            </div>
        </div>
    );
}

function CandidateMiniCard({ item, status, current }) {
    const borderClass = status === 'q' ? 'border-emerald-500/20 border-l-emerald-500' : 'border-rose-500/20 border-l-rose-500';
    return (
        <div
            className={`p-3 rounded-xl border-l-2 bg-white/5 border border-white/5 flex flex-col gap-1 hover:bg-white/[0.08] transition-colors ${borderClass}`}
        >
            <p className="text-sm font-bold truncate tracking-tight">{item.candidates?.full_name}</p>
            <p className="text-xs text-slate-500 truncate">{item.candidates?.email}</p>
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-[9px] font-bold font-mono opacity-30 uppercase">{new Date(item.completed_at || item.started_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                <span className="text-[9px] font-bold text-slate-400 capitalize">{item.criteria?.name?.split(' ')[0]}</span>
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Sun, Moon, Search } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import AppSignature from '@/components/AppSignature';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

import { useTheme } from '@/context/ThemeContext';

export default function HRDashboard() {
    const { theme, toggleTheme } = useTheme();
    const [interviews, setInterviews] = useState([]);
    const [criteriaMap, setCriteriaMap] = useState({}); // Map of criteria_id -> { name, passing_percentage }
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // 3D Animation States
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isAnimated, setIsAnimated] = useState(false);

    // Handle mouse move for 3D tilt effects
    const handleMouseMove = (e, elementRef) => {
        if (!elementRef) return;

        const rect = elementRef.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * 10; // Max 10deg tilt
        const rotateY = ((centerX - x) / centerX) * 10;

        return { rotateX, rotateY };
    };

    // Trigger entrance animations
    useEffect(() => {
        setTimeout(() => setIsAnimated(true), 100);
    }, []);

    // Helper function to get distinct colors for different criteria
    const getCriteriaColor = (criteriaName) => {
        const name = criteriaName.toLowerCase();

        // Fresher criteria - Blue shades
        if (name.includes('fresher') || name.includes('0-2')) {
            return {
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)'
            };
        }
        // Experienced criteria - Purple shades
        if (name.includes('experienced') || name.includes('testing') || name.includes('2-5')) {
            return {
                background: 'rgba(139, 92, 246, 0.15)',
                color: '#a78bfa',
                border: '1px solid rgba(139, 92, 246, 0.3)'
            };
        }
        // Senior/Advanced criteria - Cyan shades
        if (name.includes('senior') || name.includes('advanced') || name.includes('5+')) {
            return {
                background: 'rgba(6, 182, 212, 0.15)',
                color: '#22d3ee',
                border: '1px solid rgba(6, 182, 212, 0.3)'
            };
        }
        // Management/Lead criteria - Amber shades
        if (name.includes('lead') || name.includes('manager') || name.includes('management')) {
            return {
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.3)'
            };
        }
        // Default - Purple (original)
        return {
            background: 'rgba(139, 92, 246, 0.15)',
            color: '#a78bfa',
            border: '1px solid rgba(139, 92, 246, 0.2)'
        };
    };

    useEffect(() => {
        fetchInterviews();

        // Subscribe to real-time changes
        const subscription = supabase
            .channel('interviews-channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'interviews' },
                (payload) => {
                    console.log('Real-time update:', payload);
                    fetchInterviews();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchInterviews = async () => {
        setLoading(true);
        try {
            // Fetch criteria first to get passing percentages
            const { data: criteriaData, error: criteriaError } = await supabase
                .from('criteria')
                .select('id, name, passing_percentage');

            if (criteriaError) throw criteriaError;

            // Create criteria map for quick lookup
            const critMap = {};
            (criteriaData || []).forEach(c => {
                critMap[c.id] = {
                    name: c.name,
                    passing_percentage: c.passing_percentage || 70 // Default to 70
                };
            });
            setCriteriaMap(critMap);

            // Fetch interviews with criteria name
            const { data, error } = await supabase
                .from('interviews')
                .select(`
                    *,
                    candidates(full_name, email),
                    criteria(name)
                `)
                .order('completed_at', { ascending: false, nullsFirst: false });

            if (error) throw error;
            setInterviews(data || []);
        } catch (err) {
            console.error('Error fetching interviews:', err);
        } finally {
            setLoading(false);
        }
    };

    // Group interviews by criteria (Fresher/Experienced)
    const groupedData = {
        Fresher: { qualified: [], notQualified: [] },
        Experienced: { qualified: [], notQualified: [] }
    };

    // Group by criteria name
    interviews.forEach((interview) => {
        const criteriaName = interview.criteria?.name || 'Unknown';
        const passingPct = criteriaMap[interview.criteria_id]?.passing_percentage || 60;

        // Use stored percentage OR calculate on fly (fallback for old records)
        const actualPercentage = interview.percentage ?? (interview.total_questions > 0 ? (interview.score / interview.total_questions) * 100 : 0);

        const isQualified = actualPercentage >= passingPct;

        // Determine if Fresher or Experienced based on criteria name
        let category = 'Fresher';
        if (criteriaName.toLowerCase().includes('experienced') || criteriaName.toLowerCase().includes('experience')) {
            category = 'Experienced';
        }

        if (isQualified) {
            groupedData[category].qualified.push(interview);
        } else {
            groupedData[category].notQualified.push(interview);
        }
    });

    // Calculate KPIs - use dynamic passing percentage per interview
    const totalCandidates = interviews.length;
    const qualified = interviews.filter(i => {
        const passingPct = criteriaMap[i.criteria_id]?.passing_percentage || 60;
        const actualPercentage = i.percentage ?? (i.total_questions > 0 ? (i.score / i.total_questions) * 100 : 0);
        return actualPercentage >= passingPct;
    }).length;
    const notQualified = totalCandidates - qualified;
    const successRate = totalCandidates > 0 ? Math.round((qualified / totalCandidates) * 100) : 0;

    // Filter interviews for search
    const filteredInterviews = interviews.filter(i =>
        i.candidates?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.candidates?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Chart data
    const barChartData = {
        labels: ['Fresher', 'Experienced'],
        datasets: [
            {
                label: 'Qualified',
                data: [
                    groupedData.Fresher.qualified.length,
                    groupedData.Experienced.qualified.length
                ],
                backgroundColor: '#10b981', // Solid green for qualified
                borderColor: '#059669',
                borderWidth: 2,
                borderRadius: 8,
                hoverBackgroundColor: '#059669'
            },
            {
                label: 'Not Qualified',
                data: [
                    groupedData.Fresher.notQualified.length,
                    groupedData.Experienced.notQualified.length
                ],
                backgroundColor: '#ef4444', // Solid red for not qualified
                borderColor: '#dc2626',
                borderWidth: 2,
                borderRadius: 8,
                hoverBackgroundColor: '#dc2626'
            }
        ]
    };

    const doughnutChartData = {
        labels: ['Qualified', 'Not Qualified'],
        datasets: [{
            data: [qualified, notQualified],
            backgroundColor: [
                '#10b981', // Solid green for qualified
                '#ef4444', // Solid red for not qualified
            ],
            borderColor: [
                '#059669',
                '#dc2626',
            ],
            borderWidth: 3,
            hoverBackgroundColor: [
                '#059669',
                '#dc2626',
            ]
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#f8fafc',
                    font: { family: 'Space Grotesk, sans-serif', size: 13, weight: '600' },
                    padding: 15
                }
            },
            tooltip: {
                backgroundColor: 'rgba(20, 24, 36, 0.95)',
                titleColor: '#f8fafc',
                bodyColor: '#94a3b8',
                borderColor: 'rgba(59, 130, 246, 0.5)',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                boxPadding: 6
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                    drawBorder: false
                },
                ticks: {
                    color: '#94a3b8',
                    font: { size: 12, weight: '500' },
                    padding: 8
                }
            },
            y: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                    drawBorder: false
                },
                ticks: {
                    color: '#94a3b8',
                    font: { size: 12, weight: '500' },
                    padding: 8
                },
                beginAtZero: true
            }
        },
        // 3D Effect via shadows
        elements: {
            bar: {
                borderWidth: 2,
                borderRadius: 8,
                shadowOffsetX: 0,
                shadowOffsetY: 4,
                shadowBlur: 12,
                shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    color: '#f8fafc',
                    font: {
                        family: 'Space Grotesk, sans-serif',
                        size: 13,
                        weight: '600'
                    },
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 15,
                    boxWidth: 12,
                    boxHeight: 12
                }
            },
            tooltip: {
                backgroundColor: 'rgba(20, 24, 36, 0.95)',
                titleColor: '#f8fafc',
                bodyColor: '#94a3b8',
                borderColor: 'rgba(59, 130, 246, 0.5)',
                borderWidth: 1,
                padding: 12
            }
        },
        // 3D Effect via shadows and borders
        elements: {
            arc: {
                borderWidth: 3,
                borderColor: 'rgba(10, 14, 26, 0.8)',
                shadowOffsetX: 0,
                shadowOffsetY: 4,
                shadowBlur: 16,
                shadowColor: 'rgba(0, 0, 0, 0.4)'
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-universe flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-3 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400 uppercase tracking-widest text-sm">SYNCING DATA</p>
                </div>
            </div>
        );
    }



    return (
        <div className="min-h-screen relative overflow-x-hidden transition-colors duration-300 bg-universe">
            {/* Deep Space Animated Background - Dark Mode Only */}
            {theme === 'dark' && (
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    {/* Cosmic Orbs */}
                    <div className="absolute w-[600px] h-[600px] rounded-full opacity-30 blur-3xl"
                        style={{
                            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4), transparent 70%)',
                            top: '-10%',
                            left: '-10%',
                            animation: 'float 20s ease-in-out infinite'
                        }}></div>
                    <div className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
                        style={{
                            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4), transparent 70%)',
                            bottom: '-10%',
                            right: '-10%',
                            animation: 'float 25s ease-in-out infinite reverse'
                        }}></div>
                    <div className="absolute w-[400px] h-[400px] rounded-full opacity-25 blur-3xl"
                        style={{
                            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.3), transparent 70%)',
                            top: '40%',
                            left: '50%',
                            animation: 'float 30s ease-in-out infinite'
                        }}></div>

                    {/* Floating Particles - Increased count for premium feel */}
                    {[...Array(30)].map((_, i) => (
                        <div
                            key={i}
                            className="particle absolute rounded-full"
                            style={{
                                width: `${Math.random() * 3 + 1}px`,
                                height: `${Math.random() * 3 + 1}px`,
                                background: `rgba(${Math.random() > 0.5 ? '59, 130, 246' : '139, 92, 246'}, ${Math.random() * 0.3 + 0.2})`,
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 10}s`,
                                animationDuration: `${Math.random() * 20 + 20}s`,
                                boxShadow: `0 0 ${Math.random() * 10 + 5}px rgba(59, 130, 246, 0.3)`
                            }}
                        ></div>
                    ))}

                    {/* Grid Texture */}
                    <div className="absolute inset-0 opacity-20"
                        style={{
                            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                            backgroundSize: '50px 50px',
                            maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
                        }}></div>
                </div>
            )}

            <AppSignature />

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-8">
                {/* AI Command Header - Revolutionary Design */}
                <header className="glass-panel-strong rounded-xl p-8 relative overflow-hidden fade-in-up-smooth">
                    {/* Animated Gradient Background */}
                    <div className="absolute inset-0 opacity-30"
                        style={{
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                            animation: 'gradientShift 10s ease-in-out infinite'
                        }}></div>

                    <div className="relative z-10 flex items-center justify-between flex-wrap gap-6">
                        {/* Left: Dynamic Greeting & AI Insights */}
                        <div className="flex-1 min-w-[300px]">
                            <div className="flex items-center gap-4 mb-3">
                                <img src="/logo.jpg" alt="SDET Logo" className="h-14 w-auto rounded-lg shadow-lg"
                                    style={{ filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.3))' }}
                                    onError={(e) => e.target.style.display = 'none'} />
                                <div>
                                    <h1 className="text-4xl font-black mb-1"
                                        style={{
                                            background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #22d3ee 100%)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            backgroundClip: 'text',
                                            filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.3))'
                                        }}>
                                        {(() => {
                                            const hour = new Date().getHours();
                                            if (hour < 12) return 'Good Morning 👋';
                                            if (hour < 18) return 'Good Afternoon 👋';
                                            return 'Good Evening 👋';
                                        })()}
                                    </h1>
                                    <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>
                                        Hiring Intelligence Dashboard
                                    </p>
                                </div>
                            </div>


                            {/* Status Indicator */}
                            <div className="flex items-center gap-3 mt-4">
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel">
                                    <div className="w-2 h-2 rounded-full pulse-glow-cyan"
                                        style={{ background: '#22d3ee' }}></div>
                                    <span className="text-xs font-semibold" style={{ color: '#22d3ee' }}>
                                        System Active
                                    </span>
                                </div>

                                {notQualified > 0 && (
                                    <div className="px-4 py-2 rounded-full" style={{
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        border: '1px solid rgba(59, 130, 246, 0.2)',
                                        color: '#60a5fa'
                                    }}>
                                        <span className="text-xs font-semibold">
                                            {notQualified} candidates need your decision today
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Health Score & Theme Toggle */}
                        <div className="flex items-center gap-6">


                            {/* Theme Toggle Button */}
                            <button
                                onClick={toggleTheme}
                                className="magnetic-button flex items-center gap-2 px-6 py-3"
                                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                            >
                                {theme === 'dark' ? (
                                    <>
                                        <Sun className="w-5 h-5" />
                                        <span className="font-semibold">Light Mode</span>
                                    </>
                                ) : (
                                    <>
                                        <Moon className="w-5 h-5" />
                                        <span className="font-semibold">Dark Mode</span>
                                    </>
                                )}
                            </button>

                            {/* Date */}
                            <div className="hidden lg:block text-right">
                                <p className="text-xs font-mono text-[var(--text-muted)]">
                                    {new Date().toLocaleDateString(undefined, {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Smart KPI Panels - Next-Generation Design */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Total Candidates Panel */}
                    <div className="gradient-border fade-in-up-smooth delay-100">
                        <div className="glass-panel-strong rounded-lg p-6 h-full">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.2))' }}>
                                    <svg className="w-6 h-6" style={{ color: '#3b82f6' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold px-2 py-1 rounded-full border border-emerald-500/20"
                                        style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
                                        +12%
                                    </span>
                                </div>
                            </div>
                            <h3 className="text-xs uppercase tracking-wider font-bold mb-2 text-[var(--text-secondary)]">
                                Total Candidates
                            </h3>
                            <div className="text-4xl font-black mb-3" style={{
                                background: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}>
                                {totalCandidates}
                            </div>

                        </div>
                    </div>

                    {/* Qualified Panel */}
                    <div className="gradient-border fade-in-up-smooth delay-200">
                        <div className="glass-panel-strong rounded-lg p-6 h-full">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.2))' }}>
                                    <svg className="w-6 h-6" style={{ color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold px-2 py-1 rounded-full border border-emerald-500/20"
                                        style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
                                        +8%
                                    </span>
                                </div>
                            </div>
                            <h3 className="text-xs uppercase tracking-wider font-bold mb-2 text-[var(--text-secondary)]">
                                Qualified
                            </h3>
                            <div className="text-4xl font-black mb-3" style={{
                                background: 'linear-gradient(135deg, #34d399, #10b981)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}>
                                {qualified}
                            </div>

                        </div>
                    </div>

                    {/* Not Qualified Panel */}
                    <div className="gradient-border fade-in-up-smooth delay-300">
                        <div className="glass-panel-strong rounded-lg p-6 h-full">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.2))' }}>
                                    <svg className="w-6 h-6" style={{ color: '#ef4444' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold px-2 py-1 rounded-full border border-rose-500/20"
                                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }}>
                                        -3%
                                    </span>
                                </div>
                            </div>
                            <h3 className="text-xs uppercase tracking-wider font-bold mb-2 text-[var(--text-secondary)]">
                                Not Qualified
                            </h3>
                            <div className="text-4xl font-black mb-3" style={{
                                background: 'linear-gradient(135deg, #f87171, #ef4444)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}>
                                {notQualified}
                            </div>

                        </div>
                    </div>


                </div>

                {/* AI Candidate Intelligence Board */}
                <div className="glass-panel-strong rounded-xl p-6 fade-in-up-smooth delay-500">
                    <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                        <div>
                            <h2 className="text-2xl font-black mb-1" style={{
                                background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}>
                                Candidate Intelligence Board
                            </h2>
                            <p className="text-sm font-medium text-[var(--text-secondary)]">
                                candidate insights and analytics
                            </p>
                        </div>

                        {/* AI Search Bar */}
                        <div className="relative w-full max-w-md">

                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search candidates by name or email..."
                                className="w-full px-4 py-3 rounded-lg text-sm font-medium transition-all glass-input"
                                style={{
                                    color: 'var(--text-main)',
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#60a5fa'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                            />
                        </div>
                    </div>

                    {/* Candidate Table with Premium Styling */}
                    <div className="overflow-x-auto custom-scrollbar rounded-lg" style={{
                        maxHeight: '400px',
                        border: '1px solid var(--glass-border-strong)'
                    }}>
                        <table className="w-full">
                            <thead className="sticky top-0 glass-panel-strong" style={{
                                borderBottom: '1px solid var(--glass-border-strong)'
                            }}>
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">Name</th>
                                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">Status</th>
                                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">Email</th>
                                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">Criteria</th>
                                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInterviews.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                                                    <Search className="w-8 h-8" style={{ color: '#60a5fa' }} />
                                                </div>
                                                <p className="text-sm font-medium" style={{ color: '#64748b' }}>
                                                    No matching candidates found
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredInterviews.map((interview) => {
                                        const criteriaName = interview.criteria?.name || 'Unknown';
                                        const passingPct = criteriaMap[interview.criteria_id]?.passing_percentage || 60;
                                        const actualPercentage = interview.percentage ?? (interview.total_questions > 0 ? (interview.score / interview.total_questions) * 100 : 0);
                                        const isQualified = actualPercentage >= passingPct;

                                        return (
                                            <tr key={interview.id} className="group transition-all" style={{
                                                borderBottom: '1px solid var(--glass-border)'
                                            }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                                <td className="px-4 py-3 font-semibold text-[var(--text-main)]">
                                                    {interview.candidates?.full_name || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isQualified ? (
                                                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide" style={{
                                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                            color: '#ffffff',
                                                            border: '1px solid #059669',
                                                            boxShadow: '0 0 20px rgba(16, 185, 129, 0.4), 0 4px 8px rgba(16, 185, 129, 0.3)',
                                                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                                                            display: 'inline-block'
                                                        }}>
                                                            ✓ Qualified
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide" style={{
                                                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                            color: '#ffffff',
                                                            border: '1px solid #dc2626',
                                                            boxShadow: '0 0 20px rgba(239, 68, 68, 0.4), 0 4px 8px rgba(239, 68, 68, 0.3)',
                                                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                                                            display: 'inline-block'
                                                        }}>
                                                            ✗ Not Qualified
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                                                    {interview.candidates?.email || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="px-3 py-1 rounded-lg text-xs font-bold" style={getCriteriaColor(criteriaName)}>
                                                        {criteriaName}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-mono" style={{ color: '#64748b' }}>
                                                    {interview.completed_at ? new Date(interview.completed_at).toLocaleString() : 'In Progress'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Charts with 3D Effects */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-in-up-smooth delay-600">
                    {/* Bar Chart with 3D Effect */}
                    <div className="lg:col-span-2 glass-panel-strong rounded-xl p-6 relative" style={{
                        transform: 'perspective(1000px) rotateX(2deg)',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 10px 20px rgba(16, 185, 129, 0.1)',
                        transition: 'all 0.3s ease'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.5), 0 15px 30px rgba(16, 185, 129, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'perspective(1000px) rotateX(2deg)';
                            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.4), 0 10px 20px rgba(16, 185, 129, 0.1)';
                        }}>
                        <h3 className="text-lg font-bold mb-4" style={{
                            background: 'linear-gradient(135deg, #60a5fa, #22d3ee)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}>
                            Qualification by Criteria
                        </h3>
                        <div style={{ height: '300px' }}>
                            <Bar data={barChartData} options={chartOptions} />
                        </div>
                    </div>

                    {/* Doughnut Chart with 3D Effect */}
                    <div className="glass-panel-strong rounded-xl p-6 relative" style={{
                        transform: 'perspective(1000px) rotateX(2deg)',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 10px 20px rgba(139, 92, 246, 0.1)',
                        transition: 'all 0.3s ease'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.5), 0 15px 30px rgba(139, 92, 246, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'perspective(1000px) rotateX(2deg)';
                            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.4), 0 10px 20px rgba(139, 92, 246, 0.1)';
                        }}>
                        <h3 className="text-lg font-bold mb-4" style={{
                            background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}>
                            Overall Distribution
                        </h3>
                        <div style={{ height: '300px' }}>
                            <Doughnut data={doughnutChartData} options={doughnutOptions} />
                        </div>
                    </div>
                </div>

                {/* Fresher and Experienced Panels */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Fresher Panel */}
                    <div className="glass-panel border border-[var(--glass-border)] rounded-3xl overflow-hidden shadow-lg h-[500px] flex flex-col">
                        <div className="px-6 py-4 border-b border-[var(--glass-border)] flex justify-between items-center bg-cyan-500/5 backdrop-blur-md">
                            <h3 className="text-lg font-bold text-[var(--text-main)] tracking-wide flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                                FRESHER
                            </h3>
                            <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--glass-border)] px-2 py-1 rounded border border-[var(--glass-border)]">
                                {groupedData.Fresher.qualified.length + groupedData.Fresher.notQualified.length} Total
                            </span>
                        </div>
                        <div className="flex-1 grid grid-cols-2 overflow-hidden">
                            <div className="overflow-y-auto p-4 custom-scrollbar">
                                <div className="text-xs uppercase tracking-wider font-bold text-emerald-400 mb-3 sticky top-0 bg-[var(--glass-bg-strong)] backdrop-blur-md z-10 py-2 border-b border-emerald-500/20 flex items-center gap-2 shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                                    Qualified
                                </div>
                                {groupedData.Fresher.qualified.length === 0 ? (
                                    <div className="text-[var(--text-muted)] italic text-sm text-center py-8 opacity-60">Empty</div>
                                ) : (
                                    groupedData.Fresher.qualified.map(interview => {
                                        const percentage = interview.percentage || (interview.total_questions > 0 ? Math.round((interview.score / interview.total_questions) * 100) : 0);
                                        return (
                                            <div key={interview.id} className="mb-3 p-3 bg-[var(--input-bg)] border-l-2 border-emerald-500 rounded-r-xl text-sm group hover:bg-emerald-500/5 transition-all hover:translate-x-1 duration-300 shadow-sm hover:shadow-md">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="font-semibold text-[var(--text-main)] group-hover:text-emerald-300 transition-colors">{interview.candidates?.full_name}</div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        {interview.question_set ? (
                                                            <span className="text-[10px] bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20 whitespace-nowrap">
                                                                Set: {interview.question_set}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] bg-slate-500/10 text-slate-400 px-1.5 py-0.5 rounded border border-slate-500/20 whitespace-nowrap">
                                                                No Set
                                                            </span>
                                                        )}
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap ${(interview.status === 'completed' || interview.status === 'in_progress') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                            }`}>
                                                            {interview.status === 'in_progress' ? 'COMPLETED *' :
                                                                (interview.metadata?.auto_submitted ? 'COMPLETED **' :
                                                                    (interview.status ? interview.status.replace('_', ' ').toUpperCase() : 'PENDING'))}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-[var(--text-muted)] mb-2 truncate opacity-80">{interview.candidates?.email}</div>
                                                <div className="flex justify-between items-center text-xs border-t border-[var(--glass-border)] pt-2 mt-1 border-dashed">
                                                    <span className="text-[var(--text-muted)] font-mono opacity-70">{interview.completed_at ? new Date(interview.completed_at).toLocaleDateString() : 'N/A'}</span>

                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <div className="overflow-y-auto p-4 border-l border-[var(--glass-border)] custom-scrollbar">
                                <div className="text-xs uppercase tracking-wider font-bold text-rose-400 mb-3 sticky top-0 bg-[var(--glass-bg-strong)] backdrop-blur-md z-10 py-2 border-b border-rose-500/20 flex items-center gap-2 shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
                                    Not Qualified
                                </div>
                                {groupedData.Fresher.notQualified.length === 0 ? (
                                    <div className="text-[var(--text-muted)] italic text-sm text-center py-8 opacity-60">Empty</div>
                                ) : (
                                    groupedData.Fresher.notQualified.map(interview => {
                                        const percentage = interview.percentage || (interview.total_questions > 0 ? Math.round((interview.score / interview.total_questions) * 100) : 0);
                                        return (
                                            <div key={interview.id} className="mb-3 p-3 bg-[var(--input-bg)] border-l-2 border-rose-500 rounded-r-xl text-sm group hover:bg-rose-500/5 transition-all hover:translate-x-1 duration-300 shadow-sm hover:shadow-md">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="font-semibold text-[var(--text-main)] group-hover:text-rose-300 transition-colors">{interview.candidates?.full_name}</div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        {interview.question_set ? (
                                                            <span className="text-[10px] bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20 whitespace-nowrap">
                                                                Set: {interview.question_set}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] bg-slate-500/10 text-slate-400 px-1.5 py-0.5 rounded border border-slate-500/20 whitespace-nowrap">
                                                                No Set
                                                            </span>
                                                        )}
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap ${(interview.status === 'completed' || interview.status === 'in_progress') ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                            }`}>
                                                            {interview.status === 'in_progress' ? 'COMPLETED *' :
                                                                (interview.metadata?.auto_submitted ? 'COMPLETED **' :
                                                                    (interview.status ? interview.status.replace('_', ' ').toUpperCase() : 'PENDING'))}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-[var(--text-muted)] mb-2 truncate opacity-80">{interview.candidates?.email}</div>
                                                <div className="flex justify-between items-center text-xs border-t border-[var(--glass-border)] pt-2 mt-1 border-dashed">
                                                    <span className="text-[var(--text-muted)] font-mono opacity-70">{interview.completed_at ? new Date(interview.completed_at).toLocaleDateString() : 'N/A'}</span>

                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Experienced Panel */}
                    <div className="glass-panel border border-[var(--glass-border)] rounded-3xl overflow-hidden shadow-lg h-[500px] flex flex-col">
                        <div className="px-6 py-4 border-b border-[var(--glass-border)] flex justify-between items-center bg-purple-500/5 backdrop-blur-md">
                            <h3 className="text-lg font-bold text-[var(--text-main)] tracking-wide flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                                EXPERIENCED
                            </h3>
                            <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--glass-border)] px-2 py-1 rounded border border-[var(--glass-border)]">
                                {groupedData.Experienced.qualified.length + groupedData.Experienced.notQualified.length} Total
                            </span>
                        </div>
                        <div className="flex-1 grid grid-cols-2 overflow-hidden">
                            <div className="overflow-y-auto p-4 custom-scrollbar">
                                <div className="text-xs uppercase tracking-wider font-bold text-emerald-400 mb-3 sticky top-0 bg-[var(--glass-bg-strong)] backdrop-blur-md z-10 py-2 border-b border-emerald-500/20 flex items-center gap-2 shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                                    Qualified
                                </div>
                                {groupedData.Experienced.qualified.length === 0 ? (
                                    <div className="text-[var(--text-muted)] italic text-sm text-center py-8 opacity-60">Empty</div>
                                ) : (
                                    groupedData.Experienced.qualified.map(interview => {
                                        const percentage = interview.percentage || (interview.total_questions > 0 ? Math.round((interview.score / interview.total_questions) * 100) : 0);
                                        return (
                                            <div key={interview.id} className="mb-3 p-3 bg-[var(--input-bg)] border-l-2 border-emerald-500 rounded-r-xl text-sm group hover:bg-emerald-500/5 transition-all hover:translate-x-1 duration-300 shadow-sm hover:shadow-md">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="font-semibold text-[var(--text-main)] group-hover:text-emerald-300 transition-colors">{interview.candidates?.full_name}</div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        {interview.question_set ? (
                                                            <span className="text-[10px] bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20 whitespace-nowrap">
                                                                Set: {interview.question_set}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] bg-slate-500/10 text-slate-400 px-1.5 py-0.5 rounded border border-slate-500/20 whitespace-nowrap">
                                                                No Set
                                                            </span>
                                                        )}
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap ${(interview.status === 'completed' || interview.status === 'in_progress') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                            }`}>
                                                            {interview.status === 'in_progress' ? 'COMPLETED *' :
                                                                (interview.metadata?.auto_submitted ? 'COMPLETED **' :
                                                                    (interview.status ? interview.status.replace('_', ' ').toUpperCase() : 'PENDING'))}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-[var(--text-muted)] mb-2 truncate opacity-80">{interview.candidates?.email}</div>
                                                <div className="flex justify-between items-center text-xs border-t border-[var(--glass-border)] pt-2 mt-1 border-dashed">
                                                    <span className="text-[var(--text-muted)] font-mono opacity-70">{interview.completed_at ? new Date(interview.completed_at).toLocaleDateString() : 'N/A'}</span>

                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <div className="overflow-y-auto p-4 border-l border-[var(--glass-border)] custom-scrollbar">
                                <div className="text-xs uppercase tracking-wider font-bold text-rose-400 mb-3 sticky top-0 bg-[var(--glass-bg-strong)] backdrop-blur-md z-10 py-2 border-b border-rose-500/20 flex items-center gap-2 shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
                                    Not Qualified
                                </div>
                                {groupedData.Experienced.notQualified.length === 0 ? (
                                    <div className="text-[var(--text-muted)] italic text-sm text-center py-8 opacity-60">Empty</div>
                                ) : (
                                    groupedData.Experienced.notQualified.map(interview => {
                                        const percentage = interview.percentage || (interview.total_questions > 0 ? Math.round((interview.score / interview.total_questions) * 100) : 0);
                                        return (
                                            <div key={interview.id} className="mb-3 p-3 bg-[var(--input-bg)] border-l-2 border-rose-500 rounded-r-xl text-sm group hover:bg-rose-500/5 transition-all hover:translate-x-1 duration-300 shadow-sm hover:shadow-md">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="font-semibold text-[var(--text-main)] group-hover:text-rose-300 transition-colors">{interview.candidates?.full_name}</div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        {interview.question_set ? (
                                                            <span className="text-[10px] bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20 whitespace-nowrap">
                                                                Set: {interview.question_set}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] bg-slate-500/10 text-slate-400 px-1.5 py-0.5 rounded border border-slate-500/20 whitespace-nowrap">
                                                                No Set
                                                            </span>
                                                        )}
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap ${(interview.status === 'completed' || interview.status === 'in_progress') ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                            }`}>
                                                            {interview.status === 'in_progress' ? 'COMPLETED *' :
                                                                (interview.metadata?.auto_submitted ? 'COMPLETED **' :
                                                                    (interview.status ? interview.status.replace('_', ' ').toUpperCase() : 'PENDING'))}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-[var(--text-muted)] mb-2 truncate opacity-80">{interview.candidates?.email}</div>
                                                <div className="flex justify-between items-center text-xs border-t border-[var(--glass-border)] pt-2 mt-1 border-dashed">
                                                    <span className="text-[var(--text-muted)] font-mono opacity-70">{interview.completed_at ? new Date(interview.completed_at).toLocaleDateString() : 'N/A'}</span>

                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

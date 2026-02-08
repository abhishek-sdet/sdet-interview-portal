import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function CriteriaSelection() {
    const navigate = useNavigate();
    const [criteria, setCriteria] = useState([]);
    const [selectedCriteria, setSelectedCriteria] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [candidateName, setCandidateName] = useState('');

    useEffect(() => {
        // Check if candidate is registered
        const candidateId = sessionStorage.getItem('candidateId');
        const name = sessionStorage.getItem('candidateName');

        if (!candidateId) {
            navigate('/');
            return;
        }

        setCandidateName(name || 'Candidate');
        fetchCriteria();
    }, [navigate]);

    const fetchCriteria = async () => {
        try {
            const { data, error: fetchError } = await supabase
                .from('criteria')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (fetchError) throw fetchError;
            setCriteria(data || []);
        } catch (err) {
            console.error('Error fetching criteria:', err);
            setError('Failed to load interview categories. Please refresh the page.');
        } finally {
            setLoading(false);
        }
    };

    const handleStartInterview = async () => {
        if (!selectedCriteria) {
            setError('Please select an interview category');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const candidateId = sessionStorage.getItem('candidateId');

            // Create interview session
            const { data, error: insertError } = await supabase
                .from('interviews')
                .insert([
                    {
                        candidate_id: candidateId,
                        criteria_id: selectedCriteria.id,
                        status: 'in_progress'
                    }
                ])
                .select()
                .single();

            if (insertError) throw insertError;

            // Store interview ID and criteria info
            sessionStorage.setItem('interviewId', data.id);
            sessionStorage.setItem('criteriaId', selectedCriteria.id);
            sessionStorage.setItem('passingPercentage', selectedCriteria.passing_percentage);

            // Navigate to category selection
            navigate('/category-selection', {
                state: {
                    candidateData: {
                        id: candidateId,
                        name: candidateName
                    },
                    criteriaId: selectedCriteria.id
                }
            });
        } catch (err) {
            console.error('Error starting interview:', err);
            setError('Failed to start interview. Please try again.');
            setLoading(false);
        }
    };

    if (loading && criteria.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading interview categories...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl top-10 left-10 animate-pulse"></div>
                <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl bottom-10 right-10 animate-pulse delay-1000"></div>
            </div>

            {/* Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]"></div>

            {/* Content */}
            <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-2 font-display">
                        Welcome, {candidateName}!
                    </h1>
                    <p className="text-slate-400">Select your interview category to begin</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center">
                        {error}
                    </div>
                )}

                {/* Criteria Cards */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {criteria.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setSelectedCriteria(item)}
                            disabled={loading}
                            className={`
                relative p-6 rounded-2xl border-2 transition-all text-left
                ${selectedCriteria?.id === item.id
                                    ? 'bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/50'
                                    : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
                        >
                            {/* Selection Indicator */}
                            <div className={`
                absolute top-4 right-4 w-6 h-6 rounded-full border-2 transition-all
                ${selectedCriteria?.id === item.id
                                    ? 'bg-cyan-400 border-cyan-400'
                                    : 'border-white/30'
                                }
              `}>
                                {selectedCriteria?.id === item.id && (
                                    <svg className="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>

                            <h3 className="text-xl font-semibold text-white mb-2 pr-8">
                                {item.name}
                            </h3>
                            <p className="text-slate-400 text-sm mb-4">
                                {item.description}
                            </p>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="px-3 py-1 bg-white/10 rounded-full text-cyan-400 font-medium">
                                    Passing: {item.passing_percentage}%
                                </span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* No Criteria Available */}
                {criteria.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <div className="inline-block p-4 bg-white/5 rounded-full mb-4">
                            <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-slate-400">No interview categories available at the moment.</p>
                    </div>
                )}

                {/* Start Button */}
                {criteria.length > 0 && (
                    <div className="text-center">
                        <button
                            onClick={handleStartInterview}
                            disabled={!selectedCriteria || loading}
                            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {loading ? 'Starting Interview...' : 'Start Interview'}
                        </button>
                    </div>
                )}
            </div>

            {/* Signature */}
            <div className="fixed bottom-4 left-4 font-script text-white/10 text-sm pointer-events-none select-none">
                AJ
            </div>
        </div>
    );
}

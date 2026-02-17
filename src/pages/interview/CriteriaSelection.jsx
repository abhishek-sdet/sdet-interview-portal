import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle2, Circle, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CriteriaSelection() {
    const navigate = useNavigate();
    const [criteria, setCriteria] = useState([]);
    const [selectedCriteria, setSelectedCriteria] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [candidateName, setCandidateName] = useState('');
    const [mounted, setMounted] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [pendingCriteria, setPendingCriteria] = useState(null);

    useEffect(() => {
        setMounted(true);
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

            // Navigate to set selection
            navigate('/set-selection', {
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
            <div className="min-h-screen w-full bg-universe flex items-center justify-center font-sans text-slate-100">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-brand-blue animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Loading experience levels...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-universe relative overflow-y-auto overflow-x-hidden font-sans text-slate-100 selection:bg-brand-orange selection:text-white">

            {/* Active Background Animation */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
                <div className="grid-texture"></div>
            </div>

            {/* Scrollable Content Wrapper */}
            <div className="min-h-full w-full flex items-center justify-center p-4 lg:p-8">
                {/* Main Content */}
                <div className={`relative z-10 w-full max-w-4xl mx-auto transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

                    {/* Header */}
                    <div className="text-center mb-12 sm:mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-4">
                            <span className="block text-white">Welcome, {candidateName}!</span>
                        </h1>
                        <p className="text-lg text-slate-400 font-light">
                            Select your experience level to customize your interview.
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center flex items-center justify-center gap-2">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                            {error}
                        </div>
                    )}

                    {/* Criteria Selection Grid */}
                    <div className="grid md:grid-cols-2 gap-6 mb-12">
                        {criteria.map((item) => {
                            const isSelected = selectedCriteria?.id === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        // Check if this is an experienced criteria
                                        const isExperienced = item.name?.toLowerCase().includes('experienced') ||
                                            item.name?.toLowerCase().includes('testing background');

                                        if (isExperienced) {
                                            setPendingCriteria(item);
                                            setShowConfirmation(true);
                                        } else {
                                            setSelectedCriteria(item);
                                        }
                                    }}
                                    disabled={loading}
                                    className={`
                                    relative p-8 rounded-3xl border text-left group transition-all duration-500 overflow-hidden
                                    ${isSelected
                                            ? 'bg-brand-blue/10 border-brand-blue shadow-2xl shadow-brand-blue/20 scale-[1.02]'
                                            : 'bg-white/5 border-white/10 hover:border-brand-blue/30 hover:bg-white/10 hover:scale-[1.01]'
                                        }
                                `}
                                >
                                    {/* Glow Effect */}
                                    {isSelected && (
                                        <div className="absolute inset-0 bg-brand-blue/5 animate-pulse"></div>
                                    )}

                                    <div className="relative z-10 flex items-start justify-between gap-4">
                                        <div className="space-y-4">
                                            <h3 className={`text-xl font-bold transition-colors ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                                                {item.name}
                                            </h3>
                                            {item.sub_heading && (
                                                <div className={`text-sm font-medium mb-1 ${isSelected ? 'text-blue-300' : 'text-blue-400/80 group-hover:text-blue-300'}`}>
                                                    {item.sub_heading}
                                                </div>
                                            )}
                                            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                                                {item.description || 'Suitable for this experience level.'}
                                            </p>
                                        </div>

                                        {/* Selection Radio */}
                                        <div className={`
                                        w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300
                                        ${isSelected
                                                ? 'border-brand-blue bg-brand-blue'
                                                : 'border-slate-600 group-hover:border-slate-400'
                                            }
                                    `}>
                                            {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                                            {!isSelected && <Circle className="w-4 h-4 text-transparent" />}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Action Button */}
                    <div className="flex justify-center">
                        <button
                            onClick={handleStartInterview}
                            disabled={loading || !selectedCriteria}
                            className={`
                            group relative overflow-hidden rounded-xl py-4 px-12 transition-all duration-300 shadow-lg
                            ${loading || !selectedCriteria
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                                    : 'bg-gradient-to-r from-brand-blue to-[#004282] hover:to-brand-blue text-white shadow-brand-blue/20 hover:shadow-brand-blue/40 transform hover:-translate-y-0.5'
                                }
                        `}
                        >
                            {!loading && selectedCriteria && (
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                            )}
                            <span className="relative flex items-center justify-center gap-2 font-bold text-lg tracking-wide">
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Starting Interview...
                                    </>
                                ) : (
                                    'Start Interview'
                                )}
                            </span>
                        </button>
                    </div>

                    {/* Confirmation Modal for Experienced Selection */}
                    <AnimatePresence>
                        {showConfirmation && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                {/* Backdrop */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowConfirmation(false)}
                                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                                />

                                {/* Modal */}
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                    className="relative bg-[#0b101b] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                                >
                                    {/* Header */}
                                    <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                                                <AlertTriangle size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">Confirm Selection</h3>
                                                <p className="text-sm text-slate-400">Please verify your choice</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowConfirmation(false)}
                                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6">
                                        <p className="text-slate-300 text-lg mb-2">
                                            Are you sure you want to opt for <span className="font-bold text-white">Experienced</span>?
                                        </p>
                                        <p className="text-slate-400 text-sm">
                                            This will customize your interview for candidates with testing experience.
                                        </p>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="p-6 border-t border-white/5 bg-white/5 flex gap-4">
                                        <button
                                            onClick={() => setShowConfirmation(false)}
                                            className="flex-1 px-4 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all text-sm uppercase tracking-wide"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedCriteria(pendingCriteria);
                                                setShowConfirmation(false);
                                                setPendingCriteria(null);
                                            }}
                                            className="flex-1 px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-brand-blue to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/20 transition-all text-sm uppercase tracking-wide"
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

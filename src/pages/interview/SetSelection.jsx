import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowRight, Layers, FileText, CheckCircle2, Database, Sparkles } from 'lucide-react';

export default function SetSelection() {
    const navigate = useNavigate();
    const location = useLocation();
    const [sets, setSets] = useState([]);
    const [selectedSet, setSelectedSet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Get previous state
    const candidateData = location.state?.candidateData;
    const criteriaId = location.state?.criteriaId;

    useEffect(() => {
        setMounted(true);
        if (!candidateData || !criteriaId) {
            navigate('/');
            return;
        }

        fetchSets();
    }, [navigate, candidateData, criteriaId]);

    const fetchSets = async () => {
        try {
            const { data, error } = await supabase
                .from('questions')
                .select('set_name')
                .eq('criteria_id', criteriaId)
                .eq('is_active', true);

            if (error) throw error;

            const uniqueSetNames = [...new Set(data.map(q => q.set_name).filter(Boolean))];

            const availableSets = uniqueSetNames.map((name, index) => ({
                id: name,
                name: name,
                icon: index % 2 === 0 ? FileText : Layers,
                color: index % 2 === 0 ? 'text-cyan-400' : 'text-purple-400',
                gradient: index % 2 === 0 ? 'from-cyan-500/20 to-blue-500/20' : 'from-purple-500/20 to-pink-500/20'
            })).sort((a, b) => a.name.localeCompare(b.name));

            setSets(availableSets);
        } catch (err) {
            console.error('Error fetching sets:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSetSelection = (set) => {
        setSelectedSet(set);
    };

    const handleContinue = () => {
        if (!selectedSet) return;

        setLoading(true);

        sessionStorage.setItem('selectedSet', selectedSet.name);
        sessionStorage.removeItem('selectedCategories');

        setTimeout(() => {
            navigate('/quiz', {
                state: {
                    candidateData,
                    criteriaId,
                    selectedSet: selectedSet.name
                }
            });
        }, 800);
    };

    if (loading && sets.length === 0) {
        return (
            <div className="min-h-screen w-full bg-universe flex items-center justify-center font-sans text-slate-100">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-brand-blue animate-spin mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Loading available sets...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-universe flex flex-col items-center justify-center p-4 relative font-sans text-slate-100 selection:bg-brand-orange selection:text-white">

            {/* Active Background Animation */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
                <div className="grid-texture"></div>
            </div>

            {/* Main Content */}
            <div className={`relative z-10 w-full max-w-3xl mx-auto transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

                {/* Header */}
                <div className="text-center mb-8 sm:mb-10">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-2">
                        <span className="block text-white">Select Question Set</span>
                    </h1>
                    <p className="text-sm md:text-base text-slate-400 font-light max-w-xl mx-auto">
                        Please choose your assigned question set to proceed.
                    </p>
                </div>

                {/* Sets Grid */}
                {sets.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-10">
                        {sets.map((set) => {
                            const isSelected = selectedSet?.id === set.id;
                            const Icon = set.icon;

                            return (
                                <button
                                    key={set.id}
                                    onClick={() => handleSetSelection(set)}
                                    className={`
                                        relative group block w-full outline-none
                                        ${isSelected ? 'scale-[1.02]' : 'hover:scale-[1.01]'}
                                        transition-transform duration-300
                                    `}
                                >
                                    {/* Glass Container */}
                                    <div className={`
                                        relative rounded-2xl overflow-hidden backdrop-blur-xl border transition-all duration-300
                                        ${isSelected
                                            ? 'bg-slate-900/60 border-brand-blue shadow-lg shadow-brand-blue/10'
                                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                        }
                                    `}>
                                        {/* Premium Gradient Overlay */}
                                        <div className={`absolute inset-0 bg-gradient-to-br ${set.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>

                                        {/* Inner Glow for Selected State */}
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-brand-blue/5 animate-pulse"></div>
                                        )}

                                        <div className="relative p-6 flex flex-col items-center justify-center text-center min-h-[180px]">

                                            {/* Icon with Glass Backing */}
                                            <div className={`
                                                w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg backdrop-blur-md border border-white/10
                                                ${isSelected ? 'bg-brand-blue text-white' : 'bg-white/5 text-slate-300 group-hover:scale-110 transition-transform duration-500'}
                                            `}>
                                                <Icon className="w-6 h-6" />
                                            </div>

                                            <h3 className={`text-2xl font-bold mb-1 tracking-tight ${isSelected ? 'text-white' : 'text-slate-200'} group-hover:text-white transition-colors`}>
                                                {set.name}
                                            </h3>

                                            {/* Decorative Sparkle for Premium Feel */}
                                            {isSelected && (
                                                <Sparkles className="absolute top-4 left-4 w-4 h-4 text-brand-orange animate-spin-slow opacity-75" />
                                            )}

                                            {/* Selection Checkbox */}
                                            <div className={`
                                                absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300
                                                ${isSelected
                                                    ? 'border-brand-blue bg-brand-blue shadow-lg shadow-brand-blue/50'
                                                    : 'border-slate-600 group-hover:border-slate-400'
                                                }
                                            `}>
                                                {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                                            </div>
                                        </div>

                                        {/* Bottom Action Bar */}
                                        <div className={`
                                            w-full py-3 text-[10px] font-bold tracking-widest uppercase flex items-center justify-center gap-1.5 transition-colors border-t border-white/5
                                            ${isSelected ? 'bg-brand-blue/20 text-brand-blue' : 'bg-black/20 text-slate-500 group-hover:text-slate-300'}
                                        `}>
                                            {isSelected ? 'Selected' : 'Click to Select'}
                                            <ArrowRight className={`w-3 h-3 ${isSelected ? 'translate-x-0.5' : ''} transition-transform`} />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 max-w-lg mx-auto mb-8">
                        <div className="p-3 rounded-full bg-slate-800/50 inline-block mb-3">
                            <Database className="w-6 h-6 text-slate-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">No Question Sets Found</h3>
                        <p className="text-sm text-slate-400">There are no active generic question sets available for this level.</p>
                    </div>
                )}

                {/* Confirm Button */}
                <div className="flex justify-center w-full">
                    <button
                        onClick={handleContinue}
                        disabled={loading || !selectedSet}
                        className={`
                            group relative overflow-hidden rounded-xl py-3.5 px-12 transition-all duration-300 shadow-xl
                            ${loading || !selectedSet
                                ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed opacity-50 border border-white/5'
                                : 'bg-gradient-to-r from-brand-blue to-[#004282] hover:to-brand-blue text-white shadow-brand-blue/30 hover:shadow-brand-blue/50 transform hover:-translate-y-0.5'
                            }
                        `}
                    >
                        {!loading && selectedSet && (
                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                        )}
                        <span className="relative flex items-center justify-center gap-2 font-bold text-base tracking-wide">
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Starting...
                                </>
                            ) : (
                                <>
                                    Start Assessment
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}

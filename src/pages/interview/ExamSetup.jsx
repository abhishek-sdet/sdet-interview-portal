import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Layers, ArrowRight, CheckCircle2, Code2, BookOpen } from 'lucide-react';

export default function ExamSetup() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [sets, setSets] = useState([]);
    const [selectedSet, setSelectedSet] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [isLocked, setIsLocked] = useState(false);

    // Subject options for Elective section
    // In a real app, we could fetch these dynamically if valid subjects are stored in DB
    // For now, these are the standard electives derived from requirements
    const electives = [
        { id: 'java', name: 'Java Programming', icon: Code2 },
        { id: 'python', name: 'Python Programming', icon: Code2 },
        { id: 'csharp', name: 'C# Programming', icon: Code2 },
        { id: 'testing', name: 'Manual Testing', icon: CheckCircle2 },
        { id: 'automation', name: 'Automation Testing', icon: Code2 },
        { id: 'sql', name: 'SQL & Database', icon: Layers }
    ];

    const candidateData = location.state?.candidateData;
    const criteriaId = location.state?.criteriaId;

    useEffect(() => {
        if (!candidateData || !criteriaId) {
            navigate('/');
            return;
        }

        // Check for existing lock
        const savedConfig = sessionStorage.getItem('examConfig');
        if (savedConfig) {
            try {
                const config = JSON.parse(savedConfig);
                setSelectedSet(config.set);
                setSelectedSubject(config.subject);
                setIsLocked(true);
            } catch (e) {
                console.error('Error parsing saved config', e);
            }
        }

        fetchAvailableSets();
    }, []);

    const fetchAvailableSets = async () => {
        try {
            setLoading(true);
            // Fetch distinct categories (Sets) for this criteria
            const { data, error } = await supabase
                .from('questions')
                .select('category')
                .eq('criteria_id', criteriaId)
                .eq('is_active', true);

            if (error) throw error;

            // Extract unique sets
            const uniqueSets = [...new Set(data.map(q => q.category).filter(Boolean))];
            setSets(uniqueSets.sort());

            // Auto-select if only one set exists
            if (uniqueSets.length === 1) {
                setSelectedSet(uniqueSets[0]);
            }
        } catch (err) {
            console.error('Failed to load sets:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStartExam = () => {
        if (!selectedSet || !selectedSubject) {
            alert('Please select a Question Set and an Elective Subject');
            return;
        }

        // Store selection in session
        sessionStorage.setItem('examConfig', JSON.stringify({
            set: selectedSet,
            subject: selectedSubject
        }));

        // Navigate to Quiz with config
        navigate('/quiz', {
            state: {
                candidateData,
                criteriaId,
                examConfig: {
                    set: selectedSet,
                    subject: selectedSubject
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
            </div>
        );
    }

    return (
        <div className="h-full bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 overflow-y-auto">
            <div className="max-w-4xl mx-auto py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-cyan-500/20 rounded-full shadow-lg shadow-cyan-500/30">
                            <BookOpen size={40} className="text-cyan-400" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
                        Exam Configuration
                    </h1>
                    <p className="text-slate-300 text-lg max-w-2xl mx-auto">
                        Customize your assessment by selecting the appropriate Question Set and your preferred Elective Subject.
                    </p>
                </div>

                {isLocked && (
                    <div className="max-w-4xl mx-auto mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 text-amber-200">
                        <CheckCircle2 className="shrink-0" />
                        <div>
                            <p className="font-bold">Selection Locked</p>
                            <p className="text-sm opacity-80">You have already confirmed your choices. You cannot change them now.</p>
                        </div>
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    {/* Step 1: Select Set */}
                    <div className="glass-panel p-8 rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-black font-bold">1</div>
                            <h3 className="text-xl font-bold text-white">Select Question Set</h3>
                        </div>

                        {sets.length > 0 ? (
                            <div className="space-y-3">
                                {sets.map((set) => (
                                    <button
                                        key={set}
                                        onClick={() => !isLocked && setSelectedSet(set)}
                                        disabled={isLocked}
                                        className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${selectedSet === set
                                            ? 'bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/20'
                                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Layers size={20} className={selectedSet === set ? 'text-cyan-400' : 'text-slate-500'} />
                                            <span className={`font-semibold ${selectedSet === set ? 'text-white' : 'text-slate-300'}`}>
                                                {set}
                                            </span>
                                        </div>
                                        {selectedSet === set && <CheckCircle2 size={20} className="text-cyan-400" />}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm">
                                No Question Sets found. Please contact the administrator.
                            </div>
                        )}
                    </div>

                    {/* Step 2: Select Elective */}
                    <div className="glass-panel p-8 rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">2</div>
                            <h3 className="text-xl font-bold text-white">Choose Elective Subject</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {electives.map((subject) => {
                                const Icon = subject.icon;
                                return (
                                    <button
                                        key={subject.id}
                                        onClick={() => !isLocked && setSelectedSubject(subject.id)}
                                        disabled={isLocked}
                                        className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all group ${selectedSubject === subject.id
                                            ? 'bg-purple-500/20 border-purple-400 shadow-lg shadow-purple-500/20'
                                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon size={20} className={`transition-colors ${selectedSubject === subject.id ? 'text-purple-400' : 'text-slate-500 group-hover:text-purple-300'}`} />
                                            <span className={`font-semibold ${selectedSubject === subject.id ? 'text-white' : 'text-slate-300'}`}>
                                                {subject.name}
                                            </span>
                                        </div>
                                        {selectedSubject === subject.id && <CheckCircle2 size={20} className="text-purple-400" />}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="mt-4 text-xs text-slate-400">
                            * You will be tested on <strong>General Aptitude</strong> (Mandatory) + your selected <strong>Elective Subject</strong>.
                        </p>
                    </div>
                </div>

                {/* Continue Button */}
                <div className="flex justify-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                    <button
                        onClick={handleStartExam}
                        disabled={!selectedSet || !selectedSubject}
                        className="flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-500 text-white font-bold text-lg rounded-xl shadow-xl shadow-blue-500/30 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                    >
                        Start Examination
                        <ArrowRight size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
}

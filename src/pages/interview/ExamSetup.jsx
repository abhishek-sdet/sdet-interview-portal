import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Layers, ArrowRight, CheckCircle2, Code2, BookOpen } from 'lucide-react';

export default function ExamSetup() {
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [isLocked, setIsLocked] = useState(false);

    // Subject options for Elective section
    const electives = [
        { id: 'java', name: 'Java Programming', icon: Code2 },
        { id: 'python', name: 'Python Programming', icon: Code2 },
        { id: 'database', name: 'SQL & Database', icon: Layers },
        { id: 'javascript', name: 'JavaScript', icon: Code2 }
    ];

    const candidateData = location.state?.candidateData;
    const criteriaId = location.state?.criteriaId;

    useEffect(() => {
        if (!candidateData || !criteriaId) {
            const savedCandidateId = localStorage.getItem('candidateId');
            const savedCriteriaId = localStorage.getItem('criteriaId');

            if (!savedCandidateId || !savedCriteriaId) {
                navigate('/');
                return;
            }
        }

        const savedConfig = localStorage.getItem('examConfig');
        if (savedConfig) {
            try {
                const config = JSON.parse(savedConfig);
                setSelectedSubject(config.subject);
                setIsLocked(true);
            } catch (e) {
                console.error('Error parsing saved config', e);
            }
        }
    }, []);

    const handleStartExam = () => {
        if (!selectedSubject) {
            alert('Please select an Elective Subject');
            return;
        }

        localStorage.setItem('examConfig', JSON.stringify({
            set: 'Common',
            subject: selectedSubject
        }));

        navigate('/quiz', {
            state: {
                candidateData,
                criteriaId,
                examConfig: {
                    set: 'Common',
                    subject: selectedSubject
                }
            }
        });
    };


    return (
        <div className="h-full bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 overflow-y-auto">
            <div className="w-[90%] max-w-[90%] mx-auto py-12">
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
                        Please select the question set assigned to you to begin the assessment.
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

                <div className="max-w-2xl mx-auto mb-12">
                    <div className="glass-panel p-8 rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">1</div>
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

                <div className="flex justify-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                    <button
                        onClick={handleStartExam}
                        disabled={!selectedSubject}
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

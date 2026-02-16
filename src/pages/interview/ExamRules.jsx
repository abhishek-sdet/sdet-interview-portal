import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Clock, AlertCircle, CheckCircle2, ShieldAlert, BookOpen, FileEdit } from 'lucide-react';

export default function ExamRules() {
    const navigate = useNavigate();
    const location = useLocation();
    const [mounted, setMounted] = useState(false);
    const [agreed, setAgreed] = useState(false);

    const candidateData = location.state?.candidateData;

    useEffect(() => {
        setMounted(true);
        if (!candidateData) {
            navigate('/');
        }
    }, [navigate, candidateData]);

    const handleContinue = () => {
        if (!agreed) {
            alert('Please agree to the exam rules before continuing.');
            return;
        }

        navigate('/criteria-selection', {
            state: {
                candidateData
            }
        });
    };

    const rules = [
        {
            icon: Clock,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            title: 'Timed Assessment',
            description: 'The exam has a fixed time limit. The timer will auto-submit your answers when time expires.'
        },
        {
            icon: ShieldAlert,
            color: 'text-red-400',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
            title: 'Strict Proctoring',
            description: 'Warning: Tab switching and Copy/Paste are disabled. Violations may lead to disqualification.'
        },
        {
            icon: BookOpen,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20',
            title: 'Two Sections',
            description: 'Section A: General Questions (Mandatory). Section B: Elective Subject (Java/Python) - Choose wisely!'
        },
        {
            icon: FileEdit,
            color: 'text-green-400',
            bg: 'bg-green-500/10',
            border: 'border-green-500/20',
            title: 'Review & Change Answers',
            description: 'You can navigate back and modify your answers at any time until you submit the assessment.'
        }
    ];

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
            <div className={`relative z-10 w-full max-w-4xl mx-auto transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-blue/20 rounded-full mb-4">
                        <AlertCircle className="w-8 h-8 text-brand-blue" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
                        Exam Rules & Guidelines
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Please read the following rules carefully before starting your assessment.
                    </p>
                </div>

                {/* Rules Grid */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {rules.map((rule, index) => {
                        const Icon = rule.icon;
                        return (
                            <div
                                key={index}
                                className={`bg-white/5 backdrop-blur-xl border ${rule.border} rounded-xl p-6 hover:border-white/20 transition-all`}
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div className={`inline-flex items-center justify-center w-12 h-12 ${rule.bg} rounded-lg mb-4`}>
                                    <Icon className={`w-6 h-6 ${rule.color}`} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{rule.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{rule.description}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Agreement Checkbox */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-6">
                    <label className="flex items-start gap-4 cursor-pointer group">
                        <div className="relative flex-shrink-0 mt-1">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${agreed
                                ? 'bg-brand-blue border-brand-blue'
                                : 'border-slate-600 group-hover:border-slate-400'
                                }`}>
                                {agreed && <CheckCircle2 className="w-4 h-4 text-white" />}
                            </div>
                        </div>
                        <div className="flex-1">
                            <p className="text-white font-medium mb-1">
                                I have read and understood all the exam rules
                            </p>
                            <p className="text-slate-400 text-sm">
                                By checking this box, you agree to follow all guidelines during the assessment.
                            </p>
                        </div>
                    </label>
                </div>

                {/* Continue Button */}
                <div className="flex justify-center">
                    <button
                        onClick={handleContinue}
                        disabled={!agreed}
                        className={`
                            group relative overflow-hidden rounded-xl py-4 px-12 transition-all duration-300 shadow-xl
                            ${!agreed
                                ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed opacity-50 border border-white/5'
                                : 'bg-gradient-to-r from-brand-blue to-[#004282] hover:to-brand-blue text-white shadow-brand-blue/30 hover:shadow-brand-blue/50 transform hover:-translate-y-0.5'
                            }
                        `}
                    >
                        {agreed && (
                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                        )}
                        <span className="relative flex items-center justify-center gap-2 font-bold text-lg tracking-wide">
                            Continue to Exam Setup
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import GPTWBadge from '@/components/GPTWBadge';
import { Loader2, ArrowRight, ArrowLeft, Clock, CheckCircle2, Circle, AlertCircle, Code, Terminal, Sparkles } from 'lucide-react';

export default function QuizInterface() {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [mounted, setMounted] = useState(false);

    // Specialization State
    const [showSpecialization, setShowSpecialization] = useState(false);
    const [specialization, setSpecialization] = useState(null); // 'Java' or 'Python'

    // Refs to hold cached questions needed for the second phase
    const generalQuestionsRef = useRef([]);
    const javaQuestionsRef = useRef([]);
    const pythonQuestionsRef = useRef([]);

    useEffect(() => {
        setMounted(true);
        const interviewId = sessionStorage.getItem('interviewId');
        const criteriaId = sessionStorage.getItem('criteriaId');

        if (!interviewId || !criteriaId) {
            navigate('/criteria-selection');
            return;
        }

        fetchQuestions(criteriaId);
    }, [navigate]);

    useEffect(() => {
        if (timeRemaining === null || timeRemaining <= 0) return;

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    handleSubmit(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining]);

    const fetchQuestions = async (criteriaId) => {
        try {
            const selectedSet = sessionStorage.getItem('selectedSet');

            let query = supabase
                .from('questions')
                .select('*')
                .eq('criteria_id', criteriaId)
                .eq('is_active', true);

            if (selectedSet) {
                query = query.eq('set_name', selectedSet);
            }

            const { data, error: fetchError } = await query.order('created_at');

            if (fetchError) throw fetchError;

            if (!data || data.length === 0) {
                setError('No questions available.');
                return;
            }

            // Categorize Questions
            const javaQs = [];
            const pythonQs = [];
            const generalQs = [];

            data.forEach(q => {
                const cat = q.category ? q.category.toLowerCase() : '';
                if (cat.includes('java') && !cat.includes('script')) { // Simple check for Java
                    javaQs.push(q);
                } else if (cat.includes('python')) {
                    pythonQs.push(q);
                } else {
                    generalQs.push(q);
                }
            });

            // Store in refs
            // We take first 12 general questions
            generalQuestionsRef.current = generalQs.slice(0, 12);
            javaQuestionsRef.current = javaQs.slice(0, 3); // Take top 3
            pythonQuestionsRef.current = pythonQs.slice(0, 3); // Take top 3

            // Initial State: Show General Questions
            setQuestions(generalQuestionsRef.current);

            // If total general < 12, we might have an issue, but we proceed with what we have
            if (generalQuestionsRef.current.length < 1) {
                setError('Insufficient general questions configured.');
            }

            // Fetch timer duration from criteria
            const { data: criteriaData, error: criteriaError } = await supabase
                .from('criteria')
                .select('timer_duration')
                .eq('id', criteriaId)
                .single();

            if (!criteriaError && criteriaData?.timer_duration) {
                // Convert minutes to seconds
                setTimeRemaining(criteriaData.timer_duration * 60);
            }

        } catch (err) {
            console.error('Error fetching questions:', err);
            setError('Failed to load questions. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerSelect = (questionId, answer) => {
        setAnswers({
            ...answers,
            [questionId]: answer
        });
    };

    const handleNext = () => {
        // ID of the last general question (usually index 11 if we have 12)
        const isEndOfGeneral = currentIndex === generalQuestionsRef.current.length - 1;

        if (isEndOfGeneral && !specialization) {
            // Trigger Specialization Selection
            setShowSpecialization(true);
        } else if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handleSpecializationSelect = (type) => { // 'Java' or 'Python'
        setSpecialization(type);
        setShowSpecialization(false); // Hide selection UI

        // Append specific questions
        const newQuestions = type === 'Java' ? javaQuestionsRef.current : pythonQuestionsRef.current;

        setQuestions(prev => [...prev, ...newQuestions]);

        // Move to next question immediately
        setCurrentIndex(currentIndex + 1);
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleSubmit = async (autoSubmit = false) => {
        if (!autoSubmit) {
            const unanswered = questions.filter(q => !answers[q.id]);
            if (unanswered.length > 0) {
                const confirm = window.confirm(
                    `You have ${unanswered.length} unanswered question(s). Are you sure you want to submit?`
                );
                if (!confirm) return;
            }
        }

        setSubmitting(true);
        setError('');

        try {
            const interviewId = sessionStorage.getItem('interviewId');
            const passingPercentage = parseInt(sessionStorage.getItem('passingPercentage') || '70');

            let correctCount = 0;
            const answerRecords = [];

            questions.forEach((question) => {
                const selectedAnswer = answers[question.id];
                const isCorrect = selectedAnswer === question.correct_answer;

                if (isCorrect) correctCount++;

                answerRecords.push({
                    interview_id: interviewId,
                    question_id: question.id,
                    selected_answer: selectedAnswer || null,
                    is_correct: isCorrect
                });
            });

            const totalQuestions = questions.length;
            const percentage = (correctCount / totalQuestions) * 100;
            const passed = percentage >= passingPercentage;

            const { error: answersError } = await supabase
                .from('answers')
                .insert(answerRecords);

            if (answersError) throw answersError;

            const { error: updateError } = await supabase
                .from('interviews')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    score: correctCount,
                    total_questions: totalQuestions,
                    passed: passed
                })
                .eq('id', interviewId);

            if (updateError) throw updateError;

            sessionStorage.setItem('score', correctCount);
            sessionStorage.setItem('totalQuestions', totalQuestions);
            sessionStorage.setItem('percentage', percentage.toFixed(2));
            sessionStorage.setItem('passed', passed);

            navigate('/thank-you');
        } catch (err) {
            console.error('Error submitting interview:', err);
            setError('Failed to submit interview. Please try again.');
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen w-full bg-universe flex items-center justify-center font-sans">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-brand-blue animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Loading Assessment...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen w-full bg-universe flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
                    <div className="inline-block p-4 bg-red-500/10 rounded-full mb-4">
                        <AlertCircle className="w-12 h-12 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Unavailable</h2>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/criteria-selection')}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-semibold"
                    >
                        Return to Selection
                    </button>
                </div>
            </div>
        );
    }

    // --- Specialization Selection UI ---
    if (showSpecialization) {
        return (
            <div className="min-h-screen w-full bg-universe flex flex-col items-center justify-center p-4 relative font-sans text-slate-100 overflow-hidden">
                {/* Background */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="orb orb-1 opacity-50"></div>
                    <div className="orb orb-2 opacity-50"></div>
                    <div className="grid-texture"></div>
                </div>

                <div className="relative z-10 max-w-4xl w-full text-center">
                    <div className="mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                            Choose Your Specialization
                        </h1>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                            You've completed the general assessment. Now, select your primary programming language for the final technical questions.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                        {/* Java Option */}
                        <button
                            onClick={() => handleSpecializationSelect('Java')}
                            className="group relative p-1 rounded-[2rem] transition-all duration-500 hover:scale-[1.02]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-red-500 to-amber-500 opacity-20 group-hover:opacity-40 rounded-[2rem] blur-xl transition-opacity"></div>
                            <div className="relative h-full bg-[#080c14]/80 backdrop-blur-xl border border-white/10 rounded-[1.9rem] p-10 flex flex-col items-center justify-center gap-6 overflow-hidden hover:border-orange-500/50 transition-colors">
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-600/10 flex items-center justify-center shadow-lg shadow-orange-500/10 group-hover:scale-110 transition-transform duration-500 border border-white/5">
                                    <div className="w-16 h-16">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
                                            <path fill="#0074BD" d="M47.617 98.12s-4.767 2.774 3.397 3.71c9.892 1.13 14.947.968 25.845-1.092 0 0 2.871 1.795 6.873 3.351-24.439 10.47-55.308-.607-36.115-5.969zm-2.988-13.665s-5.348 3.959 2.823 4.805c10.567 1.091 18.91 1.18 33.354-1.6 0 0 1.993 2.025 5.132 3.131-29.542 8.64-62.446.68-41.309-6.336z" />
                                            <path fill="#EA2D2E" d="M69.802 61.271c6.025 6.935-1.58 13.17-1.58 13.17s15.289-7.891 8.269-17.777c-6.559-9.215-11.587-13.792 15.635-29.58 0 .001-42.731 10.67-22.324 34.187z" />
                                            <path fill="#0074BD" d="M102.123 108.229s3.529 2.91-3.888 5.159c-14.102 4.272-58.706 5.56-71.094.171-4.451-1.938 3.899-4.625 6.526-5.192 2.739-.593 4.303-.485 4.303-.485-4.953-3.487-32.013 6.85-13.743 9.815 49.821 8.076 90.817-3.637 77.896-9.468zM49.912 70.294s-22.686 5.389-8.033 7.348c6.188.828 18.518.638 30.011-.326 9.39-.789 18.813-2.474 18.813-2.474s-3.308 1.419-5.704 3.053c-23.042 6.061-67.544 3.238-54.731-2.958 10.832-5.239 19.644-4.643 19.644-4.643zm40.697 22.747c23.421-12.167 12.591-23.86 5.032-22.285-1.848.385-2.677.72-2.677.72s.688-1.079 2-1.543c14.953-5.255 26.451 15.503-4.823 23.725 0-.002.359-.327.468-.617z" />
                                            <path fill="#EA2D2E" d="M76.491 1.587S89.459 14.563 64.188 34.51c-20.266 16.006-4.621 25.13-.007 35.559-11.831-10.673-20.509-20.07-14.688-28.815C58.041 28.42 81.722 22.195 76.491 1.587z" />
                                            <path fill="#0074BD" d="M52.214 126.021c22.476 1.437 57-.8 57.817-11.436 0 0-1.571 4.032-18.577 7.231-19.186 3.612-42.854 3.191-56.887.874 0 .001 2.875 2.381 17.647 3.331z" />
                                        </svg>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-3xl font-bold text-white mb-2">Java</h3>
                                    <p className="text-slate-400 text-sm">Object Oriented Programming & Core Concepts</p>
                                </div>
                                <div className="mt-4 px-6 py-2 rounded-full border border-orange-500/30 text-orange-400 text-sm font-bold tracking-widest uppercase group-hover:bg-orange-500 group-hover:text-white transition-all">
                                    Select Java
                                </div>
                            </div>
                        </button>

                        {/* Python Option */}
                        <button
                            onClick={() => handleSpecializationSelect('Python')}
                            className="group relative p-1 rounded-[2rem] transition-all duration-500 hover:scale-[1.02]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 opacity-20 group-hover:opacity-40 rounded-[2rem] blur-xl transition-opacity"></div>
                            <div className="relative h-full bg-[#080c14]/80 backdrop-blur-xl border border-white/10 rounded-[1.9rem] p-10 flex flex-col items-center justify-center gap-6 overflow-hidden hover:border-blue-500/50 transition-colors">
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform duration-500 border border-white/5">
                                    <div className="w-16 h-16">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
                                            <defs>
                                                <linearGradient id="python-grad-a" gradientUnits="userSpaceOnUse" x1="70.252" y1="1237.476" x2="170.659" y2="1151.089" gradientTransform="matrix(.563 0 0 -.568 -29.215 707.817)"><stop offset="0" stopColor="#5A9FD4" /><stop offset="1" stopColor="#306998" /></linearGradient>
                                                <linearGradient id="python-grad-b" gradientUnits="userSpaceOnUse" x1="209.474" y1="1098.811" x2="173.62" y2="1149.537" gradientTransform="matrix(.563 0 0 -.568 -29.215 707.817)"><stop offset="0" stopColor="#FFD43B" /><stop offset="1" stopColor="#FFE873" /></linearGradient>
                                                <radialGradient id="python-grad-c" cx="1825.678" cy="444.45" r="26.743" gradientTransform="matrix(0 -.24 -1.055 0 532.979 557.576)" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#B8B8B8" stopOpacity=".498" /><stop offset="1" stopColor="#7F7F7F" stopOpacity="0" /></radialGradient>
                                            </defs>
                                            <path fill="url(#python-grad-a)" d="M63.391 1.988c-4.222.02-8.252.379-11.8 1.007-10.45 1.846-12.346 5.71-12.346 12.837v9.411h24.693v3.137H29.977c-7.176 0-13.46 4.313-15.426 12.521-2.268 9.405-2.368 15.275 0 25.096 1.755 7.311 5.947 12.519 13.124 12.519h8.491V67.234c0-8.151 7.051-15.34 15.426-15.34h24.665c6.866 0 12.346-5.654 12.346-12.548V15.833c0-6.693-5.646-11.72-12.346-12.837-4.244-.706-8.645-1.027-12.866-1.008zM50.037 9.557c2.55 0 4.634 2.117 4.634 4.721 0 2.593-2.083 4.69-4.634 4.69-2.56 0-4.633-2.097-4.633-4.69-.001-2.604 2.073-4.721 4.633-4.721z" transform="translate(0 10.26)" />
                                            <path fill="url(#python-grad-b)" d="M91.682 28.38v10.966c0 8.5-7.208 15.655-15.426 15.655H51.591c-6.756 0-12.346 5.783-12.346 12.549v23.515c0 6.691 5.818 10.628 12.346 12.547 7.816 2.297 15.312 2.713 24.665 0 6.216-1.801 12.346-5.423 12.346-12.547v-9.412H63.938v-3.138h37.012c7.176 0 9.852-5.005 12.348-12.519 2.578-7.735 2.467-15.174 0-25.096-1.774-7.145-5.161-12.521-12.348-12.521h-9.268zM77.809 87.927c2.561 0 4.634 2.097 4.634 4.692 0 2.602-2.074 4.719-4.634 4.719-2.55 0-4.633-2.117-4.633-4.719 0-2.595 2.083-4.692 4.633-4.692z" transform="translate(0 10.26)" />
                                            <path opacity=".444" fill="url(#python-grad-c)" d="M97.309 119.597c0 3.543-14.816 6.416-33.091 6.416-18.276 0-33.092-2.873-33.092-6.416 0-3.544 14.815-6.417 33.092-6.417 18.275 0 33.091 2.872 33.091 6.417z" />
                                        </svg>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-3xl font-bold text-white mb-2">Python</h3>
                                    <p className="text-slate-400 text-sm">Data Structures & Minimalist Syntax</p>
                                </div>
                                <div className="mt-4 px-6 py-2 rounded-full border border-blue-500/30 text-blue-400 text-sm font-bold tracking-widest uppercase group-hover:bg-blue-500 group-hover:text-white transition-all">
                                    Select Python
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }


    const currentQuestion = questions[currentIndex];
    // Progress Calculation: Valid questions only
    const totalQuestions = specialization ? 15 : 12; // Approximation based on logic
    const progress = (currentIndex / totalQuestions) * 100;
    const answeredCount = Object.keys(answers).length;
    const isFirstQuestion = currentIndex === 0;
    const isLastQuestion = currentIndex === questions.length - 1 && specialization; // Only last if specialization selected

    return (
        <div className="min-h-screen w-full bg-universe flex flex-col font-sans text-slate-100 selection:bg-brand-orange selection:text-white relative overflow-hidden">

            {/* Active Background Animation */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="orb orb-1 opacity-20"></div>
                <div className="orb orb-2 opacity-20"></div>
                <div className="orb orb-3 opacity-20"></div>
                <div className="grid-texture opacity-30"></div>
            </div>


            {/* Top Left - SDET Logo - Compact & Non-overlapping */}
            <div className="fixed top-2 left-2 z-50 animate-hero hidden md:block">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-lg shadow-xl hover:border-brand-blue/50 transition-all duration-300 hover:scale-105 group">
                    <img src="/logo.jpg" alt="SDET Logo" className="h-10 w-auto object-contain rounded-lg" />
                </div>
            </div>

            {/* Bottom Right - GPTW Badge - Moderate Size */}
            <div className="fixed bottom-4 right-4 z-50 animate-hero-delay-1 hidden md:block">
                <div className="hover:scale-105 transition-transform duration-300 drop-shadow-xl">
                    <GPTWBadge size="lg" />
                </div>
            </div>


            {/* Header Bar - Floating Glass Pill (Top Right) */}
            <div className="fixed top-4 right-4 z-40 flex justify-end pointer-events-none">
                <div className="bg-[#0b101b]/90 backdrop-blur-xl border border-white/10 rounded-full px-5 py-2 shadow-2xl flex items-center gap-5 pointer-events-auto hover:border-brand-blue/30 transition-colors">

                    {/* Progress Section */}
                    <div className="flex flex-col gap-1 min-w-[140px] sm:min-w-[200px]">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <span>Progress</span>
                            <span className="text-brand-blue">{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                            <div className="absolute inset-0 bg-brand-blue/10"></div>
                            <div
                                className="h-full bg-gradient-to-r from-cyan-400 via-brand-blue to-purple-500 transition-all duration-700 ease-out shadow-[0_0_12px_rgba(34,211,238,0.6)] relative"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                            >
                                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 blur-[1px]"></div>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-6 w-[1px] bg-white/10"></div>

                    {/* Stats Pills - Integrated */}
                    <div className="flex items-center gap-3">
                        {/* Timer - Always Visible */}
                        <div className={`flex items-center gap-1.5 ${(!timeRemaining || timeRemaining < 60) ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>
                            <Clock className="w-3.5 h-3.5" />
                            <span className="font-mono font-bold text-sm tabular-nums">
                                {timeRemaining !== null ? (
                                    `${Math.floor(timeRemaining / 60)}:${String(timeRemaining % 60).padStart(2, '0')}`
                                ) : (
                                    '--:--'
                                )}
                            </span>
                        </div>

                        <div className="hidden sm:flex items-center gap-1.5 text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="font-bold text-sm">{answeredCount}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="relative z-10 flex-grow flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 pt-24">
                <div className={`w-full max-w-4xl transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

                    {/* Question Card - Premium Glassmorphism */}
                    <div className="bg-[#0b101b]/90 backdrop-blur-3xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-500">

                        {/* Ambient Background Glow */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-orange/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                        {/* Top Accent Line */}
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-blue/50 to-transparent opacity-50"></div>

                        {/* Question Text Area */}
                        <div className="mb-8 relative z-10">
                            <div className="flex items-start gap-4">
                                {/* Question Number Box */}
                                <div className="hidden sm:flex flex-shrink-0 w-12 h-12 rounded-xl bg-white/5 border border-white/10 items-center justify-center text-white font-bold text-lg shadow-lg">
                                    <span className="bg-gradient-to-br from-cyan-400 to-brand-blue bg-clip-text text-transparent">
                                        {String(currentIndex + 1).padStart(2, '0')}
                                    </span>
                                </div>

                                <div className="space-y-4 w-full">
                                    {/* Badges & Metadata */}
                                    <div className="flex flex-wrap gap-2 items-center">
                                        {/* Category Chip */}
                                        {currentQuestion.category && (
                                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold tracking-wider text-blue-400 uppercase">
                                                <Terminal className="w-3 h-3" />
                                                {currentQuestion.category}
                                            </div>
                                        )}

                                        {/* Difficulty Chip */}
                                        {currentQuestion.difficulty && (
                                            <div className={`
                                                flex items-center gap-1.5 px-3 py-1 rounded-md border text-[10px] font-bold tracking-wider uppercase
                                                ${currentQuestion.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    currentQuestion.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                        'bg-rose-500/10 text-rose-400 border-rose-500/20'}
                                            `}>
                                                <Sparkles className="w-3 h-3" />
                                                {currentQuestion.difficulty}
                                            </div>
                                        )}
                                    </div>

                                    <h2 className="text-xl sm:text-2xl font-bold text-white leading-relaxed tracking-tight drop-shadow-sm">
                                        {currentQuestion.question_text}
                                    </h2>
                                </div>
                            </div>
                        </div>

                        {/* Answer Options - Animated List */}
                        <div className="space-y-3 relative z-10">
                            {currentQuestion.options.map((option, idx) => {
                                const isSelected = answers[currentQuestion.id] === option;

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                                        className={`
                                            w-full text-left p-4 rounded-xl border transition-all duration-300 group/option relative overflow-hidden
                                            ${isSelected
                                                ? 'bg-brand-blue/10 border-brand-blue shadow-[0_0_15px_rgba(0,119,255,0.2)] translate-x-1'
                                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20 hover:translate-x-1'
                                            }
                                        `}
                                    >
                                        {/* Selection Gradient Background */}
                                        <div className={`absolute inset-0 bg-gradient-to-r from-brand-blue/10 to-transparent transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-0'}`}></div>

                                        <div className="flex items-center gap-4 relative z-10">
                                            {/* Custom Radio Indicator */}
                                            <div className={`
                                                w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all duration-300
                                                ${isSelected
                                                    ? 'border-brand-blue bg-brand-blue scale-110 shadow-lg shadow-brand-blue/40'
                                                    : 'border-slate-600 group-hover/option:border-slate-400 bg-transparent'
                                                }
                                            `}>
                                                <div className={`w-2 h-2 rounded-full bg-white transition-transform duration-300 ${isSelected ? 'scale-100' : 'scale-0'}`} />
                                            </div>

                                            {/* Option Text */}
                                            <span className={`text-sm sm:text-base font-medium transition-colors duration-300 ${isSelected ? 'text-white' : 'text-slate-300 group-hover/option:text-white'
                                                }`}>
                                                {option}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Navigation Actions */}
                    {/* Navigation Actions - Premium */}
                    <div className="flex items-center justify-between mt-8 relative z-20">
                        <button
                            onClick={handlePrevious}
                            disabled={isFirstQuestion}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all text-sm group
                                ${isFirstQuestion
                                    ? 'opacity-0 pointer-events-none'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }
                            `}
                        >
                            <div className="p-1.5 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors border border-white/5 group-hover:border-white/20">
                                <ArrowLeft className="w-4 h-4" />
                            </div>
                            <span className="hidden sm:inline">Back</span>
                        </button>

                        {!isLastQuestion ? (
                            <button
                                onClick={handleNext}
                                className="group relative overflow-hidden rounded-xl py-2.5 px-8 bg-white text-slate-900 font-bold shadow-lg shadow-white/5 hover:shadow-cyan-400/20 transition-all transform hover:-translate-y-0.5 text-sm"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/30 to-cyan-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                <span className="relative z-10 flex items-center gap-2">
                                    Next Question
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </button>
                        ) : (
                            <button
                                onClick={() => handleSubmit(false)}
                                disabled={submitting}
                                className={`
                                    group relative overflow-hidden rounded-xl py-2.5 px-10 font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5 text-sm
                                    ${submitting
                                        ? 'bg-slate-700 cursor-wait'
                                        : 'bg-gradient-to-r from-brand-orange to-red-500 shadow-brand-orange/20 hover:shadow-brand-orange/40'
                                    }
                                `}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <span className="relative z-10 flex items-center gap-2">
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            Finish Assessment
                                            <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                        </>
                                    )}
                                </span>
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}

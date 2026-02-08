import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function QuizInterface() {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [timeRemaining, setTimeRemaining] = useState(null);

    useEffect(() => {
        // Check if interview session exists
        const interviewId = sessionStorage.getItem('interviewId');
        const criteriaId = sessionStorage.getItem('criteriaId');

        if (!interviewId || !criteriaId) {
            navigate('/criteria-selection');
            return;
        }

        fetchQuestions(criteriaId);
    }, [navigate]);

    // Timer effect (optional - can be enabled per criteria)
    useEffect(() => {
        if (timeRemaining === null || timeRemaining <= 0) return;

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    handleSubmit(true); // Auto-submit when time runs out
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining]);

    const fetchQuestions = async (criteriaId) => {
        try {
            // Get selected categories from session
            const selectedCategories = JSON.parse(sessionStorage.getItem('selectedCategories') || '[]');

            let query = supabase
                .from('questions')
                .select('*')
                .eq('criteria_id', criteriaId)
                .eq('is_active', true);

            // Filter by selected categories if any
            if (selectedCategories.length > 0) {
                query = query.in('category', selectedCategories);
            }

            const { data, error: fetchError } = await query.order('created_at');

            if (fetchError) throw fetchError;

            if (!data || data.length === 0) {
                setError('No questions available for the selected categories.');
                return;
            }

            setQuestions(data);
            // Optional: Set timer (e.g., 30 minutes)
            // setTimeRemaining(30 * 60);
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
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
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

            // Calculate score
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

            // Insert answers
            const { error: answersError } = await supabase
                .from('answers')
                .insert(answerRecords);

            if (answersError) throw answersError;

            // Update interview
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

            // Store results in session
            sessionStorage.setItem('score', correctCount);
            sessionStorage.setItem('totalQuestions', totalQuestions);
            sessionStorage.setItem('percentage', percentage.toFixed(2));
            sessionStorage.setItem('passed', passed);

            // Navigate to thank you page
            navigate('/thank-you');
        } catch (err) {
            console.error('Error submitting interview:', err);
            setError('Failed to submit interview. Please try again.');
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading questions...</p>
                </div>
            </div>
        );
    }

    if (error && questions.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
                    <div className="inline-block p-4 bg-red-500/10 rounded-full mb-4">
                        <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/criteria-selection')}
                        className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;
    const answeredCount = Object.keys(answers).length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <div className="bg-white/5 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-5xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-xl font-semibold text-white">Interview Assessment</h1>
                            <p className="text-sm text-slate-400">
                                Question {currentIndex + 1} of {questions.length}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            {timeRemaining !== null && (
                                <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                                    <span className="text-sm text-slate-400">Time: </span>
                                    <span className="text-white font-mono">
                                        {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
                                    </span>
                                </div>
                            )}
                            <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                                <span className="text-sm text-slate-400">Answered: </span>
                                <span className="text-white font-semibold">{answeredCount}/{questions.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Question Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 mb-6">
                    <div className="mb-6">
                        <div className="flex items-start gap-3 mb-4">
                            <span className="flex-shrink-0 w-8 h-8 bg-cyan-500 text-white rounded-lg flex items-center justify-center font-semibold">
                                {currentIndex + 1}
                            </span>
                            <h2 className="text-xl text-white leading-relaxed">
                                {currentQuestion.question_text}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {currentQuestion.category && (
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                    {currentQuestion.category}
                                </span>
                            )}
                            {currentQuestion.difficulty && (
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${currentQuestion.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                                        currentQuestion.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-red-500/20 text-red-400'
                                    }`}>
                                    {currentQuestion.difficulty.toUpperCase()}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                        {currentQuestion.options.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                                className={`
                  w-full p-4 rounded-xl border-2 text-left transition-all
                  ${answers[currentQuestion.id] === option
                                        ? 'bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/20'
                                        : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                                    }
                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    ${answers[currentQuestion.id] === option
                                            ? 'bg-cyan-400 border-cyan-400'
                                            : 'border-white/30'
                                        }
                  `}>
                                        {answers[currentQuestion.id] === option && (
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="text-white">{option}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center">
                        {error}
                    </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between gap-4">
                    <button
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ← Previous
                    </button>

                    <div className="flex gap-2">
                        {currentIndex === questions.length - 1 ? (
                            <button
                                onClick={() => handleSubmit(false)}
                                disabled={submitting}
                                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-green-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Submitting...' : 'Submit Interview'}
                            </button>
                        ) : (
                            <button
                                onClick={handleNext}
                                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/50 transition-all"
                            >
                                Next →
                            </button>
                        )}
                    </div>
                </div>

                {/* Question Navigator */}
                <div className="mt-8 p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                    <h3 className="text-sm font-medium text-slate-400 mb-4">Question Navigator</h3>
                    <div className="grid grid-cols-10 gap-2">
                        {questions.map((q, idx) => (
                            <button
                                key={q.id}
                                onClick={() => setCurrentIndex(idx)}
                                className={`
                  aspect-square rounded-lg text-sm font-medium transition-all
                  ${idx === currentIndex
                                        ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                                        : answers[q.id]
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                            : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                                    }
                `}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Signature */}
            <div className="fixed bottom-4 left-4 font-script text-white/10 text-sm pointer-events-none select-none">
                AJ
            </div>
        </div>
    );
}

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ThankYou() {
    const navigate = useNavigate();
    const [results, setResults] = useState(null);

    useEffect(() => {
        const score = sessionStorage.getItem('score');
        const totalQuestions = sessionStorage.getItem('totalQuestions');
        const percentage = sessionStorage.getItem('percentage');
        const passed = sessionStorage.getItem('passed') === 'true';
        const candidateName = sessionStorage.getItem('candidateName');

        if (!score || !totalQuestions) {
            navigate('/');
            return;
        }

        setResults({
            score: parseInt(score),
            totalQuestions: parseInt(totalQuestions),
            percentage: parseFloat(percentage),
            passed,
            candidateName
        });
    }, [navigate]);

    const handleFinish = () => {
        // Clear session
        sessionStorage.clear();
        navigate('/');
    };

    if (!results) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className={`absolute w-96 h-96 ${results.passed ? 'bg-green-500/20' : 'bg-orange-500/20'} rounded-full blur-3xl top-10 left-10 animate-pulse`}></div>
                <div className={`absolute w-96 h-96 ${results.passed ? 'bg-emerald-500/20' : 'bg-red-500/20'} rounded-full blur-3xl bottom-10 right-10 animate-pulse delay-1000`}></div>
            </div>

            {/* Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]"></div>

            {/* Content */}
            <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
                <div className="w-full max-w-2xl">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl text-center">
                        {/* Icon */}
                        <div className={`inline-block p-6 rounded-full mb-6 ${results.passed
                                ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                                : 'bg-gradient-to-br from-orange-400 to-red-500'
                            }`}>
                            {results.passed ? (
                                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl font-bold text-white mb-4 font-display">
                            {results.passed ? 'Congratulations!' : 'Interview Completed'}
                        </h1>

                        <p className="text-xl text-slate-300 mb-8">
                            {results.candidateName}, thank you for completing the interview
                        </p>

                        {/* Results Card */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8">
                            <div className="grid md:grid-cols-3 gap-6">
                                <div>
                                    <p className="text-sm text-slate-400 mb-2">Score</p>
                                    <p className="text-3xl font-bold text-white">
                                        {results.score}/{results.totalQuestions}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400 mb-2">Percentage</p>
                                    <p className={`text-3xl font-bold ${results.passed ? 'text-green-400' : 'text-orange-400'
                                        }`}>
                                        {results.percentage}%
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400 mb-2">Status</p>
                                    <p className={`text-2xl font-bold ${results.passed ? 'text-green-400' : 'text-orange-400'
                                        }`}>
                                        {results.passed ? 'PASSED ✓' : 'NOT QUALIFIED'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Message */}
                        <div className="mb-8">
                            {results.passed ? (
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                    <p className="text-green-400">
                                        You have successfully qualified! Our team will contact you soon with next steps.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                                    <p className="text-orange-400">
                                        Thank you for your participation. While you didn't meet the passing criteria this time, we encourage you to keep improving your skills.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleFinish}
                            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/50 transition-all transform hover:scale-105"
                        >
                            Return to Home
                        </button>

                        {/* Footer */}
                        <div className="mt-8 text-sm text-slate-500">
                            Your results have been recorded and will be reviewed by our team.
                        </div>
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

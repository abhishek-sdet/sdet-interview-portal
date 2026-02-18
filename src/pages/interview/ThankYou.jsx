import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GPTWBadge from '@/components/GPTWBadge';
import { CheckCircle2 } from 'lucide-react';

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
        <div className="h-full w-full bg-universe relative overflow-y-auto overflow-x-hidden font-sans">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute w-96 h-96 bg-brand-blue/20 rounded-full blur-3xl top-10 left-10 animate-pulse"></div>
                <div className="absolute w-96 h-96 bg-brand-orange/20 rounded-full blur-3xl bottom-10 right-10 animate-pulse delay-1000"></div>
                <div className="grid-texture opacity-30"></div>
            </div>

            {/* Scrollable Content Wrapper */}
            <div className="min-h-full w-full flex flex-col items-center justify-center p-4 relative">

                {/* Top Left - SDET Logo */}
                <div className="absolute top-6 left-6 z-50 animate-fade-in-down hidden sm:block">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl shadow-xl">
                        <img src="/sdet-logo.png" alt="SDET Logo" className="h-12 w-auto object-contain" />
                    </div>
                </div>

                {/* Bottom Right - GPTW Badge */}
                <div className="absolute bottom-6 right-6 z-50 animate-fade-in-up hidden sm:block">
                    <div className="drop-shadow-2xl hover:scale-105 transition-transform duration-300">
                        <GPTWBadge size="lg" />
                    </div>
                </div>

                {/* Content */}
                <div className="relative z-10 w-full max-w-md px-4 my-8">
                    <div className="bg-[#0b101b]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl text-center relative overflow-hidden group">

                        {/* Decorative Top Line */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-blue/50 to-transparent opacity-50"></div>

                        {/* Icon */}
                        <div className="inline-block p-4 rounded-full mb-6 bg-gradient-to-br from-brand-blue/20 to-cyan-500/20 border border-brand-blue/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                            <CheckCircle2 className="w-12 h-12 text-brand-blue" />
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                            Thank You!
                        </h1>

                        <p className="text-lg text-slate-300 mb-6 leading-relaxed">
                            <span className="font-semibold text-white">{results.candidateName}</span>, your assessment has been submitted successfully.
                        </p>

                        {/* Generic Message */}
                        <div className="p-5 bg-white/5 border border-white/10 rounded-xl mb-8">
                            <p className="text-sm md:text-base text-slate-300">
                                Thank you for your participation. Our HR team will review your results and get back to you shortly regarding the next steps.
                            </p>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleFinish}
                            className="px-8 py-3 bg-gradient-to-r from-brand-blue to-cyan-600 hover:from-brand-blue/90 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-brand-blue/30 transition-all transform hover:-translate-y-1 hover:shadow-brand-blue/50 text-sm md:text-base"
                        >
                            Return to Home
                        </button>

                        {/* Footer */}
                        <div className="mt-8 text-sm text-slate-500">
                            © SDET Tech. All rights reserved.
                        </div>
                    </div>
                </div>

                {/* Signature - Only visible on larger screens/if space permits */}
                <div className="fixed bottom-4 left-4 font-script text-white/10 text-sm pointer-events-none select-none hidden sm:block">
                    AJ
                </div>
            </div>
        </div>
    );
}

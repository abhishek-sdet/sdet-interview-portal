import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import AspirantLogo from '@/components/AspirantLogo';

export default function LandingPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.fullName.trim()) {
            setError('Full name is required');
            return;
        }

        setLoading(true);

        try {
            // Create candidate record
            const { data, error: insertError } = await supabase
                .from('candidates')
                .insert([
                    {
                        full_name: formData.fullName.trim(),
                        email: formData.email.trim() || null,
                        phone: formData.phone.trim() || null
                    }
                ])
                .select()
                .single();

            if (insertError) throw insertError;

            // Store candidate ID in session storage
            sessionStorage.setItem('candidateId', data.id);
            sessionStorage.setItem('candidateName', data.full_name);

            // Navigate to criteria selection
            navigate('/criteria-selection');
        } catch (err) {
            console.error('Error creating candidate:', err);
            setError('Failed to register. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl top-10 left-10 animate-pulse"></div>
                <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl bottom-10 right-10 animate-pulse delay-1000"></div>
                <div className="absolute w-64 h-64 bg-purple-500/20 rounded-full blur-3xl top-1/2 right-1/4 animate-pulse delay-500"></div>
            </div>

            {/* Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]"></div>

            {/* Floating Badge */}
            <div className="fixed bottom-5 right-5 z-20 animate-float">
                <img
                    src="/background.png"
                    alt="Certified Badge"
                    className="w-44 drop-shadow-2xl"
                />
            </div>

            {/* Content */}
            <div className="relative z-10 flex items-center justify-center min-h-screen p-4 overflow-y-auto">
                <div className="w-full max-w-md my-auto">
                    {/* Glassmorphism Card */}
                    <div className="bg-white/5 backdrop-blur-xl border-2 border-white/10 rounded-3xl p-8 shadow-2xl w-full">
                        {/* Company Logo */}
                        <div className="flex justify-center mb-3">
                            <img
                                src="/logo.jpg"
                                alt="SDET Logo"
                                className="w-24 h-auto"
                            />
                        </div>

                        {/* ASPIRANT Logo */}
                        <div className="flex justify-center mb-4">
                            <AspirantLogo size={100} />
                        </div>

                        {/* Title */}
                        <h2 className="text-3xl font-bold text-center mb-1 font-display">
                            <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
                                SDET ASPIRANT
                            </span>
                        </h2>
                        <p className="text-center text-cyan-400 text-xs uppercase tracking-wider mb-6">
                            Fresher Interview Portal
                        </p>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Full Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all text-sm"
                                    placeholder="Enter your full name"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Email Address <span className="text-slate-500 text-xs">(Optional)</span>
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all text-sm"
                                    placeholder="your.email@example.com"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Phone Number <span className="text-slate-500 text-xs">(Optional)</span>
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all text-sm"
                                    placeholder="+91 98765 43210"
                                    disabled={loading}
                                />
                            </div>

                            {error && (
                                <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 px-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/50 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </span>
                                ) : (
                                    'Continue to Interview'
                                )}
                            </button>
                        </form>

                        {/* Footer */}
                        <div className="mt-4 text-center text-xs text-slate-500">
                            © 2026 SDET | Software Testing Company
                        </div>
                    </div>
                </div>

                {/* Signature */}
                <div className="fixed bottom-4 left-4 font-script text-white/10 text-sm pointer-events-none select-none">
                    AJ
                </div>
            </div>

            {/* Custom Animations */}
            <style jsx>{`
                @keyframes float {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-8px);
                    }
                }

                .animate-float {
                    animation: float 5s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}

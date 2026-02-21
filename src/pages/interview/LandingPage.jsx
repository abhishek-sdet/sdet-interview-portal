import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import GPTWBadge from '@/components/GPTWBadge';
import { ArrowRight, CheckCircle2, ShieldCheck, Mail, Phone, User, Loader2 } from 'lucide-react';
import { accessControl } from '@/lib/accessControl';
import AccessDenied from '@/components/admin/AccessDenied';

// World Class Landing Page
export default function LandingPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        checkExistingSession();
    }, []);

    const checkExistingSession = async () => {
        const candidateId = localStorage.getItem('candidateId');
        const interviewId = localStorage.getItem('interviewId');

        if (interviewId) {
            // VERIFY: Does this interview ID actually exist in the database?
            // This prevents "Submission Error" later if the DB was cleared but local storage has a stale ID.
            const { data, error } = await supabase
                .from('interviews')
                .select('id, status')
                .eq('id', interviewId)
                .maybeSingle();

            if (error || !data || data.status === 'completed') {
                console.warn('[SESSION] Zombie or completed session detected. Clearing stale data.', { error, data });
                localStorage.removeItem('interviewId');
                localStorage.removeItem('criteriaId');
                localStorage.removeItem('examConfig');
                localStorage.removeItem('selectedSet');
                // Don't redirect yet, let them log in or check candidateId
            } else {
                console.log('[SESSION] Valid active session found. Redirecting to quiz.');
                navigate('/quiz');
                return;
            }
        }

        if (candidateId) {
            // Candidate is registered but no active interview
            navigate('/exam-rules', {
                state: {
                    candidateData: {
                        id: candidateId,
                        full_name: localStorage.getItem('candidateName')
                    }
                }
            });
        }
    };

    const handleChange = (field) => (e) => {
        let value = e.target.value;
        if (field === 'phone') {
            // Strip non-numeric characters
            value = value.replace(/[^0-9]/g, '');
        }
        setFormData({ ...formData, [field]: value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.fullName.trim()) {
            setError('Full name is required');
            return;
        }

        if (!formData.email.trim()) {
            setError('Email is required');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
            setError('Please enter a valid email address');
            return;
        }

        // Phone number validation
        if (!formData.phone.trim()) {
            setError('Phone number is required');
            return;
        }

        // Basic phone validation (10 digits)
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(formData.phone.trim())) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }

        setLoading(true);

        // CLEAR: Ensure any old session IDs are wiped before we start a fresh attempt
        // This prevents the new session from inheriting a stale ID if registration fails later
        localStorage.removeItem('interviewId');
        localStorage.removeItem('criteriaId');
        localStorage.removeItem('examConfig');
        localStorage.removeItem('selectedSet');
        localStorage.removeItem('score');
        localStorage.removeItem('totalQuestions');
        localStorage.removeItem('percentage');
        localStorage.removeItem('passed');

        try {
            console.log('[REGISTRATION] Checking for existing candidate:', formData.email.trim());
            // 1. Check if candidate already exists
            const { data: candidates, error: fetchError } = await supabase
                .from('candidates')
                .select('id, full_name')
                .eq('email', formData.email.trim())
                .limit(1);

            if (fetchError) {
                console.error('[REGISTRATION] Fetch candidate error:', fetchError);
                throw fetchError;
            }

            const existingCandidate = candidates?.[0];
            let candidateId = null;
            let candidateName = null;

            if (existingCandidate) {
                console.log('[REGISTRATION] Existing candidate found:', existingCandidate.id);
                // 2. Candidate exists, check for *active* or *completed* associated interview
                // We just check if any interview exists at all for this candidate
                const { data: interviews, error: interviewError } = await supabase
                    .from('interviews')
                    .select('id')
                    .eq('candidate_id', existingCandidate.id)
                    .limit(1);

                if (interviewError) {
                    console.error('[REGISTRATION] Fetch interview error:', interviewError);
                    throw interviewError;
                }

                if (interviews && interviews.length > 0) {
                    console.log('[REGISTRATION] Active interview exists. Blocking.');
                    // Interview exists - block registration
                    setError('This email has already been registered for an assessment.');
                    setLoading(false);
                    return;
                } else {
                    console.log('[REGISTRATION] No interview found for candidate. Updating info and proceeding.');
                    // No interview exists (likely deleted by admin)
                    // Update existing candidate and proceed
                    const { data: updatedCandidate, error: updateError } = await supabase
                        .from('candidates')
                        .update({
                            full_name: formData.fullName.trim(),
                            phone: formData.phone.trim()
                        })
                        .eq('id', existingCandidate.id)
                        .select()
                        .maybeSingle();

                    if (updateError) {
                        console.error('[REGISTRATION] Update candidate error:', updateError);
                        throw updateError;
                    }
                    candidateId = updatedCandidate.id;
                    candidateName = updatedCandidate.full_name;
                }
            } else {
                console.log('[REGISTRATION] Creating new candidate...');
                // 3. New candidate, insert record
                const { data: newCandidate, error: insertError } = await supabase
                    .from('candidates')
                    .insert([
                        {
                            full_name: formData.fullName.trim(),
                            email: formData.email.trim(),
                            phone: formData.phone.trim()
                        }
                    ])
                    .select()
                    .maybeSingle();

                if (insertError) {
                    console.error('[REGISTRATION] Insert candidate error:', insertError);
                    throw insertError;
                }
                candidateId = newCandidate.id;
                candidateName = newCandidate.full_name;
            }

            // 4. Store session info and navigate
            localStorage.setItem('candidateId', candidateId);
            localStorage.setItem('candidateName', candidateName);

            console.log('[REGISTRATION] Success! Navigating to rules.');
            navigate('/exam-rules', {
                state: {
                    candidateData: { id: candidateId, full_name: candidateName }
                }
            });
        } catch (err) {
            console.error('Final registration error object:', err);
            if (err.code === '23505' || err.message?.includes('unique constraint')) {
                setError('This email has already been registered for an assessment.');
            } else {
                setError(`Failed to register: ${err.message || 'Please try again.'}`);
            }
        } finally {
            setLoading(false);
        }
    };


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
                {/* Main Content Grid */}
                <div className={`relative z-10 w-[90%] max-w-[90%] grid lg:grid-cols-12 gap-8 lg:gap-12 items-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

                    {/* Left Column: Brand Story (Span 7) */}
                    <div className="lg:col-span-7 space-y-8 text-center lg:text-left pt-6 lg:pt-0">

                        {/* Logo & Headline */}
                        <div className="space-y-4 animate-hero">
                            <div className="inline-block p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl mb-4 hover:border-brand-blue/50 transition-colors duration-500 group">
                                <img
                                    src="/sdet-logo.png"
                                    alt="SDET Logo"
                                    className="h-16 md:h-20 w-auto object-contain group-hover:scale-105 transition-transform duration-500"
                                />
                            </div>

                            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
                                <span className="block text-white">Software Quality</span>
                                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-cyan-400">Testing Company</span>
                            </h1>

                            <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light">
                                Welcome to the <span className="text-white font-medium">SDET Interview Portal</span>.
                                We believe in precision, excellence, and the relentless pursuit of quality.
                            </p>
                        </div>

                        {/* GPTW Badge Feature */}
                        <div className="animate-hero-delay-1 flex justify-center lg:justify-start">
                            <div className="badge-container group cursor-pointer">
                                <div className="flex items-center gap-5 bg-slate-900/40 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 hover:border-brand-orange/50 transition-all duration-300 shadow-xl">
                                    <GPTWBadge size="md" className="drop-shadow-lg group-hover:scale-110 transition-transform duration-500" />
                                    <div className="text-left">
                                        <div className="text-[10px] font-bold text-brand-orange uppercase tracking-widest mb-0.5">Globally Recognized</div>
                                        <div className="text-lg font-bold text-white leading-none">Great Place To Work®</div>
                                        <div className="text-xs text-slate-400 mt-0.5">Certified 2025-2026</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Trust Indicators */}
                        <div className="animate-hero-delay-2 hidden md:flex gap-6 justify-center lg:justify-start text-xs font-medium text-slate-500 uppercase tracking-widest">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-brand-blue" />
                                <span>Secure Environment</span>
                            </div>
                            <div className="w-1 h-1 bg-slate-700 rounded-full my-auto"></div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-brand-orange" />
                                <span>Verified Assessment</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Check-in Card (Span 5) */}
                    <div className="lg:col-span-5 w-full max-w-[26rem] mx-auto lg:ml-auto animate-hero-delay-1">
                        <div className="glass-card-ultra rounded-3xl p-1 relative group">
                            {/* Gradient Border Glow */}
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-blue via-transparent to-brand-orange opacity-50 rounded-3xl -z-10 group-hover:opacity-100 transition-opacity duration-700"></div>

                            <div className="bg-slate-900/80 backdrop-blur-xl rounded-[1.4rem] p-6 md:p-8 h-full relative overflow-hidden">
                                {/* Card Header */}
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                                        Candidate Check-In
                                    </h2>
                                    <p className="text-slate-400 text-xs">Please enter your details to initialize session.</p>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {error && (
                                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-pulse">
                                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                            {error}
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider ml-1">Full Name</label>
                                            <div className="relative group/input">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within/input:text-brand-blue transition-colors" />
                                                <input
                                                    type="text"
                                                    value={formData.fullName}
                                                    onChange={handleChange('fullName')}
                                                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-10 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/50 transition-all font-medium text-sm"
                                                    placeholder="Enter full name"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider ml-1">Email</label>
                                            <div className="relative group/input">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within/input:text-brand-blue transition-colors" />
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={handleChange('email')}
                                                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-10 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/50 transition-all font-medium text-sm"
                                                    placeholder="name@example.com"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider ml-1">Phone</label>
                                            <div className="relative group/input">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within/input:text-brand-blue transition-colors" />
                                                <input
                                                    type="tel"
                                                    value={formData.phone}
                                                    onChange={handleChange('phone')}
                                                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-10 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/50 transition-all font-medium text-sm"
                                                    placeholder="10-digit phone number"
                                                    required
                                                    maxLength="10"
                                                    pattern="[0-9]{10}"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-brand-blue to-[#004282] hover:to-brand-blue transition-all duration-300 py-3.5 shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/40 transform hover:-translate-y-0.5"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                                        <span className="relative flex items-center justify-center gap-2 font-bold text-white text-base tracking-wide">
                                            {loading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Initializing...
                                                </>
                                            ) : (
                                                <>
                                                    Start Interview
                                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                </>
                                            )}
                                        </span>
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

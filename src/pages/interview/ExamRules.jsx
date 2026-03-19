import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Clock, AlertCircle, CheckCircle2, ShieldAlert, BookOpen, FileEdit, Camera, RefreshCw, ShieldCheck, Zap } from 'lucide-react';

export default function ExamRules() {
    const navigate = useNavigate();
    const location = useLocation();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const [mounted, setMounted] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [step, setStep] = useState('rules'); // 'rules' | 'biometric'
    const [capturedImage, setCapturedImage] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [stream, setStream] = useState(null);

    const candidateData = location.state?.candidateData;

    useEffect(() => {
        setMounted(true);
        if (!candidateData) {
            const savedId = localStorage.getItem('candidateId');
            if (!savedId) navigate('/');
        }
    }, [navigate, candidateData]);

    // Handle Cleanup
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    const startCamera = async () => {
        setCameraError('');
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                setIsCameraActive(true);
            }
        } catch (err) {
            console.error('Camera Error:', err);
            setCameraError('Camera access denied or not found. Please enable camera permissions to proceed.');
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        // Ensure we have valid dimensions, default to standard aspect ratio if 0
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Final sanity check: dataUrl should not be empty or too short
        if (!dataUrl || dataUrl.length < 1000) {
            console.error('Captured image data is invalid or too small');
            return;
        }

        setCapturedImage(dataUrl);
        localStorage.setItem('pending_identity_photo', dataUrl);
        
        // Stop the stream
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCameraActive(false);
    };

    const resetCamera = () => {
        setCapturedImage(null);
        localStorage.removeItem('pending_identity_photo');
        startCamera();
    };

    const handleContinue = () => {
        if (step === 'rules') {
            setStep('biometric');
            startCamera();
            return;
        }

        if (!capturedImage) {
            alert('Please capture your identity photo to proceed.');
            return;
        }

        navigate('/criteria-selection', {
            state: {
                candidateData,
                capturedImage
            }
        });
    };

    const rules = [
        { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', title: 'Timed Assessment', description: 'The exam has a fixed time limit. The timer auto-submits when time expires.' },
        { icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', title: 'Strict Proctoring', description: 'Tab switching and Copy/Paste are disabled. Violations lead to disqualification.' },
        { icon: Camera, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', title: 'Identity Verification', description: 'A snapshot of your identity will be captured for proctoring logs.' },
        { icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', title: 'Two Sections', description: 'General Questions followed by your chosen elective (Java/Python).' },
        { icon: FileEdit, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', title: 'Review Answers', description: 'You can navigate back and modify your answers until final submission.' },
        { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', title: 'No Negative Marking', description: 'No negative marking. Attempt all questions for the best possible score.' }
    ];

    return (
        <div className="h-full w-full bg-universe relative overflow-y-auto overflow-x-hidden font-sans text-slate-100 pb-12">
            
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="grid-texture"></div>
            </div>

            <div className="min-h-full w-full flex flex-col items-center justify-center p-4 lg:p-8">
                <div className={`relative z-10 w-full max-w-4xl mx-auto transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    
                    {step === 'rules' ? (
                        <>
                            {/* Rules View */}
                            <div className="text-center mb-10">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-blue/20 rounded-3xl mb-4 rotate-3">
                                    <ShieldCheck className="w-10 h-10 text-brand-blue" />
                                </div>
                                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                                    Assessment Protocols
                                </h1>
                                <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light">
                                    Please verify and agree to the following security guidelines.
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                                {rules.map((rule, index) => (
                                    <div key={index} className={`bg-white/5 backdrop-blur-xl border ${rule.border} rounded-2xl p-5 hover:bg-white/10 transition-all group`}>
                                        <div className={`inline-flex items-center justify-center w-10 h-10 ${rule.bg} rounded-lg mb-3 group-hover:scale-110 transition-transform`}>
                                            <rule.icon className={`w-5 h-5 ${rule.color}`} />
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-1">{rule.title}</h3>
                                        <p className="text-slate-400 text-xs leading-relaxed">{rule.description}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-[#0b101b]/80 backdrop-blur-3xl border border-white/10 rounded-2xl p-6 mb-8 flex items-center justify-between gap-6">
                                <label className="flex items-center gap-4 cursor-pointer group flex-1">
                                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="sr-only peer" />
                                    <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${agreed ? 'bg-brand-blue border-brand-blue' : 'border-slate-700 group-hover:border-slate-500'}`}>
                                        {agreed && <CheckCircle2 className="w-5 h-5 text-white" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-semibold">I acknowledge and agree to the protocols</p>
                                        <p className="text-slate-500 text-xs mt-0.5">Strict compliance is required for valid assessment results.</p>
                                    </div>
                                </label>
                                
                                <button
                                    onClick={handleContinue}
                                    disabled={!agreed}
                                    className={`py-4 px-10 rounded-2xl font-bold text-lg transition-all flex items-center gap-2 shadow-2xl ${
                                        !agreed ? 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed' : 'bg-brand-blue text-white hover:bg-blue-600 shadow-brand-blue/20'
                                    }`}
                                >
                                    Agree & Continue
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="max-w-2xl mx-auto">
                            {/* Biometric View */}
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-500/20 rounded-2xl mb-4">
                                    <Camera className="w-8 h-8 text-cyan-400 animate-pulse" />
                                </div>
                                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Biometric Verification</h1>
                                <p className="text-slate-400">Capture an identification photo to begin the assessment.</p>
                            </div>

                            <div className="relative mb-8 aspect-video rounded-3xl overflow-hidden border border-white/10 bg-black/40 group shadow-2xl">
                                {!capturedImage ? (
                                    <>
                                        {cameraError ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-red-500/5">
                                                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                                                <p className="text-white font-medium mb-4">{cameraError}</p>
                                                <button onClick={startCamera} className="bg-red-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-600 transition-all flex items-center gap-2">
                                                    <RefreshCw className="w-4 h-4" /> Try Again
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700" />
                                                <div className="absolute inset-0 pointer-events-none border-[20px] border-white/5 flex items-center justify-center">
                                                    <div className="w-48 h-48 border-2 border-cyan-500/30 rounded-full border-dashed animate-spin-slow"></div>
                                                    <div className="absolute w-64 h-64 border border-cyan-500/20 rounded-3xl"></div>
                                                    <div className="absolute top-4 left-4 flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                        <span className="text-[10px] font-mono text-slate-400 tracking-widest uppercase">REC • SYSTEM_ACTIVE</span>
                                                    </div>
                                                </div>
                                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                                                    <button onClick={capturePhoto} className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all group">
                                                        <div className="w-12 h-12 border-4 border-brand-blue rounded-full"></div>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <div className="relative w-full h-full">
                                        <img src={capturedImage} alt="Captured identity" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-brand-blue/20 mix-blend-overlay"></div>
                                        <div className="absolute top-4 right-4">
                                            <button onClick={resetCamera} className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-xl text-sm font-bold border border-white/10 hover:bg-black/80 transition-all flex items-center gap-2">
                                                <RefreshCw className="w-4 h-4" /> Retake Photo
                                            </button>
                                        </div>
                                        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                                            <div className="flex items-center gap-3">
                                                <ShieldCheck className="text-emerald-400 w-6 h-6" />
                                                <span className="text-white font-bold">Identity Captured Successfully</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <canvas ref={canvasRef} className="hidden" />

                            <div className="flex justify-center">
                                <button
                                    onClick={handleContinue}
                                    disabled={!capturedImage}
                                    className={`w-full py-5 rounded-3xl font-bold text-xl transition-all flex items-center justify-center gap-2 shadow-2xl relative overflow-hidden group ${
                                        !capturedImage ? 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed' : 'bg-gradient-to-r from-brand-blue via-blue-600 to-cyan-500 text-white shadow-brand-blue/30'
                                    }`}
                                >
                                    <Zap className={`w-6 h-6 ${capturedImage ? 'text-amber-400' : ''}`} />
                                    Start Full Assessment
                                    <ArrowRight className="w-6 h-6" />
                                    {capturedImage && <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>}
                                </button>
                            </div>
                            
                            <p className="text-center text-slate-500 text-xs mt-6 max-w-sm mx-auto">
                                By proceeding, you confirm that the captured image is yours and you consent to the proctoring protocols.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .animate-spin-slow { animation: spin 10s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

import React, { useState } from 'react';
import { X, ChevronLeft, Battery, Wifi, Signal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MobilePreview = ({ onClose, questions, activeSet, criteriaName }) => {
    const [currentStep, setCurrentStep] = useState('welcome'); // welcome, set_selection, general, elective_selection, elective
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

    // Filter questions logic (mocking the candidate flow)
    const generalQuestions = questions.filter(q => (q.section === 'general' || !q.section) && q.category === activeSet);
    const electiveQuestions = questions.filter(q => q.section === 'elective' && q.category === activeSet);

    // Group electives by subject
    const electiveSubjects = [...new Set(electiveQuestions.map(q => q.subsection || 'Unassigned'))];

    const currentQuestions = currentStep === 'general' ? generalQuestions :
        currentStep === 'elective' ? electiveQuestions.filter(q => q.subsection === selectedSubject) : [];

    const handleNext = () => {
        if (currentQuestionIdx < currentQuestions.length - 1) {
            setCurrentQuestionIdx(prev => prev + 1);
        } else {
            if (currentStep === 'general') {
                setCurrentStep('elective_selection');
                setCurrentQuestionIdx(0);
            } else if (currentStep === 'elective') {
                setCurrentStep('completed');
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
                <X size={24} />
            </button>

            {/* Phone Frame */}
            <div className="relative w-[375px] h-[812px] bg-black rounded-[3rem] border-8 border-slate-800 shadow-2xl overflow-hidden flex flex-col">
                {/* Dynamic Island / Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-20"></div>

                {/* Status Bar */}
                <div className="h-12 flex items-center justify-between px-6 pt-2 text-white text-xs font-semibold z-10 relative">
                    <span>9:41</span>
                    <div className="flex gap-1.5">
                        <Signal size={14} />
                        <Wifi size={14} />
                        <Battery size={14} />
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto scrollbar-hide bg-slate-900 text-white relative">
                    <AnimatePresence mode='wait'>
                        {/* Welcome Screen */}
                        {currentStep === 'welcome' && (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="h-full flex flex-col items-center justify-center p-6 text-center"
                            >
                                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mb-6 shadow-xl shadow-cyan-500/20"></div>
                                <h2 className="text-2xl font-bold mb-2">SDET Interview</h2>
                                <p className="text-slate-400 mb-8">Welcome, Candidate</p>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/10 w-full mb-8 text-left">
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Selected Criteria</p>
                                    <p className="font-medium text-cyan-400">{criteriaName || 'Fresher Drive'}</p>
                                    <div className="mt-3 pt-3 border-t border-white/10">
                                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Question Set</p>
                                        <p className="font-medium text-white">{activeSet}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setCurrentStep('general')}
                                    className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition-all"
                                >
                                    Start Exam
                                </button>
                            </motion.div>
                        )}

                        {/* Question Interface (General & Elective) */}
                        {(currentStep === 'general' || currentStep === 'elective') && currentQuestions.length > 0 && (
                            <motion.div
                                key="quiz"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="min-h-full p-6 flex flex-col"
                            >
                                {/* Header */}
                                <div className="flex justify-between items-center mb-6">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${currentStep === 'general' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                        {currentStep === 'general' ? 'Section A: General' : `Section B: ${selectedSubject}`}
                                    </span>
                                    <span className="text-slate-500 text-sm font-mono">
                                        {currentQuestionIdx + 1}/{currentQuestions.length}
                                    </span>
                                </div>

                                {/* Question Card */}
                                <div className="flex-1">
                                    <p className="text-lg font-medium leading-relaxed mb-8">
                                        {currentQuestions[currentQuestionIdx]?.question_text}
                                    </p>

                                    <div className="space-y-3">
                                        {currentQuestions[currentQuestionIdx]?.options &&
                                            (Array.isArray(currentQuestions[currentQuestionIdx].options) ? currentQuestions[currentQuestionIdx].options : JSON.parse(currentQuestions[currentQuestionIdx].options)).map((opt, i) => (
                                                <button
                                                    key={i}
                                                    className="w-full p-4 text-left rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 active:scale-[0.98] transition-all flex items-center gap-3"
                                                >
                                                    <span className="w-6 h-6 rounded flex items-center justify-center bg-white/10 text-xs font-bold shrink-0">
                                                        {String.fromCharCode(65 + i)}
                                                    </span>
                                                    {opt}
                                                </button>
                                            ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleNext}
                                    className="mt-6 w-full py-4 bg-white text-black font-bold rounded-xl active:scale-[0.98] transition-all"
                                >
                                    {currentQuestionIdx < currentQuestions.length - 1 ? 'Next Question' : 'Finish Section'}
                                </button>
                            </motion.div>
                        )}

                        {/* Elective Selection Screen */}
                        {currentStep === 'elective_selection' && (
                            <motion.div
                                key="elective_select"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="h-full flex flex-col items-center justify-center p-6 text-center"
                            >
                                <h3 className="text-xl font-bold mb-2">Choose Elective</h3>
                                <p className="text-slate-400 mb-8">Select your specialized subject</p>

                                <div className="space-y-3 w-full">
                                    {electiveSubjects.map(sub => (
                                        <button
                                            key={sub}
                                            onClick={() => {
                                                setSelectedSubject(sub);
                                                setCurrentStep('elective');
                                            }}
                                            className="w-full p-4 bg-purple-500/10 border border-purple-500/20 text-purple-200 font-bold rounded-xl hover:bg-purple-500/20 transition-all capitalize"
                                        >
                                            {sub}
                                        </button>
                                    ))}
                                    {electiveSubjects.length === 0 && (
                                        <p className="text-slate-500 text-sm">No electives found in this set.</p>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Completed Screen */}
                        {currentStep === 'completed' && (
                            <motion.div
                                key="completed"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center p-6 text-center"
                            >
                                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-6">
                                    <Check size={32} className="text-white" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Exam Completed</h3>
                                <p className="text-slate-400 mb-8">Thank you for attending.</p>
                                <button
                                    onClick={onClose}
                                    className="px-8 py-3 bg-white/10 rounded-full text-white font-medium hover:bg-white/20"
                                >
                                    Close Preview
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Home Indicator */}
                <div className="h-8 flex items-center justify-center pointer-events-none">
                    <div className="w-32 h-1 bg-white/20 rounded-full"></div>
                </div>
            </div>
        </div>
    );
};

export default MobilePreview;

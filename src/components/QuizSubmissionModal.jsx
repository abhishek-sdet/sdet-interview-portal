
import React from 'react';
import { AlertTriangle, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QuestionStatusMap from './QuestionStatusMap';

/**
 * QuizSubmissionModal Component
 * Premium styled confirmation dialog with QUESTION GRID
 */
export default function QuizSubmissionModal({ isOpen, onClose, onReview, onConfirm, questions = [], answers = {}, totalExpectedQuestions }) {
    if (!isOpen) return null;

    // Calculate Stats
    const totalQuestions = totalExpectedQuestions || questions.length;
    const answeredCount = questions.filter(q => answers[q.id]).length;
    const unansweredCount = totalQuestions - answeredCount;
    const isAllAnswered = answeredCount >= totalQuestions;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative bg-[#0b101b] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isAllAnswered ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                    {isAllAnswered ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Assessment Summary</h3>
                                    <p className="text-sm text-slate-400">Review your status before submitting</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Scroll Area */}
                        <div className="p-6 overflow-y-auto custom-scrollbar">

                            {/* Alert Message */}
                            {!isAllAnswered && (
                                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-bold text-amber-400 text-sm mb-1">Unanswered Questions Detected</h4>
                                        <p className="text-slate-300 text-sm">
                                            You have <span className="text-white font-bold">{unansweredCount}</span> unanswered question(s).
                                            It is recommended to answer all questions before submitting.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                                    <div className="text-2xl font-bold text-green-400 mb-1">{answeredCount}</div>
                                    <div className="text-xs uppercase tracking-wider text-slate-400">Answered</div>
                                </div>
                                <div className={`p-4 rounded-xl border text-center ${unansweredCount > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/5 border-white/5'}`}>
                                    <div className={`text-2xl font-bold mb-1 ${unansweredCount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{unansweredCount}</div>
                                    <div className="text-xs uppercase tracking-wider text-slate-400">Unanswered</div>
                                </div>
                            </div>

                            {/* Question Map Grid */}
                            <div className="mt-8">
                                <QuestionStatusMap
                                    questions={questions}
                                    answers={answers}
                                    currentIndex={questions.length} // Force "past" state to show skipped as Red
                                    onQuestionSelect={onReview ? (idx) => { onReview(idx); onClose(); } : undefined} // Allow clicking grid to navigate in review mode? Or keep it simple. User asked for "Back to Review" button.
                                // Actually, if onReview is passed, let's just use it? Wait, handleReview finds the first unanswered. 
                                // If the user clicks a specific number in the modal grid, they probably want to go THERE.
                                // But handleReview (from parent) is simple "find first". 
                                // Let's stick to the button request first. The grid shows status.
                                />
                            </div>

                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-white/5 bg-white/5 flex gap-4">
                            <button
                                onClick={onReview || onClose}
                                className="flex-1 px-4 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all text-sm uppercase tracking-wide"
                            >
                                Back to Review
                            </button>
                            <button
                                onClick={isAllAnswered ? onConfirm : undefined}
                                disabled={!isAllAnswered}
                                className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all text-sm uppercase tracking-wide
                                    ${isAllAnswered
                                        ? 'bg-gradient-to-r from-brand-blue to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/20 cursor-pointer'
                                        : 'bg-white/5 text-slate-500 cursor-not-allowed opacity-50'
                                    }
                                `}
                            >
                                Submit Assessment
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

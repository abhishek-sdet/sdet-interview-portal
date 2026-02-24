
import React from 'react';

/**
 * QuestionStatusMap Component
 * Reusable grid displaying question status (Answered/Unanswered/Skipped/Current)
 */
export default function QuestionStatusMap({ questions = [], answers = {}, currentIndex = null, onQuestionSelect = null, visitedQuestions = new Set() }) {

    if (!questions || questions.length === 0) return null;

    return (
        <div className="w-full">
            <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                Question Map
                <div className="h-px bg-white/10 flex-grow"></div>
            </h4>

            <div className="flex flex-wrap gap-2">
                {questions.map((q, idx) => {
                    const isAnswered = !!answers[q.id];
                    const isCurrent = currentIndex === idx;

                    let statusColor = '';
                    let statusShadow = '';

                    if (isAnswered) {
                        // ANSWERED: Green
                        statusColor = 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400';
                        statusShadow = 'shadow-[0_0_10px_rgba(52,211,153,0.1)]';
                    } else if (currentIndex !== null && idx === currentIndex) {
                        // CURRENT: Bright neutral
                        statusColor = 'bg-white/10 border-white/20 text-white';
                    } else if (visitedQuestions.has(idx)) {
                        // SKIPPED: Visited but Unanswered (Red)
                        statusColor = 'bg-red-500/10 border-red-500/20 text-red-400';
                    } else {
                        // UNANSWERED / NEVER VISITED: Grey (Dim)
                        statusColor = 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-400';
                    }

                    return (
                        <React.Fragment key={q.id}>
                            <button
                                onClick={() => onQuestionSelect && onQuestionSelect(idx)}
                                disabled={!onQuestionSelect}
                                className={`
                                    relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 border
                                    ${isCurrent
                                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0b101b] scale-110 z-10 shadow-lg'
                                        : 'hover:scale-105'
                                    }
                                    ${statusColor}
                                    ${statusShadow}
                                `}
                                title={`Question ${idx + 1}`}
                            >
                                {idx + 1}

                                {/* Status Indicator Dot for Answered */}
                                {isAnswered && (
                                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]"></div>
                                )}
                            </button>

                            {/* Visual Separator after Question 23 */}
                            {idx === 22 && questions.length > 23 && (
                                <div className="w-full flex items-center gap-3 my-2">
                                    <div className="h-px bg-purple-500/30 flex-grow"></div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-purple-500/10 border border-purple-500/20">
                                        <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                        </svg>
                                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Technical Questions</span>
                                    </div>
                                    <div className="h-px bg-purple-500/30 flex-grow"></div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-4 justify-center text-[10px] text-slate-400 uppercase tracking-wider flex-wrap">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                    <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500/20 border border-red-500/50"></div>
                    <span>Skipped</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-white/5 border border-white/10"></div>
                    <span>Pending</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-lg border-2 border-white"></div>
                    <span>Current</span>
                </div>
            </div>
        </div>
    );
}

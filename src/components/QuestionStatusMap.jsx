import React from 'react';

/**
 * QuestionStatusMap Component
 * Ultra-compact grid displaying question status for professional assessment UI.
 */
export default function QuestionStatusMap({ 
    questions = [], 
    answers = {}, 
    currentIndex = null, 
    onQuestionSelect = null, 
    visitedQuestions = new Set() 
}) {
    if (!questions || questions.length === 0) return null;

    // Determine the transition point (first elective question)
    const electiveStartIndex = questions.findIndex(q => q.section === 'elective');

    return (
        <div className="w-full space-y-4 animate-fade-in">
            {/* Header & Legend Inline - Spacious Navigation Style */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-4 bg-brand-blue rounded-full shadow-[0_0_10px_rgba(0,119,255,0.5)]"></div>
                    <span className="text-xs font-black text-white/80 uppercase tracking-widest">
                        Assessment Map
                    </span>
                </div>
                
                {/* Clean Legend for Bottom Area */}
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Answered</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.4)]"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Skipped</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full border border-brand-blue bg-brand-blue/20 ring-1 ring-brand-blue/50"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Current</span>
                    </div>
                </div>
            </div>

            <div className="relative">
                <div className="relative z-10 flex flex-wrap gap-1.5 justify-center">
                    {questions.map((q, idx) => {
                        const isAnswered = !!answers[q.id];
                        const isCurrent = currentIndex === idx;
                        const isVisited = visitedQuestions.has(idx);
                        const isElective = electiveStartIndex !== -1 && idx >= electiveStartIndex;
                        const isFirstElective = electiveStartIndex !== -1 && idx === electiveStartIndex;

                        return (
                            <React.Fragment key={q.id}>
                                {/* Optimized Section Divider */}
                                {isFirstElective && (
                                    <div className="w-full h-px bg-white/10 my-2 flex items-center justify-center relative">
                                        <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
                                        <span className="relative z-10 bg-[#0b101b] px-3 text-[9px] font-black text-purple-400 uppercase tracking-[0.2em] flex items-center gap-2 border border-white/5 rounded-full py-0.5">
                                            <span className="w-1 h-1 rounded-full bg-purple-500 animate-pulse"></span>
                                            Technical Domain
                                        </span>
                                    </div>
                                )}

                                <button
                                    onClick={() => onQuestionSelect && onQuestionSelect(idx)}
                                    disabled={!onQuestionSelect}
                                    className={`
                                        w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all duration-300 border
                                        ${isCurrent
                                            ? 'bg-brand-blue border-brand-blue text-white shadow-[0_0_15px_rgba(0,119,255,0.4)] scale-110 z-10 ring-1 ring-white/20'
                                            : isAnswered
                                                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/40 hover:border-emerald-500/50'
                                                : isVisited
                                                    ? 'bg-red-500/10 border-red-500/20 text-red-400/90 hover:bg-red-500/30'
                                                    : isElective
                                                        ? 'bg-purple-500/10 border-purple-500/20 text-purple-400/70 hover:bg-purple-500/30'
                                                        : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/20 hover:border-white/30'
                                        }
                                    `}
                                    title={`Question ${idx + 1}${isElective ? ' (Technical)' : ''}`}
                                >
                                    {idx + 1}
                                </button>
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

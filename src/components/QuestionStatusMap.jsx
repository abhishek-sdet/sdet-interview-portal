import React from 'react';

/**
 * QuestionStatusMap Component
 * Clean, single-row grid (or wrapping rows) displaying question status.
 * Handles general + elective questions with a subtle separator.
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
    const hasElective = electiveStartIndex !== -1;

    const generalQs = hasElective ? questions.slice(0, electiveStartIndex) : questions;
    const electiveQs = hasElective ? questions.slice(electiveStartIndex) : [];

    const renderButton = (q, idx) => {
        const isAnswered = !!answers[q.id];
        const isCurrent = currentIndex === idx;
        const isVisited = visitedQuestions.has(idx);
        const isElective = hasElective && idx >= electiveStartIndex;

        return (
            <button
                key={q.id}
                onClick={() => onQuestionSelect && onQuestionSelect(idx)}
                disabled={!onQuestionSelect}
                className={`
                    w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold 
                    transition-all duration-200 border flex-shrink-0
                    ${isCurrent
                        ? 'bg-brand-blue border-brand-blue text-white shadow-[0_0_12px_rgba(0,119,255,0.5)] scale-110 z-10 ring-1 ring-white/20'
                        : isAnswered
                            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/40'
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
        );
    };

    return (
        <div className="w-full space-y-3 animate-fade-in">
            {/* Header & Legend */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-brand-blue rounded-full shadow-[0_0_8px_rgba(0,119,255,0.5)]" />
                    <span className="text-[11px] font-black text-white/80 uppercase tracking-widest">Assessment Map</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Answered</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Skipped</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full border border-brand-blue bg-brand-blue/30" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Current</span>
                    </div>
                </div>
            </div>

            {/* Questions Grid */}
            <div className="space-y-2">
                {/* General Questions Row */}
                {generalQs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {generalQs.map((q, idx) => renderButton(q, idx))}
                    </div>
                )}

                {/* Elective Section with Separator */}
                {electiveQs.length > 0 && (
                    <div className="space-y-2">
                        {/* Separator */}
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[9px] font-black text-purple-400 uppercase tracking-wider whitespace-nowrap">
                                <span className="w-1 h-1 rounded-full bg-purple-500 animate-pulse" />
                                Technical Domain
                            </span>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
                        </div>

                        {/* Elective Buttons */}
                        <div className="flex flex-wrap gap-1">
                            {electiveQs.map((q, localIdx) => renderButton(q, electiveStartIndex + localIdx))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

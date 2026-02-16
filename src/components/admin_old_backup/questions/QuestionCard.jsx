import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

/**
 * QuestionCard Component
 * Displays a single question with edit and delete actions
 */
export default function QuestionCard({ question, index, onEdit, onDelete }) {
    return (
        <div className="bg-slate-900/40 rounded-lg p-4 group hover:bg-slate-800/60 transition-colors border border-transparent hover:border-white/5">
            <div className="flex justify-between items-start gap-4">
                <div className="flex gap-3">
                    <span className="text-slate-500 font-mono text-xs pt-1">
                        {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                        <p className="text-slate-300 text-sm font-medium leading-relaxed line-clamp-2">
                            {question.question_text}
                        </p>
                        <div className="flex gap-2 mt-2">
                            <span className="text-[10px] uppercase font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                                {question.correct_option ? `Ans: ${question.correct_option.toUpperCase()}` : 'No Ans'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(question)}
                        className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                        title="Edit"
                    >
                        <Edit2 size={14} />
                    </button>
                    <button
                        onClick={() => onDelete(question.id)}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

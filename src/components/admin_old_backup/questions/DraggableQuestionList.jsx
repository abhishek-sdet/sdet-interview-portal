import React from 'react';
import { Reorder, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Check, GripVertical } from 'lucide-react';

const DraggableQuestionList = ({ questions, onReorder, onEdit, onDelete, type = 'general' }) => {
    // Determine color scheme based on type
    const isGeneral = type === 'general';
    const accentColor = isGeneral ? 'cyan' : 'purple';
    const bgColor = isGeneral ? 'bg-cyan-500/10' : 'bg-purple-500/10';
    const textColor = isGeneral ? 'text-cyan-400' : 'text-purple-400';
    const borderColor = isGeneral ? 'border-cyan-500/20' : 'border-purple-500/20';

    return (
        <Reorder.Group axis="y" values={questions} onReorder={onReorder} className="space-y-4">
            <AnimatePresence>
                {questions.map((q, idx) => {
                    const parseOptions = (opts) => {
                        if (!opts) return [];
                        if (Array.isArray(opts)) return opts;
                        if (typeof opts === 'object') return Object.values(opts);
                        try {
                            const parsed = JSON.parse(opts);
                            if (Array.isArray(parsed)) return parsed;
                            if (typeof parsed === 'object') return Object.values(parsed);
                            return [];
                        } catch (e) {
                            return [];
                        }
                    };
                    const options = parseOptions(q.options);
                    const correct = q.correct_option;

                    return (
                        <Reorder.Item key={q.id} value={q} id={q.id}>
                            <div className={`glass-panel-inner p-5 rounded-xl border border-white/5 bg-black/20 relative group hover:border-${accentColor}-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-${accentColor}-500/5 cursor-grab active:cursor-grabbing`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-4 w-full">
                                        {/* Drag Handle */}
                                        <div className="mt-2 text-slate-600 group-hover:text-slate-400 transition-colors">
                                            <GripVertical size={20} />
                                        </div>

                                        <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg ${bgColor} ${textColor} font-mono font-bold text-sm ${borderColor} border`}>
                                            {String(idx + 1).padStart(2, '0')}
                                        </div>
                                        <div className="w-full">
                                            <p className="text-slate-200 font-medium text-base leading-relaxed mb-4">
                                                {q.question_text}
                                            </p>

                                            <div className="grid grid-cols-1 gap-2">
                                                {options.map((opt, i) => {
                                                    const label = String.fromCharCode(65 + i);
                                                    const isCorrect = label === correct;
                                                    return (
                                                        <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${isCorrect ? 'bg-green-500/10 border border-green-500/30 text-green-300 shadow-[0_0_15px_-3px_rgba(34,197,94,0.2)]' : 'bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10'}`}>
                                                            <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded text-xs ${isCorrect ? 'bg-green-500 text-black font-bold shadow-sm' : 'bg-white/10 text-slate-500'}`}>
                                                                {label}
                                                            </span>
                                                            <span className={isCorrect ? 'font-medium' : ''}>{opt}</span>
                                                            {isCorrect && <Check size={16} className="ml-auto text-green-400 drop-shadow-sm" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all ml-4">
                                        <button onClick={(e) => { e.stopPropagation(); onEdit(q); }} className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors border border-transparent hover:border-cyan-500/20" title="Edit">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onDelete(q.id); }} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20" title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Reorder.Item>
                    );
                })}
            </AnimatePresence>
        </Reorder.Group>
    );
};

export default DraggableQuestionList;

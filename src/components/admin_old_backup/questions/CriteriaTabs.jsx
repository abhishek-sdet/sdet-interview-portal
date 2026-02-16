import React from 'react';

/**
 * CriteriaTabs Component
 * Displays tabs for filtering questions by criteria
 */
export default function CriteriaTabs({ criteria, activeTab, onTabChange }) {
    return (
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl overflow-x-auto no-scrollbar mb-6">
            {criteria.map((c) => (
                <button
                    key={c.id}
                    onClick={() => onTabChange(c.id)}
                    className={`
                        px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                        ${activeTab === c.id
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }
                    `}
                >
                    {c.name}
                </button>
            ))}
        </div>
    );
}

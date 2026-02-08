import React from 'react';

export default function CriteriaTabs({ criteria, selectedCriteria, onSelectCriteria }) {
    return (
        <div className="flex gap-2 mb-6 border-b border-white/10">
            {criteria.map((criterion) => (
                <button
                    key={criterion.id}
                    onClick={() => onSelectCriteria(criterion.id)}
                    className={`px-6 py-3 font-medium transition-all relative ${selectedCriteria === criterion.id
                            ? 'text-purple-400 border-b-2 border-purple-400'
                            : 'text-gray-400 hover:text-white'
                        }`}
                >
                    {criterion.name}
                    {selectedCriteria === criterion.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                    )}
                </button>
            ))}
        </div>
    );
}

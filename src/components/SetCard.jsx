import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Upload, Plus, AlertTriangle, Edit2, Trash2, Check, X } from 'lucide-react';

export default function SetCard({
    set,
    criteriaId,
    onBulkUpload,
    onAddQuestion,
    onEditQuestion,
    onDeleteQuestion,
    onRenameSet,
    onDeleteSet
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const { name, type, questions, stats } = set;
    const hasQuestionsWithoutAnswers = questions.some(q => !q.correct_answer);

    // Handler functions
    const handleStartRename = () => {
        setEditedName(name);
        setIsEditing(true);
    };

    const handleSaveRename = async () => {
        if (!editedName.trim()) {
            alert('Set name cannot be empty');
            return;
        }
        if (editedName.trim() === name) {
            setIsEditing(false);
            return;
        }
        await onRenameSet(criteriaId, name, editedName.trim());
        setIsEditing(false);
    };

    const handleCancelRename = () => {
        setIsEditing(false);
        setEditedName('');
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        await onDeleteSet(criteriaId, name);
        setIsDeleting(false);
        setShowDeleteConfirm(false);
    };

    return (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden mb-4">
            {/* Set Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            {/* Editable Set Name */}
                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={editedName}
                                        onChange={(e) => setEditedName(e.target.value)}
                                        className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveRename();
                                            if (e.key === 'Escape') handleCancelRename();
                                        }}
                                    />
                                    <button
                                        onClick={handleSaveRename}
                                        className="p-1 hover:bg-green-500/20 text-green-400 rounded transition-colors"
                                        title="Save"
                                    >
                                        <Check size={16} />
                                    </button>
                                    <button
                                        onClick={handleCancelRename}
                                        className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                        title="Cancel"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <h3 className="text-lg font-semibold text-white">{name}</h3>
                            )}

                            {/* Set Type Badge */}
                            {type === 'optional' && (
                                <span className="px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30">
                                    Optional
                                </span>
                            )}

                            {/* Warning Badge for Missing Answers */}
                            {hasQuestionsWithoutAnswers && (
                                <span className="px-2 py-1 text-xs font-medium bg-orange-500/20 text-orange-400 rounded-full border border-orange-500/30 flex items-center gap-1">
                                    <AlertTriangle size={12} />
                                    Missing Answers
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                            <span>{stats.total} question{stats.total !== 1 ? 's' : ''}</span>
                            <span>•</span>
                            <span>{stats.active} active</span>
                            {stats.avgDifficulty && (
                                <>
                                    <span>•</span>
                                    <span className="capitalize">{stats.avgDifficulty} difficulty</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleStartRename}
                        className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                        title="Rename set"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                        title="Delete set"
                    >
                        <Trash2 size={16} />
                    </button>
                    <button
                        onClick={() => onBulkUpload(name, criteriaId)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-all border border-purple-500/30"
                    >
                        <Upload size={16} />
                        Bulk Upload
                    </button>
                    <button
                        onClick={() => onAddQuestion(name, criteriaId)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all border border-green-500/30"
                    >
                        <Plus size={16} />
                        Add Question
                    </button>
                </div>
            </div>

            {/* Questions List (Collapsible) */}
            {isExpanded && (
                <div className="border-t border-white/10">
                    {questions.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            <p>No questions in this set yet.</p>
                            <p className="text-sm mt-2">Use "Bulk Upload" or "Add Question" to get started.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {questions.map((question, index) => (
                                <QuestionRow
                                    key={question.id}
                                    question={question}
                                    index={index}
                                    onEdit={onEditQuestion}
                                    onDelete={onDeleteQuestion}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-800 border border-white/10 rounded-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-white mb-2">Delete Set?</h3>
                        <p className="text-gray-300 mb-4">
                            Are you sure you want to delete <span className="font-semibold text-white">"{name}"</span>?
                        </p>
                        <p className="text-red-400 text-sm mb-6">
                            This will permanently delete {questions.length} question{questions.length !== 1 ? 's' : ''}. This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete Set'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function QuestionRow({ question, index, onEdit, onDelete }) {
    const hasAnswer = !!question.correct_answer;

    return (
        <div className="p-4 hover:bg-white/5 transition-colors group">
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-medium text-sm">
                    {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <p className="text-white font-medium mb-2">{question.question_text}</p>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                                {question.options.map((option, i) => (
                                    <div
                                        key={i}
                                        className={`px-3 py-2 rounded-lg ${option === question.correct_answer
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                            : 'bg-white/5 text-gray-300'
                                            }`}
                                    >
                                        <span className="font-medium">{String.fromCharCode(65 + i)}.</span> {option}
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-3 mt-3 text-xs">
                                <span className={`px-2 py-1 rounded-full ${question.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                                    question.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-red-500/20 text-red-400'
                                    }`}>
                                    {question.difficulty}
                                </span>
                                <span className="text-gray-400">{question.category}</span>
                                {!hasAnswer && (
                                    <span className="px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 flex items-center gap-1">
                                        <AlertTriangle size={12} />
                                        No answer set
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => onEdit(question)}
                                className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                                title="Edit question"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => onDelete(question.id)}
                                className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                title="Delete question"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

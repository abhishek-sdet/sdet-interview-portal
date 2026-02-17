import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleLayout from '@/components/admin/SimpleLayout';
import ConfirmModal from '@/components/ConfirmModal';
import { supabase } from '@/lib/supabase';
import { Search, Trash2, Edit2, Save, X, Filter, AlertCircle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';

export default function ManageQuestions() {
    const navigate = useNavigate();
    const [criteria, setCriteria] = useState([]);
    const [selectedCriteria, setSelectedCriteria] = useState('all');
    const [questions, setQuestions] = useState([]);
    const [filteredQuestions, setFilteredQuestions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingQuestion, setEditingQuestion] = useState(null);

    // Modal States
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [showDeleteSetConfirm, setShowDeleteSetConfirm] = useState(null); // { criteriaId, setName }
    const [successModal, setSuccessModal] = useState(null); // { title, message }

    // Track expanded sets - default to all collapsed (empty object)
    // Keys will be `${criteriaId}-${setName}`
    const [expandedSets, setExpandedSets] = useState({});

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate('/admin/login');
        }
    };

    const fetchCriteria = async () => {
        try {
            const { data, error } = await supabase
                .from('criteria')
                .select('*')
                .order('name');

            if (error) throw error;
            setCriteria(data || []);
        } catch (err) {
            console.error('Error fetching criteria:', err);
        }
    };

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('questions')
                .select(`
                    *,
                    criteria(name)
                `)
                .order('created_at', { ascending: false });

            if (selectedCriteria !== 'all') {
                query = query.eq('criteria_id', selectedCriteria);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Normalize options - use JSONB array if available, otherwise build from individual columns
            const normalizedData = (data || []).map(q => {
                let options = q.options;

                // If options is not an array or is empty, build from individual columns
                if (!Array.isArray(options) || options.length === 0) {
                    options = [
                        q.option_a || '',
                        q.option_b || '',
                        q.option_c || '',
                        q.option_d || ''
                    ];
                }

                return { ...q, options };
            });

            setQuestions(normalizedData);
            setFilteredQuestions(normalizedData);
        } catch (err) {
            console.error('Error fetching questions:', err);
        } finally {
            setLoading(false);
        }
    };

    const filterQuestions = () => {
        if (!searchTerm) {
            setFilteredQuestions(questions);
            return;
        }

        const filtered = questions.filter(q =>
            q.question_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.category?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredQuestions(filtered);
    };

    useEffect(() => {
        checkAuth();
        fetchCriteria();
    }, []);

    useEffect(() => {
        if (criteria.length > 0) {
            fetchQuestions();
        }
    }, [selectedCriteria, criteria]);

    useEffect(() => {
        filterQuestions();
    }, [searchTerm, questions]);

    const handleEdit = (question) => {
        setEditingQuestion({
            ...question,
            options: question.options || ['', '', '', '']
        });
    };

    const handleSaveEdit = async () => {
        try {
            const { error } = await supabase
                .from('questions')
                .update({
                    question_text: editingQuestion.question_text,
                    options: editingQuestion.options,
                    option_a: editingQuestion.options[0] || '',
                    option_b: editingQuestion.options[1] || '',
                    option_c: editingQuestion.options[2] || '',
                    option_d: editingQuestion.options[3] || '',
                    correct_option: editingQuestion.correct_option,
                    correct_answer: editingQuestion.options[editingQuestion.correct_option.charCodeAt(0) - 65] || ''
                })
                .eq('id', editingQuestion.id);

            if (error) throw error;

            // Refresh questions
            fetchQuestions();
            setEditingQuestion(null);
        } catch (err) {
            console.error('Error updating question:', err);
            alert('Failed to update question');
        }
    };

    const handleDelete = async (questionId) => {
        try {
            const { error } = await supabase
                .from('questions')
                .delete()
                .eq('id', questionId);

            if (error) throw error;

            // Refresh questions
            fetchQuestions();
            setShowDeleteConfirm(null);
            setSuccessModal({
                title: 'Success',
                message: 'Question deleted successfully.'
            });
        } catch (err) {
            console.error('Error deleting question:', err);
        }
    };

    const handleDeleteSetClick = (criteriaId, setName) => {
        if (!criteriaId) {
            return;
        }
        setShowDeleteSetConfirm({ criteriaId, setName });
    };

    const confirmDeleteSet = async () => {
        if (!showDeleteSetConfirm) return;

        const { criteriaId, setName } = showDeleteSetConfirm;
        setShowDeleteSetConfirm(null); // Close modal immediately

        try {
            let query = supabase
                .from('questions')
                .delete({ count: 'exact' })
                .eq('criteria_id', criteriaId);

            // Handle "Uncategorized" which might be NULL in DB
            if (setName === 'Uncategorized') {
                // Delete rows where category IS NULL OR category IS 'Uncategorized'
                query = query.or(`category.is.null,category.eq.Uncategorized`);
            } else {
                query = query.eq('category', setName);
            }

            const { count, error } = await query;

            if (error) throw error;

            console.log(`Deleted ${count} questions`);

            if (count === 0) {
                setSuccessModal({
                    title: 'No Questions Deleted',
                    message: 'No questions were deleted. This might be due to a permission issue or data mismatch.',
                    type: 'info'
                });
            } else {
                setSuccessModal({
                    title: 'Success',
                    message: `Successfully deleted ${count} questions in "${setName}"`
                });
            }

            // Refresh questions
            fetchQuestions();
        } catch (err) {
            console.error('Error deleting question set:', err);
            setSuccessModal({
                title: 'Error',
                message: `Failed to delete question set: ${err.message}`,
                type: 'danger'
            });
        }
    };

    // Group questions by set and section
    const questionSets = React.useMemo(() => {
        return filteredQuestions.reduce((acc, q) => {
            // If criteria_id is missing, use a fallback
            const criteriaId = q.criteria_id || 'unknown';
            const category = q.category || 'Uncategorized';
            const key = `${criteriaId}-${category}`;

            if (!acc[key]) {
                acc[key] = {
                    key,
                    criteriaId: q.criteria_id,
                    criteriaName: q.criteria?.name || 'Unknown',
                    setName: category,
                    sections: {
                        general: [],
                        elective: [] // Both Java and Python together
                    }
                };
            }

            // Categorize by section
            if (q.section === 'elective') {
                acc[key].sections.elective.push(q);
            } else {
                acc[key].sections.general.push(q);
            }

            return acc;
        }, {});
    }, [filteredQuestions]);

    const toggleSet = (key) => {
        setExpandedSets(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const renderQuestion = (q, qIdx) => {
        const isEditing = editingQuestion?.id === q.id;
        const currentOptions = isEditing ? editingQuestion.options : q.options;

        return (
            <div key={q.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all">
                <div className="flex items-start gap-4">
                    {/* Question Number */}
                    <div className="flex-shrink-0 w-10 h-10 bg-brand-blue/20 rounded-lg flex items-center justify-center">
                        <span className="text-brand-blue font-bold">{qIdx + 1}</span>
                    </div>

                    <div className="flex-1 space-y-4">
                        {/* Question Text */}
                        {isEditing ? (
                            <textarea
                                value={editingQuestion.question_text}
                                onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all resize-none"
                                rows={3}
                            />
                        ) : (
                            <p className="text-white font-medium text-lg leading-relaxed">{q.question_text}</p>
                        )}

                        {/* Options - All 4 options displayed */}
                        <div className="space-y-3">
                            {[0, 1, 2, 3].map((optIdx) => {
                                const optionLetter = String.fromCharCode(65 + optIdx);
                                const isCorrect = optionLetter === (isEditing ? editingQuestion.correct_option : q.correct_option);
                                const optionText = currentOptions[optIdx] || '';

                                return (
                                    <div key={optIdx} className="flex items-start gap-3">
                                        {isEditing && (
                                            <button
                                                onClick={() => setEditingQuestion({ ...editingQuestion, correct_option: optionLetter })}
                                                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all mt-1 ${isCorrect
                                                    ? 'bg-green-500 border-green-500'
                                                    : 'border-white/20 hover:border-white/40'
                                                    }`}
                                                title="Mark as correct answer"
                                            >
                                                {isCorrect && <CheckCircle size={14} className="text-white" />}
                                            </button>
                                        )}
                                        <div className={`flex-1 flex items-start gap-3 px-4 py-3 rounded-lg transition-all ${isCorrect
                                            ? 'bg-green-500/10 border-2 border-green-500/30'
                                            : 'bg-white/5 border border-white/10'
                                            }`}>
                                            <span className={`font-bold flex-shrink-0 mt-0.5 ${isCorrect ? 'text-green-400' : 'text-slate-400'}`}>
                                                {optionLetter})
                                            </span>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={optionText}
                                                    onChange={(e) => {
                                                        const newOptions = [...editingQuestion.options];
                                                        newOptions[optIdx] = e.target.value;
                                                        setEditingQuestion({ ...editingQuestion, options: newOptions });
                                                    }}
                                                    className="flex-1 bg-transparent text-white focus:outline-none"
                                                    placeholder={`Option ${optionLetter}`}
                                                />
                                            ) : (
                                                <span className={`flex-1 ${isCorrect ? 'text-green-300 font-medium' : 'text-slate-300'}`}>
                                                    {optionText}
                                                </span>
                                            )}
                                            {isCorrect && !isEditing && (
                                                <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            {q.section && <span className="px-2 py-1 bg-white/5 rounded capitalize">Section: {q.section}</span>}
                            {q.subsection && <span className="px-2 py-1 bg-white/5 rounded capitalize">{q.subsection}</span>}
                            <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded font-medium">✓ Correct: {q.correct_option}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex gap-2">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleSaveEdit}
                                    className="p-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 text-green-400 rounded-lg transition-all"
                                    title="Save changes"
                                >
                                    <Save size={18} />
                                </button>
                                <button
                                    onClick={() => setEditingQuestion(null)}
                                    className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg transition-all"
                                    title="Cancel"
                                >
                                    <X size={18} />
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => handleEdit(q)}
                                    className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 rounded-lg transition-all"
                                    title="Edit question"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(q.id)}
                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-lg transition-all"
                                    title="Delete question"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Delete Confirmation */}
                {showDeleteConfirm === q.id && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
                        <p className="text-sm text-red-400">Are you sure you want to delete this question?</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleDelete(q.id)}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <SimpleLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Manage Questions</h1>
                    <p className="text-slate-400">View, edit, and delete uploaded questions</p>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search questions or set name..."
                            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                        />
                    </div>

                    {/* Criteria Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <select
                            value={selectedCriteria}
                            onChange={(e) => setSelectedCriteria(e.target.value)}
                            className="pl-11 pr-8 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all appearance-none cursor-pointer"
                        >
                            <option value="all" className="bg-[#0b101b]">All Criteria</option>
                            {criteria.map(c => (
                                <option key={c.id} value={c.id} className="bg-[#0b101b]">
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Question Sets */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin"></div>
                    </div>
                ) : Object.keys(questionSets).length === 0 ? (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-12 text-center">
                        <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400">No questions found</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.values(questionSets).map((set) => {
                            const totalQuestions = set.sections.general.length + set.sections.elective.length;
                            const isExpanded = !!expandedSets[set.key];

                            return (
                                <div key={set.key} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden transition-all">
                                    {/* Set Header - Clickable to Toggle */}
                                    <div
                                        onClick={() => toggleSet(set.key)}
                                        className="bg-gradient-to-r from-brand-blue/10 to-purple-500/10 border-b border-white/10 p-6 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Toggle Icon */}
                                            <div className={`p-2 rounded-lg bg-white/5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                                                <ChevronDown className="w-5 h-5 text-brand-blue" />
                                            </div>

                                            <div>
                                                <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                                                    {set.setName}
                                                    {!isExpanded && (
                                                        <span className="text-sm font-normal px-3 py-1 bg-white/10 rounded-full text-slate-300">
                                                            {totalQuestions} Qs
                                                        </span>
                                                    )}
                                                </h2>
                                                <p className="text-slate-400">{set.criteriaName} • {totalQuestions} total questions</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent toggling when clicking delete
                                                    handleDeleteSetClick(set.criteriaId, set.setName);
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-lg transition-all flex-shrink-0 z-10"
                                            >
                                                <Trash2 size={18} />
                                                Delete Set
                                            </button>
                                        </div>
                                    </div>

                                    {/* Set Content - Collapsible */}
                                    {isExpanded && (
                                        <div className="p-6 space-y-8 animate-in slide-in-from-top-4 duration-300">
                                            {/* Section A: General Questions */}
                                            {set.sections.general.length > 0 && (
                                                <div>
                                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg">Section A</span>
                                                        General Questions ({set.sections.general.length})
                                                    </h3>
                                                    <div className="space-y-4">
                                                        {set.sections.general.map((q, qIdx) => renderQuestion(q, qIdx))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Section B: Elective Questions (Java & Python together) */}
                                            {set.sections.elective.length > 0 && (
                                                <div>
                                                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                                        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg">Section B</span>
                                                        Elective Questions ({set.sections.elective.length})
                                                    </h3>
                                                    <p className="text-sm text-slate-400 mb-4">
                                                        Aspirants will choose between Java or Python during the interview
                                                    </p>
                                                    <div className="space-y-4">
                                                        {set.sections.elective.map((q, qIdx) => renderQuestion(q, qIdx))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                {/* Modals using generic ConfirmModal */}
                <ConfirmModal
                    isOpen={!!showDeleteSetConfirm}
                    onClose={() => setShowDeleteSetConfirm(null)}
                    onConfirm={confirmDeleteSet}
                    title="Delete Entire Set?"
                    message={showDeleteSetConfirm ? `Are you sure you want to delete all questions in "${showDeleteSetConfirm.setName}"? This action cannot be undone.` : ''}
                    confirmText="Delete Set"
                    cancelText="Cancel"
                    type="danger"
                />

                <ConfirmModal
                    isOpen={!!showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(null)}
                    onConfirm={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
                    title="Delete Question?"
                    message="Are you sure you want to delete this question? This action cannot be undone."
                    confirmText="Delete"
                    cancelText="Cancel"
                    type="danger"
                />

                <ConfirmModal
                    isOpen={!!successModal}
                    onClose={() => setSuccessModal(null)}
                    onConfirm={() => setSuccessModal(null)}
                    title={successModal?.title || 'Success'}
                    message={successModal?.message || ''}
                    confirmText="OK"
                    cancelText={null}
                    type={successModal?.type || 'success'}
                />
            </div>
        </SimpleLayout>
    );
}

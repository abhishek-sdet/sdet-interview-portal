import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleLayout from '@/components/admin/SimpleLayout';
import ConfirmModal from '@/components/ConfirmModal';
import { supabase } from '@/lib/supabase';
import { Search, Trash2, Edit2, Save, X, Filter, AlertCircle, CheckCircle, ChevronDown, ChevronRight, PlusCircle } from 'lucide-react';

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

    // Add Question Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [addLoading, setAddLoading] = useState(false);
    const [newQuestion, setNewQuestion] = useState({
        criteria_id: '',
        category: '',
        question_text: '',
        options: ['', '', '', ''],
        correct_option: 'A',
        section: 'general',
        subsection: 'computer_science',
        difficulty: 'medium',
        is_active: true
    });

    // Inline Add Question State (add below a specific question)
    const [inlineAddAfter, setInlineAddAfter] = useState(null); // question ID
    const [inlineNewQ, setInlineNewQ] = useState(null); // form data
    const [inlineAddLoading, setInlineAddLoading] = useState(false);

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

    const fetchQuestions = async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            let query = supabase
                .from('questions')
                .select(`
                    *,
                    criteria(name)
                `)
                .order('created_at', { ascending: true });

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
            if (showLoader) setLoading(false);
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
        const questionId = editingQuestion.id;
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
                    correct_answer: editingQuestion.options[editingQuestion.correct_option.charCodeAt(0) - 65] || '',
                    section: editingQuestion.section,
                    subsection: editingQuestion.subsection
                })
                .eq('id', editingQuestion.id);

            if (error) throw error;

            // Refresh questions without showing loader
            await fetchQuestions(false);
            setEditingQuestion(null);

            // Restore scroll position by scrolling to the specific question
            setTimeout(() => {
                const element = document.getElementById(`q-${questionId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
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

            // Refresh questions without showing loader
            fetchQuestions(false);
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

    const handleAddQuestion = async () => {
        if (!newQuestion.criteria_id || !newQuestion.category || !newQuestion.question_text) {
            alert('Please fill in Criteria, Set Name, and Question Text.');
            return;
        }
        if (newQuestion.options.some(o => !o.trim())) {
            alert('Please fill in all 4 options.');
            return;
        }
        setAddLoading(true);
        try {
            const correctIdx = newQuestion.correct_option.charCodeAt(0) - 65;
            const { error } = await supabase.from('questions').insert({
                criteria_id: newQuestion.criteria_id,
                category: newQuestion.category,
                question_text: newQuestion.question_text,
                options: newQuestion.options,
                option_a: newQuestion.options[0],
                option_b: newQuestion.options[1],
                option_c: newQuestion.options[2],
                option_d: newQuestion.options[3],
                correct_option: newQuestion.correct_option,
                correct_answer: newQuestion.options[correctIdx],
                section: newQuestion.section,
                subsection: newQuestion.subsection,
                difficulty: newQuestion.difficulty,
                is_active: true
            });
            if (error) throw error;
            setShowAddModal(false);
            setNewQuestion({ criteria_id: '', category: '', question_text: '', options: ['', '', '', ''], correct_option: 'A', section: 'general', subsection: 'computer_science', difficulty: 'medium', is_active: true });
            setSuccessModal({ title: 'Question Added', message: 'Question has been added successfully.' });
            fetchQuestions(false);
        } catch (err) {
            console.error('Error adding question:', err);
            alert('Failed to add question: ' + err.message);
        } finally {
            setAddLoading(false);
        }
    };

    const handleInlineAddOpen = (q) => {
        setInlineAddAfter(q.id);
        setInlineNewQ({
            criteria_id: q.criteria_id || '',
            category: q.category || '',
            question_text: '',
            options: ['', '', '', ''],
            correct_option: 'A',
            section: q.section || 'general',
            subsection: q.subsection || 'computer_science',
            difficulty: 'medium',
            is_active: true
        });
    };

    const handleInlineAdd = async () => {
        if (!inlineNewQ.question_text.trim()) {
            alert('Please enter the question text.');
            return;
        }
        if (inlineNewQ.options.some(o => !o.trim())) {
            alert('Please fill in all 4 options.');
            return;
        }
        setInlineAddLoading(true);
        try {
            const correctIdx = inlineNewQ.correct_option.charCodeAt(0) - 65;
            const { error } = await supabase.from('questions').insert({
                criteria_id: inlineNewQ.criteria_id,
                category: inlineNewQ.category,
                question_text: inlineNewQ.question_text,
                options: inlineNewQ.options,
                option_a: inlineNewQ.options[0],
                option_b: inlineNewQ.options[1],
                option_c: inlineNewQ.options[2],
                option_d: inlineNewQ.options[3],
                correct_option: inlineNewQ.correct_option,
                correct_answer: inlineNewQ.options[correctIdx],
                section: inlineNewQ.section,
                subsection: inlineNewQ.subsection,
                difficulty: inlineNewQ.difficulty,
                is_active: true
            });
            if (error) throw error;
            setInlineAddAfter(null);
            setInlineNewQ(null);
            setSuccessModal({ title: 'Question Added', message: 'Question has been added successfully.' });
            fetchQuestions(false);
        } catch (err) {
            console.error('Error adding question:', err);
            alert('Failed to add question: ' + err.message);
        } finally {
            setInlineAddLoading(false);
        }
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

            // Refresh questions without showing loader
            fetchQuestions(false);
        } catch (err) {
            console.error('Error deleting question set:', err);
            setSuccessModal({
                title: 'Error',
                message: `Failed to delete question set: ${err.message}`,
                type: 'danger'
            });
        }
    };

    // Group questions by set and subsection (5 subsections)
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
                        computer_science: [],
                        logical_reasoning: [],
                        miscellaneous: [],
                        grammar: [],
                        elective: [] // Java and Python together
                    }
                };
            }

            // Categorize by subsection
            const subsection = q.subsection || 'computer_science'; // Default fallback

            if (q.section === 'elective') {
                acc[key].sections.elective.push(q);
            } else if (subsection === 'computer_science') {
                acc[key].sections.computer_science.push(q);
            } else if (subsection === 'logical_reasoning') {
                acc[key].sections.logical_reasoning.push(q);
            } else if (subsection === 'miscellaneous') {
                acc[key].sections.miscellaneous.push(q);
            } else if (subsection === 'grammar') {
                acc[key].sections.grammar.push(q);
            } else {
                // Fallback for any unknown subsection
                acc[key].sections.computer_science.push(q);
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
        const isInlineOpen = inlineAddAfter === q.id;

        return (
            <div key={q.id}>
                <div id={`q-${q.id}`} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all">
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
                                    const correctOpt = (isEditing ? editingQuestion.correct_option : q.correct_option) || '';
                                    const isCorrect = optionLetter === correctOpt.toUpperCase();
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
                                                ? 'bg-green-500/20 border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
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
                                {isEditing ? (
                                    <div className="flex items-center gap-2 w-full">
                                        <select
                                            value={editingQuestion.subsection || 'computer_science'}
                                            onChange={(e) => setEditingQuestion({ ...editingQuestion, subsection: e.target.value })}
                                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white focus:outline-none focus:border-brand-blue"
                                        >
                                            <option value="computer_science" className="bg-[#0b101b]">Computer Science</option>
                                            <option value="logical_reasoning" className="bg-[#0b101b]">Logical Reasoning</option>
                                            <option value="miscellaneous" className="bg-[#0b101b]">Miscellaneous</option>
                                            <option value="grammar" className="bg-[#0b101b]">Grammar</option>
                                            <option value="java" className="bg-[#0b101b]">Java</option>
                                            <option value="python" className="bg-[#0b101b]">Python</option>
                                        </select>
                                        <select
                                            value={editingQuestion.section || 'general'}
                                            onChange={(e) => setEditingQuestion({ ...editingQuestion, section: e.target.value })}
                                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white focus:outline-none focus:border-brand-blue"
                                        >
                                            <option value="general" className="bg-[#0b101b]">General</option>
                                            <option value="elective" className="bg-[#0b101b]">Elective</option>
                                        </select>
                                    </div>
                                ) : (
                                    <>
                                        {q.section && <span className="px-2 py-1 bg-white/5 rounded capitalize">Section: {q.section}</span>}
                                        {q.subsection && <span className="px-2 py-1 bg-white/5 rounded capitalize">{q.subsection}</span>}
                                    </>
                                )}
                                {(() => {
                                    const optLetter = q.correct_option ? q.correct_option.toUpperCase() : '?';
                                    const optIdx = optLetter.charCodeAt(0) - 65;
                                    const optText = (q.options && q.options[optIdx]) ? q.options[optIdx] : '';
                                    return (
                                        <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded font-medium">
                                            ✓ Correct: {optLetter} {optText ? <span className="text-green-300 ml-1">({optText})</span> : ''}
                                        </span>
                                    );
                                })()}
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
                                    <button
                                        onClick={() => isInlineOpen ? setInlineAddAfter(null) : handleInlineAddOpen(q)}
                                        className={`p-2 rounded-lg border transition-all ${isInlineOpen
                                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400'
                                            }`}
                                        title="Add question below"
                                    >
                                        <PlusCircle size={18} />
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

                {/* Inline Add Question Form - appears below this question */}
                {isInlineOpen && inlineNewQ && (
                    <div className="ml-4 border-l-2 border-emerald-500/30 pl-4 mt-2">
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                                    <PlusCircle size={16} /> Add New Question Below
                                </p>
                                <button onClick={() => setInlineAddAfter(null)} className="text-slate-500 hover:text-white transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Question Text */}
                            <textarea
                                value={inlineNewQ.question_text}
                                onChange={(e) => setInlineNewQ({ ...inlineNewQ, question_text: e.target.value })}
                                placeholder="Enter the question text..."
                                rows={2}
                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all resize-none text-sm"
                            />

                            {/* Options */}
                            <div className="space-y-2">
                                {['A', 'B', 'C', 'D'].map((letter, idx) => (
                                    <div key={letter} className="flex items-center gap-2">
                                        <button
                                            onClick={() => setInlineNewQ({ ...inlineNewQ, correct_option: letter })}
                                            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${inlineNewQ.correct_option === letter
                                                ? 'bg-green-500 border-green-500'
                                                : 'border-white/20 hover:border-white/40'
                                                }`}
                                            title={`Mark ${letter} as correct`}
                                        >
                                            {inlineNewQ.correct_option === letter && <CheckCircle size={12} className="text-white" />}
                                        </button>
                                        <div className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${inlineNewQ.correct_option === letter
                                            ? 'bg-green-500/10 border-green-500/30'
                                            : 'bg-white/5 border-white/10'
                                            }`}>
                                            <span className={`font-bold text-xs flex-shrink-0 ${inlineNewQ.correct_option === letter ? 'text-green-400' : 'text-slate-400'
                                                }`}>{letter})</span>
                                            <input
                                                type="text"
                                                value={inlineNewQ.options[idx]}
                                                onChange={(e) => {
                                                    const opts = [...inlineNewQ.options];
                                                    opts[idx] = e.target.value;
                                                    setInlineNewQ({ ...inlineNewQ, options: opts });
                                                }}
                                                placeholder={`Option ${letter}`}
                                                className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Subsection override */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="block text-xs text-slate-500 mb-1">Subsection</label>
                                    <select
                                        value={inlineNewQ.subsection}
                                        onChange={(e) => setInlineNewQ({ ...inlineNewQ, subsection: e.target.value })}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 transition-all"
                                    >
                                        <option value="computer_science" className="bg-[#0b101b]">Computer Science / Software Testing</option>
                                        <option value="logical_reasoning" className="bg-[#0b101b]">Logical Reasoning</option>
                                        <option value="miscellaneous" className="bg-[#0b101b]">Miscellaneous</option>
                                        <option value="grammar" className="bg-[#0b101b]">Grammar / English</option>
                                        <option value="java" className="bg-[#0b101b]">Java (Elective)</option>
                                        <option value="python" className="bg-[#0b101b]">Python (Elective)</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-slate-500 mb-1">Section</label>
                                    <select
                                        value={inlineNewQ.section}
                                        onChange={(e) => setInlineNewQ({ ...inlineNewQ, section: e.target.value })}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 transition-all"
                                    >
                                        <option value="general" className="bg-[#0b101b]">General (Mandatory)</option>
                                        <option value="elective" className="bg-[#0b101b]">Elective (Java/Python)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Save / Cancel */}
                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    onClick={() => setInlineAddAfter(null)}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-lg text-sm transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleInlineAdd}
                                    disabled={inlineAddLoading}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                                >
                                    {inlineAddLoading ? (
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <PlusCircle size={15} />
                                    )}
                                    {inlineAddLoading ? 'Saving...' : 'Save Question'}
                                </button>
                            </div>
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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Manage Questions</h1>
                        <p className="text-slate-400">View, edit, and delete uploaded questions</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-brand-blue hover:bg-blue-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-brand-blue/30"
                    >
                        <PlusCircle size={20} />
                        Add Question
                    </button>
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
                            const totalQuestions =
                                set.sections.computer_science.length +
                                set.sections.logical_reasoning.length +
                                set.sections.miscellaneous.length +
                                set.sections.grammar.length +
                                set.sections.elective.length;
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
                                            {/* Section 1: Computer Science */}
                                            {set.sections.computer_science.length > 0 && (
                                                <div>
                                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg">Section 1</span>
                                                        Computer Science ({set.sections.computer_science.length})
                                                    </h3>
                                                    <div className="space-y-4">
                                                        {set.sections.computer_science.map((q, qIdx) => renderQuestion(q, qIdx))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Section 2: Logical Reasoning */}
                                            {set.sections.logical_reasoning.length > 0 && (
                                                <div>
                                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg">Section 2</span>
                                                        Logical Reasoning ({set.sections.logical_reasoning.length})
                                                    </h3>
                                                    <div className="space-y-4">
                                                        {set.sections.logical_reasoning.map((q, qIdx) => renderQuestion(q, qIdx))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Section 3: Miscellaneous Logic */}
                                            {set.sections.miscellaneous.length > 0 && (
                                                <div>
                                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg">Section 3</span>
                                                        Miscellaneous Logic ({set.sections.miscellaneous.length})
                                                    </h3>
                                                    <div className="space-y-4">
                                                        {set.sections.miscellaneous.map((q, qIdx) => renderQuestion(q, qIdx))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Section 4: Grammar */}
                                            {set.sections.grammar.length > 0 && (
                                                <div>
                                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                                        <span className="px-3 py-1 bg-pink-500/20 text-pink-400 rounded-lg">Section 4</span>
                                                        Grammar ({set.sections.grammar.length})
                                                    </h3>
                                                    <div className="space-y-4">
                                                        {set.sections.grammar.map((q, qIdx) => renderQuestion(q, qIdx))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Section 5: Elective Questions (Java & Python) */}
                                            {set.sections.elective.length > 0 && (
                                                <div>
                                                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                                        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg">Section 5</span>
                                                        Java/Python ({set.sections.elective.length})
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

            {/* Add Question Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#0b101b] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h2 className="text-xl font-bold text-white">Add New Question</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5">
                            {/* Row 1: Criteria + Set Name */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Criteria *</label>
                                    <select
                                        value={newQuestion.criteria_id}
                                        onChange={(e) => setNewQuestion({ ...newQuestion, criteria_id: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue transition-all"
                                    >
                                        <option value="" className="bg-[#0b101b]">Select Criteria</option>
                                        {criteria.map(c => (
                                            <option key={c.id} value={c.id} className="bg-[#0b101b]">{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Set Name *</label>
                                    <input
                                        type="text"
                                        value={newQuestion.category}
                                        onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
                                        placeholder="e.g. Set A"
                                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue transition-all"
                                    />
                                </div>
                            </div>

                            {/* Question Text */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Question Text *</label>
                                <textarea
                                    value={newQuestion.question_text}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                                    placeholder="Enter the question..."
                                    rows={3}
                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue transition-all resize-none"
                                />
                            </div>

                            {/* Options */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Options * <span className="text-xs text-slate-500">(click the circle to mark correct answer)</span></label>
                                <div className="space-y-2">
                                    {['A', 'B', 'C', 'D'].map((letter, idx) => (
                                        <div key={letter} className="flex items-center gap-3">
                                            <button
                                                onClick={() => setNewQuestion({ ...newQuestion, correct_option: letter })}
                                                className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${newQuestion.correct_option === letter
                                                    ? 'bg-green-500 border-green-500'
                                                    : 'border-white/20 hover:border-white/40'
                                                    }`}
                                                title={`Mark ${letter} as correct`}
                                            >
                                                {newQuestion.correct_option === letter && <CheckCircle size={14} className="text-white" />}
                                            </button>
                                            <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${newQuestion.correct_option === letter
                                                ? 'bg-green-500/10 border-green-500/30'
                                                : 'bg-white/5 border-white/10'
                                                }`}>
                                                <span className={`font-bold text-sm flex-shrink-0 ${newQuestion.correct_option === letter ? 'text-green-400' : 'text-slate-400'
                                                    }`}>{letter})</span>
                                                <input
                                                    type="text"
                                                    value={newQuestion.options[idx]}
                                                    onChange={(e) => {
                                                        const opts = [...newQuestion.options];
                                                        opts[idx] = e.target.value;
                                                        setNewQuestion({ ...newQuestion, options: opts });
                                                    }}
                                                    placeholder={`Option ${letter}`}
                                                    className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Row 3: Section + Subsection */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Section</label>
                                    <select
                                        value={newQuestion.section}
                                        onChange={(e) => setNewQuestion({ ...newQuestion, section: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue transition-all"
                                    >
                                        <option value="general" className="bg-[#0b101b]">General (Mandatory)</option>
                                        <option value="elective" className="bg-[#0b101b]">Elective (Java/Python)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Subsection</label>
                                    <select
                                        value={newQuestion.subsection}
                                        onChange={(e) => setNewQuestion({ ...newQuestion, subsection: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue transition-all"
                                    >
                                        <option value="computer_science" className="bg-[#0b101b]">Computer Science / Software Testing</option>
                                        <option value="logical_reasoning" className="bg-[#0b101b]">Logical Reasoning</option>
                                        <option value="miscellaneous" className="bg-[#0b101b]">Miscellaneous</option>
                                        <option value="grammar" className="bg-[#0b101b]">Grammar / English</option>
                                        <option value="java" className="bg-[#0b101b]">Java (Elective)</option>
                                        <option value="python" className="bg-[#0b101b]">Python (Elective)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddQuestion}
                                disabled={addLoading}
                                className="flex items-center gap-2 px-5 py-2.5 bg-brand-blue hover:bg-blue-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                            >
                                {addLoading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <PlusCircle size={18} />
                                )}
                                {addLoading ? 'Adding...' : 'Add Question'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </SimpleLayout>
    );
}

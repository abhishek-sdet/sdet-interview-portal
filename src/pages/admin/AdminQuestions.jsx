import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2, Save, X, CheckCircle, XCircle, Filter, Upload, FileText } from 'lucide-react';
import mammoth from 'mammoth';
import CriteriaTabs from '@/components/CriteriaTabs';
import SetCard from '@/components/SetCard';
import { showToast } from '@/components/Toast';
import { preprocessDocumentText, detectSections, parseQuestionsInSection } from '@/utils/questionParser';
import { groupQuestionsBySet, getCriteriaLabel } from '@/utils/questionHelpers';

export default function AdminQuestions() {
    const [questions, setQuestions] = useState([]);
    const [criteria, setCriteria] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [filterCriteria, setFilterCriteria] = useState('all');
    const [selectedCriteria, setSelectedCriteria] = useState(null); // For tabs
    const [uploadProgress, setUploadProgress] = useState('');
    const [formData, setFormData] = useState({
        criteria_id: '',
        category: '',
        question_text: '',
        options: ['', '', '', ''],
        correct_answer: '',
        difficulty: 'easy',
        is_active: true
    });
    const [bulkImportData, setBulkImportData] = useState({
        criteria_id: '',
        category: '',
        difficulty: 'medium',
        file: null
    });
    // Removed error and success states - using toast notifications instead

    useEffect(() => {
        fetchCriteria();
        fetchQuestions();
    }, []);

    // Set default selected criteria when criteria are loaded
    useEffect(() => {
        if (criteria.length > 0 && !selectedCriteria) {
            setSelectedCriteria(criteria[0].id);
        }
    }, [criteria]);

    const fetchCriteria = async () => {
        try {
            const { data, error } = await supabase
                .from('criteria')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            setCriteria(data || []);
        } catch (err) {
            console.error('Failed to load criteria:', err);
        }
    };

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('questions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setQuestions(data || []);
        } catch (err) {
            setError('Failed to load questions');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation
        if (!formData.question_text.trim()) {
            setError('Question text is required');
            return;
        }

        if (formData.options.some(opt => !opt.trim())) {
            setError('All options must be filled');
            return;
        }

        if (!formData.correct_answer.trim()) {
            setError('Correct answer is required');
            return;
        }

        if (!formData.options.includes(formData.correct_answer)) {
            setError('Correct answer must be one of the options');
            return;
        }

        try {
            if (editingId) {
                // Update existing question
                const { error } = await supabase
                    .from('questions')
                    .update(formData)
                    .eq('id', editingId);

                if (error) throw error;
                setSuccess('Question updated successfully!');
            } else {
                // Create new question
                const { error } = await supabase
                    .from('questions')
                    .insert([formData]);

                if (error) throw error;
                setSuccess('Question created successfully!');
            }

            // Reset form and refresh list
            resetForm();
            fetchQuestions();
        } catch (err) {
            setError(err.message || 'Failed to save question');
            console.error(err);
        }
    };

    const handleEdit = (item) => {
        setFormData({
            criteria_id: item.criteria_id,
            category: item.category || '',
            question_text: item.question_text,
            options: item.options,
            correct_answer: item.correct_answer,
            difficulty: item.difficulty,
            is_active: item.is_active
        });
        setEditingId(item.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this question?')) return;

        try {
            const { error } = await supabase
                .from('questions')
                .update({ is_active: false })
                .eq('id', id);

            if (error) throw error;
            setSuccess('Question deactivated successfully!');
            fetchQuestions();
        } catch (err) {
            setError('Failed to delete question');
            console.error(err);
        }
    };

    const resetForm = () => {
        setFormData({
            criteria_id: '',
            category: '',
            question_text: '',
            options: ['', '', '', ''],
            correct_answer: '',
            difficulty: 'easy',
            is_active: true
        });
        setEditingId(null);
        setShowForm(false);
    };

    const updateOption = (index, value) => {
        const newOptions = [...formData.options];
        newOptions[index] = value;
        setFormData({ ...formData, options: newOptions });
    };

    const getCriteriaName = (criteriaId) => {
        const criterion = criteria.find(c => c.id === criteriaId);
        return criterion ? criterion.name : 'Unknown';
    };

    // Scoped actions for SetCard components
    const handleBulkUploadForSet = (setName, criteriaId) => {
        setBulkImportData({
            criteria_id: criteriaId,
            set_name: setName,
            category: '',
            difficulty: 'medium',
            file: null
        });
        setShowBulkImport(true);
    };

    const handleAddQuestionForSet = (setName, criteriaId) => {
        setFormData({
            criteria_id: criteriaId,
            set_name: setName,
            category: '',
            question_text: '',
            options: ['', '', '', ''],
            correct_answer: '',
            difficulty: 'easy',
            is_active: true
        });
        setShowForm(true);
    };

    // Rename all questions in a set
    const handleRenameSet = async (criteriaId, oldSetName, newSetName) => {
        try {
            const { error } = await supabase
                .from('questions')
                .update({ set_name: newSetName })
                .eq('criteria_id', criteriaId)
                .eq('set_name', oldSetName);

            if (error) throw error;

            setSuccess(`Renamed set "${oldSetName}" to "${newSetName}"`);
            fetchQuestions();
        } catch (err) {
            setError(err.message || 'Failed to rename set');
        }
    };

    // Delete all questions in a set (soft delete)
    const handleDeleteSet = async (criteriaId, setName) => {
        try {
            const { error } = await supabase
                .from('questions')
                .update({ is_active: false })
                .eq('criteria_id', criteriaId)
                .eq('set_name', setName);

            if (error) throw error;

            setSuccess(`Deleted set "${setName}" and all its questions`);
            fetchQuestions();
        } catch (err) {
            setError(err.message || 'Failed to delete set');
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.docx')) {
            setError('Please upload a .docx file');
            return;
        }

        setBulkImportData({ ...bulkImportData, file });
    };

    const parseWordDocument = async () => {
        if (!bulkImportData.file || !bulkImportData.criteria_id || !bulkImportData.category) {
            showToast.error('Please select a criteria, category, and upload a file');
            return;
        }

        setUploadProgress('Reading document...');

        try {
            const arrayBuffer = await bulkImportData.file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            let text = result.value;

            // PREPROCESSING: Split concatenated options and answers
            text = preprocessDocumentText(text);

            setUploadProgress('Analyzing document structure...');
            console.log('Document text (first 2000 chars):', text.substring(0, 2000));

            // STEP 1: Detect sections in the document
            const sections = detectSections(text);
            console.log(`Found ${sections.length} sections:`, sections.map(s => s.name));

            // STEP 2: Parse questions from each section
            const parsedQuestions = [];

            for (const section of sections) {
                console.log(`\n📁 Processing section: "${section.name}"`);
                console.log(`   Type: ${section.type}, Optional: ${section.isOptional}`);
                if (section.isOptional) {
                    console.log(`   Select ${section.selectCount} out of ${section.totalCount}`);
                }

                const sectionQuestions = parseQuestionsInSection(section, bulkImportData);
                parsedQuestions.push(...sectionQuestions);

                console.log(`   ✓ Extracted ${sectionQuestions.length} questions from this section`);
            }

            console.log(`\n✅ Total parsed: ${parsedQuestions.length} questions across ${sections.length} sections`);

            if (parsedQuestions.length === 0) {
                showToast.error(`No valid questions found in document. Detected ${sections.length} sections but couldn't extract questions. Check console for details.`);
                setUploadProgress('');
                console.log('Full document text:', text);
                return;
            }

            setUploadProgress(`Importing ${parsedQuestions.length} questions...`);

            // Insert all questions
            const { error: insertError } = await supabase
                .from('questions')
                .insert(parsedQuestions);

            if (insertError) throw insertError;

            showToast.success(`Successfully imported ${parsedQuestions.length} questions from ${sections.length} sections!`);
            setUploadProgress('');
            setBulkImportData({ criteria_id: '', category: '', difficulty: 'medium', file: null });
            setShowBulkImport(false);
            fetchQuestions();

        } catch (err) {
            showToast.error(err.message || 'Failed to parse document');
            setUploadProgress('');
            console.error('Parse error:', err);
        }
    };

    // Get filtered questions based on selected criteria
    const filteredQuestions = filterCriteria === 'all'
        ? questions
        : questions.filter(q => q.criteria_id === filterCriteria);

    const questionSets = groupQuestionsBySet(filteredQuestions);

    const getCriteriaLabel = (criteriaId) => {
        const criteria = getCriteriaName(criteriaId);
        if (criteria.includes('Fresher')) return 'Fresher';
        if (criteria.includes('Experienced')) return 'Experienced';
        return 'Both';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-cyan-400 mb-2">Question Management</h2>
                    <p className="text-slate-400">Manage interview questions for different criteria</p>
                </div>
            </div>



            {/* Create/Edit Form */}
            {showForm && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-white">
                            {editingId ? 'Edit Question' : 'Create New Question'}
                        </h3>
                        <button
                            onClick={resetForm}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Criteria <span className="text-red-400">*</span>
                                </label>
                                <select
                                    value={formData.criteria_id}
                                    onChange={(e) => setFormData({ ...formData, criteria_id: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    required
                                >
                                    <option value="">Select criteria...</option>
                                    {criteria.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Difficulty <span className="text-red-400">*</span>
                                </label>
                                <select
                                    value={formData.difficulty}
                                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    required
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Category <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                placeholder="e.g., Java, Python, API Testing, Automation"
                                required
                                list="category-suggestions"
                            />
                            <datalist id="category-suggestions">
                                <option value="Java" />
                                <option value="Python" />
                                <option value="JavaScript" />
                                <option value="API Testing" />
                                <option value="Automation" />
                                <option value="Manual Testing" />
                                <option value="Testing Basics" />
                                <option value="Testing Concepts" />
                                <option value="Selenium" />
                                <option value="Postman" />
                            </datalist>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Question Text <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={formData.question_text}
                                onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 min-h-[80px]"
                                placeholder="Enter the question..."
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Options <span className="text-red-400">*</span>
                            </label>
                            <div className="space-y-2">
                                {formData.options.map((option, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <span className="text-slate-400 font-mono text-sm w-6">{String.fromCharCode(65 + index)}.</span>
                                        <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => updateOption(index, e.target.value)}
                                            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                                            required
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Correct Answer <span className="text-red-400">*</span>
                            </label>
                            <select
                                value={formData.correct_answer}
                                onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                required
                            >
                                <option value="">Select correct answer...</option>
                                {formData.options.map((option, index) => (
                                    option.trim() && (
                                        <option key={index} value={option}>
                                            {String.fromCharCode(65 + index)}. {option}
                                        </option>
                                    )
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="w-4 h-4 rounded border-white/10 bg-white/5 text-cyan-500 focus:ring-cyan-400"
                            />
                            <label htmlFor="is_active" className="text-sm text-slate-300">
                                Active (visible in interviews)
                            </label>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                className="flex items-center gap-2 px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-all"
                            >
                                <Save size={18} />
                                {editingId ? 'Update' : 'Create'}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Bulk Import Form */}
            {showBulkImport && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                            <FileText size={24} />
                            Bulk Import from Word Document
                        </h3>
                        <button
                            onClick={() => {
                                setShowBulkImport(false);
                                setBulkImportData({ criteria_id: '', category: '', difficulty: 'medium', file: null });
                                setUploadProgress('');
                            }}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Format Instructions */}
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                            <h4 className="text-blue-400 font-semibold mb-2">Document Format Required:</h4>
                            <div className="text-slate-300 text-sm space-y-1 font-mono">
                                <p>Q: What is your question text?</p>
                                <p>A) First option</p>
                                <p>B) Second option</p>
                                <p>C) Third option</p>
                                <p>D) Fourth option</p>
                                <p>Correct: A</p>
                                <p className="mt-2 text-slate-400">(Repeat for each question)</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Criteria <span className="text-red-400">*</span>
                                </label>
                                <select
                                    value={bulkImportData.criteria_id}
                                    onChange={(e) => setBulkImportData({ ...bulkImportData, criteria_id: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                                >
                                    <option value="">Select criteria...</option>
                                    {criteria.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Default Difficulty <span className="text-red-400">*</span>
                                </label>
                                <select
                                    value={bulkImportData.difficulty}
                                    onChange={(e) => setBulkImportData({ ...bulkImportData, difficulty: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Category <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={bulkImportData.category}
                                onChange={(e) => setBulkImportData({ ...bulkImportData, category: e.target.value })}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                placeholder="e.g., Java, Python, API Testing"
                                required
                                list="bulk-category-suggestions"
                            />
                            <datalist id="bulk-category-suggestions">
                                <option value="Java" />
                                <option value="Python" />
                                <option value="JavaScript" />
                                <option value="API Testing" />
                                <option value="Automation" />
                                <option value="Manual Testing" />
                                <option value="Testing Basics" />
                                <option value="General" />
                            </datalist>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Upload Word Document (.docx) <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="file"
                                accept=".docx"
                                onChange={handleFileUpload}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-500 file:text-white hover:file:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-400"
                            />
                            {bulkImportData.file && (
                                <p className="text-green-400 text-sm mt-2 flex items-center gap-2">
                                    <CheckCircle size={16} />
                                    {bulkImportData.file.name}
                                </p>
                            )}
                        </div>

                        {uploadProgress && (
                            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-400"></div>
                                {uploadProgress}
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => {
                                    console.log('🔘 Import button clicked. Current state:', {
                                        hasFile: !!bulkImportData.file,
                                        fileName: bulkImportData.file?.name,
                                        hasCriteria: !!bulkImportData.criteria_id,
                                        criteriaId: bulkImportData.criteria_id,
                                        hasCategory: !!bulkImportData.category,
                                        category: bulkImportData.category,
                                        isUploading: !!uploadProgress,
                                        uploadProgress
                                    });
                                    parseWordDocument();
                                }}
                                disabled={!bulkImportData.file || !bulkImportData.criteria_id || !bulkImportData.category || !!uploadProgress}
                                className="flex items-center gap-2 px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Upload size={18} />
                                Import Questions
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowBulkImport(false);
                                    setBulkImportData({ criteria_id: '', category: '', difficulty: 'medium', file: null });
                                    setUploadProgress('');
                                }}
                                className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Criteria Tabs */}
            {!showForm && !showBulkImport && criteria.length > 0 && (
                <CriteriaTabs
                    criteria={criteria}
                    selectedCriteria={selectedCriteria}
                    onSelectCriteria={setSelectedCriteria}
                />
            )}

            {/* Questions List - Grouped by Set within Selected Criteria */}
            {!showForm && !showBulkImport && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-400 mx-auto"></div>
                            <p className="text-slate-400 mt-4">Loading questions...</p>
                        </div>
                    ) : selectedCriteria && groupQuestionsByCriteriaAndSet(questions)[selectedCriteria] ? (
                        groupQuestionsByCriteriaAndSet(questions)[selectedCriteria].map((set) => (
                            <SetCard
                                key={set.name}
                                set={set}
                                criteriaId={selectedCriteria}
                                onBulkUpload={handleBulkUploadForSet}
                                onAddQuestion={handleAddQuestionForSet}
                                onEditQuestion={handleEdit}
                                onDeleteQuestion={handleDelete}
                                onRenameSet={handleRenameSet}
                                onDeleteSet={handleDeleteSet}
                            />
                        ))
                    ) : (
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
                            <p className="text-slate-400 text-lg mb-4">No questions found for this criteria</p>
                            <p className="text-slate-500 text-sm mb-6">Get started by creating your first set of questions</p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setShowBulkImport(true)}
                                    className="flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all"
                                >
                                    <Upload size={20} />
                                    Bulk Upload Questions
                                </button>
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-all"
                                >
                                    <Plus size={20} />
                                    Add Single Question
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

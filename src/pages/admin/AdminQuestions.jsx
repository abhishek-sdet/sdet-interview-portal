import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2, Save, X, Upload, FileText, CheckCircle, Search, Filter, Folder, List, Tag, Layers } from 'lucide-react';
import mammoth from 'mammoth';
import { showToast } from '@/components/Toast';

export default function AdminQuestions() {
    const [questions, setQuestions] = useState([]);
    const [criteriaList, setCriteriaList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [importing, setImporting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [activeCriteriaId, setActiveCriteriaId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        criteria_id: '',
        category: '', // This is now "Set Name" (Set A, Set B)
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: '',
        is_active: true,
        section: 'general', // New: 'general' or 'elective'
        subsection: 'aptitude' // New: 'aptitude', 'java', 'python', etc.
    });

    // Bulk Import State
    const [bulkImportData, setBulkImportData] = useState({
        criteria_id: '',
        file: null
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [questionsRes, criteriaRes] = await Promise.all([
                supabase.from('questions').select('*').order('created_at', { ascending: false }),
                supabase.from('criteria').select('*').eq('is_active', true).order('name')
            ]);

            if (questionsRes.error) throw questionsRes.error;
            if (criteriaRes.error) throw criteriaRes.error;

            setQuestions(questionsRes.data || []);
            setCriteriaList(criteriaRes.data || []);

            if (criteriaRes.data?.length > 0 && !activeCriteriaId) {
                setActiveCriteriaId(criteriaRes.data[0].id);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            showToast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file && file.name.endsWith('.docx')) {
            setBulkImportData({ ...bulkImportData, file });
        } else {
            showToast.error('Please upload a valid .docx file');
        }
    };

    const parseWordDocument = async () => {
        if (!bulkImportData.file) return;

        setImporting(true);
        try {
            const arrayBuffer = await bulkImportData.file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            const text = result.value;

            // Simple parsing logic (can be enhanced based on specific format)
            console.log('Parsed text:', text);

            showToast.info('Word parsing is experimental. Please manually verify imported questions.');
            // Implementation of parsing logic would go here
            // For now, simple alert

        } catch (error) {
            console.error('Error parsing document:', error);
            showToast.error('Failed to parse document');
        } finally {
            setImporting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const dataToSave = {
                ...formData,
                // Ensure default values if empty
                category: formData.category || 'Set A',
                section: formData.section || 'general',
                subsection: formData.section === 'general' ? 'aptitude' : (formData.subsection || 'java')
            };

            if (editingId) {
                const { error } = await supabase
                    .from('questions')
                    .update(dataToSave)
                    .eq('id', editingId);
                if (error) throw error;
                showToast.success('Question updated successfully');
            } else {
                const { error } = await supabase
                    .from('questions')
                    .insert([dataToSave]);
                if (error) throw error;
                showToast.success('Question created successfully');
            }

            setShowForm(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error saving question:', error);
            showToast.error('Failed to save question');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this question?')) return;

        try {
            const { error } = await supabase
                .from('questions')
                .delete()
                .eq('id', id);
            if (error) throw error;
            showToast.success('Question deleted successfully');
            fetchData();
        } catch (error) {
            console.error('Error deleting question:', error);
            showToast.error('Failed to delete question');
        }
    };

    const handleEdit = (question) => {
        setFormData({
            criteria_id: question.criteria_id,
            category: question.category,
            question_text: question.question_text,
            option_a: question.option_a,
            option_b: question.option_b,
            option_c: question.option_c,
            option_d: question.option_d,
            correct_option: question.correct_option,
            is_active: question.is_active,
            section: question.section || 'general',
            subsection: question.subsection || 'aptitude'
        });
        setEditingId(question.id);
        setShowForm(true);
        setShowBulkImport(false);
    };

    const resetForm = () => {
        setFormData({
            criteria_id: activeCriteriaId || '',
            category: 'Set A',
            question_text: '',
            option_a: '',
            option_b: '',
            option_c: '',
            option_d: '',
            correct_option: '',
            is_active: true,
            section: 'general',
            subsection: 'aptitude'
        });
        setEditingId(null);
    };

    // Group questions by criteria -> Set Name -> Section -> Subsection
    const getGroupedQuestions = () => {
        if (!activeCriteriaId) return {};

        const filtered = questions.filter(q => q.criteria_id === activeCriteriaId);

        // Group by Set Name (category)
        const bySet = filtered.reduce((acc, q) => {
            const setName = q.category || 'Unassigned Set';
            if (!acc[setName]) acc[setName] = { general: [], elective: {} };

            const section = q.section || 'general';

            if (section === 'general') {
                acc[setName].general.push(q);
            } else {
                const sub = q.subsection || 'Unassigned';
                if (!acc[setName].elective[sub]) acc[setName].elective[sub] = [];
                acc[setName].elective[sub].push(q);
            }
            return acc;
        }, {});

        return bySet;
    };

    const groupedData = getGroupedQuestions();

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Question Management</h2>
                    <p className="text-slate-400">Create questions for <strong>Section A (General)</strong> and <strong>Section B (Elective: Java/Python/etc.)</strong></p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setShowBulkImport(!showBulkImport);
                            setShowForm(false);
                        }}
                        className="glass-button flex items-center gap-2"
                    >
                        <Upload size={18} />
                        {showBulkImport ? 'Hide Import' : 'Bulk Import'}
                    </button>
                    {!showForm && (
                        <button
                            onClick={() => {
                                setShowForm(true);
                                setShowBulkImport(false);
                                resetForm();
                            }}
                            className="glass-button-primary flex items-center gap-2"
                        >
                            <Plus size={18} />
                            Add Question
                        </button>
                    )}
                </div>
            </div>

            {/* Bulk Import Section */}
            {showBulkImport && (
                <div className="glass-panel rounded-2xl p-8 animate-fade-in-up">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-500/20 rounded-xl">
                            <FileText size={24} className="text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Bulk Import Questions</h3>
                            <p className="text-slate-400 text-sm">Upload a Word document (.docx) to import multiple questions at once.</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Upload Area */}
                        <div className="space-y-4">
                            <label className="block w-full cursor-pointer group">
                                <div className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-white/10 rounded-2xl bg-white/5 hover:bg-white/10 hover:border-cyan-400/50 transition-all">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <Upload size={32} className="text-slate-400 group-hover:text-cyan-400 transition-colors" />
                                        </div>
                                        <p className="mb-2 text-sm text-slate-300"><span className="font-semibold text-cyan-400">Click to upload</span> or drag and drop</p>
                                        <p className="text-xs text-slate-500">.docx files only</p>
                                    </div>
                                    <input type="file" className="hidden" accept=".docx" onChange={handleFileUpload} />
                                </div>
                            </label>

                            {bulkImportData.file && (
                                <div className="flex item-center justify-between p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <FileText size={20} className="text-cyan-400" />
                                        <span className="text-sm font-medium text-white">{bulkImportData.file.name}</span>
                                    </div>
                                    <button
                                        onClick={parseWordDocument}
                                        disabled={importing}
                                        className="text-sm font-bold text-cyan-400 hover:text-cyan-300"
                                    >
                                        {importing ? 'Parsing...' : 'Process File'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Instructions */}
                        <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/5">
                            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4">Formatting Guide</h4>
                            <ul className="space-y-3 text-sm text-slate-400">
                                <li className="flex gap-2">
                                    <span className="text-cyan-400 font-bold">1.</span>
                                    <span>Use <strong>Heading 1</strong> for Sets (e.g., "Set A").</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-cyan-400 font-bold">2.</span>
                                    <span>Use <strong>Heading 2</strong> for Sections (e.g., "General", "Java").</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-cyan-400 font-bold">3.</span>
                                    <span>Format questions as numbered lists (1., 2., etc.).</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-cyan-400 font-bold">4.</span>
                                    <span>Mark the correct answer in bold (e.g., <strong>a) Option</strong>).</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Single Question Form */}
            {showForm && (
                <div className="glass-panel rounded-2xl p-8 animate-fade-in-up border-l-4 border-l-cyan-500">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <div className="p-2 bg-cyan-500/20 rounded-lg">
                                {editingId ? <Edit2 size={20} className="text-cyan-400" /> : <Plus size={20} className="text-cyan-400" />}
                            </div>
                            {editingId ? 'Edit Question' : 'Create New Question'}
                        </h3>
                        <button
                            onClick={() => setShowForm(false)}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Aspirant Flow Info */}
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg mt-0.5">
                                    <CheckCircle size={18} className="text-blue-400" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-blue-300 mb-2">📋 Candidate Exam Flow</h4>
                                    <ol className="text-xs text-slate-300 space-y-1 list-decimal list-inside">
                                        <li>Candidate selects a <strong>Set</strong> (e.g., Set A)</li>
                                        <li>Exam starts with <strong className="text-cyan-400">Section A: General Questions</strong> (mandatory)</li>
                                        <li>After completing general questions, candidate chooses: <strong className="text-purple-400">"Java or Python?"</strong></li>
                                        <li>Based on choice, <strong className="text-purple-400">Section B: Elective Questions</strong> are shown</li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2 uppercase tracking-wide">
                                    Criteria <span className="text-red-400">*</span>
                                </label>
                                <select
                                    value={formData.criteria_id}
                                    onChange={(e) => setFormData({ ...formData, criteria_id: e.target.value })}
                                    className="glass-input px-4 w-full"
                                    required
                                >
                                    <option value="">Select Criteria</option>
                                    {criteriaList.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2 uppercase tracking-wide">
                                    Set Name <span className="text-red-400">*</span>
                                    <span className="ml-2 text-xs text-slate-500 normal-case">(e.g., Set A, Set B)</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="glass-input px-4 w-full"
                                    placeholder="Enter Set Name"
                                    required
                                />
                            </div>
                        </div>

                        {/* Section Selection */}
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                            <label className="block text-sm font-bold text-slate-300 mb-4 uppercase tracking-wide">
                                Question Section
                            </label>
                            <div className="flex flex-wrap gap-6">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${formData.section === 'general' ? 'border-cyan-400 bg-cyan-500/20' : 'border-slate-500 group-hover:border-slate-300'}`}>
                                        {formData.section === 'general' && <div className="w-2.5 h-2.5 rounded-full bg-cyan-400"></div>}
                                    </div>
                                    <input
                                        type="radio"
                                        name="section"
                                        value="general"
                                        checked={formData.section === 'general'}
                                        onChange={(e) => setFormData({ ...formData, section: e.target.value, subsection: 'aptitude' })}
                                        className="hidden"
                                    />
                                    <div>
                                        <span className={`block font-medium ${formData.section === 'general' ? 'text-cyan-400' : 'text-slate-400'}`}>Section A: General</span>
                                        <span className="text-xs text-slate-500">Mandatory for all candidates</span>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${formData.section === 'elective' ? 'border-purple-400 bg-purple-500/20' : 'border-slate-500 group-hover:border-slate-300'}`}>
                                        {formData.section === 'elective' && <div className="w-2.5 h-2.5 rounded-full bg-purple-400"></div>}
                                    </div>
                                    <input
                                        type="radio"
                                        name="section"
                                        value="elective"
                                        checked={formData.section === 'elective'}
                                        onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                                        className="hidden"
                                    />
                                    <div>
                                        <span className={`block font-medium ${formData.section === 'elective' ? 'text-purple-400' : 'text-slate-400'}`}>Section B: Elective</span>
                                        <span className="text-xs text-slate-500">Candidate chooses one subject</span>
                                    </div>
                                </label>
                            </div>

                            {/* Conditional Subject Dropdown for Elective */}
                            {formData.section === 'elective' && (
                                <div className="mt-4 pt-4 border-t border-white/5 animate-fade-in">
                                    <label className="block text-sm font-medium text-slate-300 mb-2 uppercase tracking-wide">
                                        Subject / Topic <span className="text-red-400">*</span>
                                    </label>
                                    <select
                                        value={formData.subsection}
                                        onChange={(e) => setFormData({ ...formData, subsection: e.target.value })}
                                        className="glass-input px-4 w-full md:w-1/2"
                                        required
                                    >
                                        <option value="">Select Subject</option>
                                        <option value="java">Java</option>
                                        <option value="python">Python</option>
                                        <option value="csharp">C#</option>
                                        <option value="javascript">JavaScript</option>
                                        <option value="testing">Manual Testing</option>
                                        <option value="automation">Automation</option>
                                        <option value="sql">SQL</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2 uppercase tracking-wide">
                                Question Text <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={formData.question_text}
                                onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                                className="glass-input px-4 min-h-[100px] w-full"
                                placeholder="Enter the question here..."
                                required
                            />
                        </div>

                        {/* Options */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {['option_a', 'option_b', 'option_c', 'option_d'].map((option, index) => (
                                <div key={option}>
                                    <label className="block text-sm font-medium text-slate-300 mb-2 uppercase tracking-wide">
                                        Option {String.fromCharCode(65 + index)} <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData[option]}
                                        onChange={(e) => setFormData({ ...formData, [option]: e.target.value })}
                                        className="glass-input px-4 w-full"
                                        placeholder={`Enter option ${String.fromCharCode(65 + index)}`}
                                        required
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Correct Answer */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2 uppercase tracking-wide">
                                Correct Answer <span className="text-red-400">*</span>
                            </label>
                            <div className="flex gap-4">
                                {['a', 'b', 'c', 'd'].map((opt) => (
                                    <label key={opt} className={`flex-1 cursor-pointer relative group`}>
                                        <input
                                            type="radio"
                                            name="correct_option"
                                            value={opt}
                                            checked={formData.correct_option === opt}
                                            onChange={(e) => setFormData({ ...formData, correct_option: e.target.value })}
                                            className="sr-only peer"
                                            required
                                        />
                                        <div className="p-3 text-center rounded-xl bg-white/5 border border-white/10 peer-checked:bg-cyan-500 peer-checked:border-cyan-400 peer-checked:text-white hover:bg-white/10 transition-all font-bold uppercase">
                                            Option {opt.toUpperCase()}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-white/10">
                            <button type="submit" className="glass-button-primary flex items-center gap-2">
                                <Save size={18} />
                                {editingId ? 'Update Question' : 'Create Question'}
                            </button>
                            <button type="button" onClick={resetForm} className="glass-button">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Questions Display */}
            {loading ? (
                <div className="p-20 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400 mx-auto"></div>
                    <p className="text-slate-400 mt-4">Loading questions...</p>
                </div>
            ) : Object.keys(groupedData).length === 0 ? (
                <div className="glass-panel rounded-2xl p-20 text-center">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FileText size={40} className="text-slate-600" />
                    </div>
                    <p className="text-white text-xl font-bold mb-2">No questions found</p>
                    <p className="text-slate-400 text-sm mb-6">Create questions or import from file to get started</p>
                    <button onClick={() => setShowForm(true)} className="glass-button-primary inline-flex items-center gap-2">
                        <Plus size={18} />
                        Add First Question
                    </button>
                </div>
            ) : (
                <div className="space-y-8">
                    <CriteriaTabs
                        criteria={criteriaList}
                        activeTab={activeCriteriaId}
                        onTabChange={setActiveCriteriaId}
                    />

                    {/* Set Cards */}
                    <div className="space-y-8">
                        {Object.entries(groupedData).map(([setName, sections]) => (
                            <div key={setName} className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                                    <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-lg shadow-cyan-500/20">
                                        <Layers size={24} className="text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white">{setName}</h3>
                                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-slate-300">
                                        {(sections.general.length || 0) + Object.values(sections.elective).reduce((a, b) => a + b.length, 0)} Questions
                                    </span>
                                </div>

                                <div className="grid lg:grid-cols-2 gap-6">
                                    {/* Section A: General */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                                                <span className="w-2 h-8 bg-cyan-500 rounded-full"></span>
                                                Section A: General
                                            </h4>
                                            <span className="text-xs text-slate-500 uppercase tracking-wide font-bold">Mandatory</span>
                                        </div>

                                        {sections.general.length > 0 ? (
                                            <div className="space-y-3">
                                                {sections.general.map((q, idx) => (
                                                    <QuestionCard
                                                        key={q.id}
                                                        question={q}
                                                        index={idx}
                                                        onEdit={handleEdit}
                                                        onDelete={handleDelete}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                                                <p className="text-slate-500 text-sm">No general questions in this set.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Section B: Elective */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-lg font-bold text-purple-400 flex items-center gap-2">
                                                <span className="w-2 h-8 bg-purple-500 rounded-full"></span>
                                                Section B: Elective
                                            </h4>
                                            <span className="text-xs text-slate-500 uppercase tracking-wide font-bold">Optional Choice</span>
                                        </div>

                                        {Object.entries(sections.elective).length > 0 ? (
                                            <div className="space-y-6">
                                                {Object.entries(sections.elective).map(([subject, questions]) => (
                                                    <div key={subject} className="bg-white/5 rounded-xl p-4 border border-white/5">
                                                        <h5 className="text-white font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                                                            <Tag size={14} className="text-purple-400" />
                                                            {subject} ({questions.length})
                                                        </h5>
                                                        <div className="space-y-3">
                                                            {questions.map((q, idx) => (
                                                                <QuestionCard
                                                                    key={q.id}
                                                                    question={q}
                                                                    index={idx}
                                                                    onEdit={handleEdit}
                                                                    onDelete={handleDelete}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                                                <p className="text-slate-500 text-sm">No elective questions in this set.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function CriteriaTabs({ criteria, activeTab, onTabChange }) {
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

function QuestionCard({ question, index, onEdit, onDelete }) {
    return (
        <div className="bg-slate-900/40 rounded-lg p-4 group hover:bg-slate-800/60 transition-colors border border-transparent hover:border-white/5">
            <div className="flex justify-between items-start gap-4">
                <div className="flex gap-3">
                    <span className="text-slate-500 font-mono text-xs pt-1">0{index + 1}</span>
                    <div>
                        <p className="text-slate-300 text-sm font-medium leading-relaxed line-clamp-2">{question.question_text}</p>
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

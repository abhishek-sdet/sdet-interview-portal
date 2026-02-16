import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2, Save, X, Upload, FileText, CheckCircle, Search, Filter, Folder, List, Tag, Layers, Check, Smartphone } from 'lucide-react';
import mammoth from 'mammoth';
import { showToast } from '@/components/Toast';
import { preprocessDocumentText, detectSections, parseQuestionsInSection } from '@/utils/questionParser';
import QuestionCard from '@/components/admin/questions/QuestionCard';
import CriteriaTabs from '@/components/admin/questions/CriteriaTabs';
import ConfirmModal from '@/components/ConfirmModal';
import DraggableQuestionList from '@/components/admin/questions/DraggableQuestionList';
import MobilePreview from '@/components/admin/questions/MobilePreview';


export default function AdminQuestions() {
    const [questions, setQuestions] = useState([]);
    const [criteriaList, setCriteriaList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [importing, setImporting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [activeCriteriaId, setActiveCriteriaId] = useState(null);

    const [activeElectiveSubject, setActiveElectiveSubject] = useState(null);
    const [mobilePreview, setMobilePreview] = useState(false);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null
    });

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
        category: 'Set A',
        file: null
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [questionsRes, criteriaRes] = await Promise.all([
                supabase.from('questions').select('*').order('order_index', { ascending: true }).order('created_at', { ascending: false }),
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
        if (file) {
            if (!file.name.endsWith('.docx')) {
                showToast.error('Please upload a valid .docx file');
                return;
            }
            // Auto-detect set name from filename (e.g., "SET A.docx" -> "Set A")
            let category = 'Set A';
            const match = file.name.match(/SET\s+([A-Z])/i);
            if (match) {
                category = `Set ${match[1].toUpperCase()}`;
            }

            setBulkImportData({ ...bulkImportData, file, category });
        }
    };

    const parseWordDocument = async () => {
        if (!bulkImportData.file) return;

        setImporting(true);
        try {
            const arrayBuffer = await bulkImportData.file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            let text = result.value;

            console.log('📄 Raw extracted text:', text.substring(0, 500));

            // Preprocess the text to ensure proper line breaks
            text = preprocessDocumentText(text);

            // Detect sections in the document
            const sections = detectSections(text);
            console.log(`📊 Detected ${sections.length} section(s):`, sections.map(s => s.name));

            if (sections.length === 0) {
                showToast.error('No sections found in document. Please check the format.');
                return;
            }

            // Parse questions from all sections
            const allQuestions = [];
            const importData = {
                criteria_id: bulkImportData.criteria_id || activeCriteriaId, // Use active tab if no specific criteria selected
                category: bulkImportData.category || 'Set A',
                difficulty: 'medium'
            };

            for (const section of sections) {
                console.log(`   🔍 Processing section: "${section.name}"`);
                const sectionQuestions = parseQuestionsInSection(section, importData);
                allQuestions.push(...sectionQuestions);
            }

            if (allQuestions.length === 0) {
                showToast.error('No valid questions found in document. Please check the format.');
                return;
            }

            console.log(`✅ Total questions parsed: ${allQuestions.length}`);

            // Check if this set already exists and delete old questions
            const setName = importData.category;
            console.log(`🔍 Checking for existing questions in set: "${setName}"`);

            const { data: existingQuestions, error: checkError } = await supabase
                .from('questions')
                .select('id')
                .eq('criteria_id', importData.criteria_id)
                .eq('category', setName);

            if (checkError) {
                console.error('❌ Error checking existing questions:', checkError);
            } else if (existingQuestions && existingQuestions.length > 0) {
                console.log(`⚠️ Found ${existingQuestions.length} existing questions in "${setName}". Deleting them...`);

                const { error: deleteError } = await supabase
                    .from('questions')
                    .delete()
                    .eq('criteria_id', importData.criteria_id)
                    .eq('category', setName);

                if (deleteError) {
                    console.error('❌ Error deleting existing questions:', deleteError);
                    showToast.error('Failed to delete existing questions. Upload cancelled.');
                    return;
                } else {
                    console.log(`✅ Deleted ${existingQuestions.length} existing questions`);
                    showToast.info(`Replacing ${existingQuestions.length} existing questions in "${setName}"`);
                }
            }

            // Import questions to database
            let successCount = 0;
            let errorCount = 0;

            for (const q of allQuestions) {
                try {
                    // Convert options array to individual fields
                    const questionData = {
                        criteria_id: q.criteria_id,
                        category: q.category, // Set Name (e.g., Set A)
                        section: q.section, // Already detected by parser: 'general' or 'elective'
                        subsection: q.subsection, // Already detected by parser: 'java', 'python', 'aptitude', or null
                        question_text: q.question_text,
                        options: q.options, // REQUIRED: Store as JSON array for schema compatibility
                        option_a: q.options[0] || '',
                        option_b: q.options[1] || '',
                        option_c: q.options[2] || '',
                        option_d: q.options[3] || '',
                        correct_option: q.correct_option || 'A',
                        correct_answer: q.options[q.correct_option ? q.correct_option.charCodeAt(0) - 65 : 0] || q.options[0] || '', // Full text of correct answer
                        is_active: q.is_active
                    };

                    const { error } = await supabase
                        .from('questions')
                        .insert([questionData]);

                    if (error) {
                        console.error('❌ Error inserting question:', JSON.stringify(error, null, 2), questionData);
                        errorCount++;
                    } else {
                        successCount++;
                    }
                } catch (err) {
                    console.error('❌ Error inserting question:', JSON.stringify(err, null, 2));
                    errorCount++;
                }
            }

            if (successCount > 0) {
                showToast.success(`Successfully imported ${successCount} questions${errorCount > 0 ? `. Failed: ${errorCount}` : ''}`);
            } else {
                showToast.error(`Failed to import questions. Errors: ${errorCount}`);
            }

            // Refresh questions list
            fetchData();

            // Reset bulk import form
            setBulkImportData({ criteria_id: '', category: '', file: null });
            setShowBulkImport(false);

        } catch (error) {
            console.error('❌ Error parsing document:', error);
            showToast.error('Failed to parse document: ' + error.message);
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
        setConfirmModal({
            isOpen: true,
            title: 'Delete Question',
            message: 'Are you sure you want to delete this question? This action cannot be undone.',
            onConfirm: async () => {
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
                } finally {
                    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
                }
            }
        });
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

    // Set default active elective subject
    useEffect(() => {
        if (!loading && activeCriteriaId) {
            const grouped = getGroupedQuestions();
            const firstSet = Object.values(grouped)[0];
            if (firstSet && Object.keys(firstSet.elective).length > 0 && !activeElectiveSubject) {
                setActiveElectiveSubject(Object.keys(firstSet.elective)[0]);
            }
        }
    }, [loading, questions, activeCriteriaId]);

    const groupedData = getGroupedQuestions();

    // Handle set rename
    const handleRenameSet = async (oldSetName) => {
        const newSetName = prompt('Enter new name for set:', oldSetName);
        if (!newSetName || newSetName.trim() === '' || newSetName === oldSetName) return;

        try {
            // Update all questions with this set name (category)
            const { error } = await supabase
                .from('questions')
                .update({ category: newSetName.trim() })
                .eq('category', oldSetName)
                .eq('criteria_id', activeCriteriaId);

            if (error) throw error;

            showToast.success(`Set renamed from "${oldSetName}" to "${newSetName}"`);
            fetchData();
        } catch (error) {
            console.error('Error renaming set:', error);
            showToast.error('Failed to rename set');
        }
    };

    // Handle set delete
    const handleDeleteSet = async (setName) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Set',
            message: `Are you sure you want to delete "${setName}"? This will permanently delete all questions in this set. This action cannot be undone.`,
            onConfirm: async () => {
                try {
                    // Delete all questions with this set name
                    const { error } = await supabase
                        .from('questions')
                        .delete()
                        .eq('category', setName)
                        .eq('criteria_id', activeCriteriaId);

                    if (error) throw error;

                    showToast.success(`Set "${setName}" and all its questions deleted successfully`);
                    fetchData();
                } catch (error) {
                    console.error('Error deleting set:', error);
                    showToast.error('Failed to delete set');
                } finally {
                    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
                }
            }
        });
    };

    // Handle Question Reorder
    const handleReorder = async (newOrder) => {
        // Optimistically update local state
        // We need to merge the new order into the full 'questions' array
        // This is tricky because 'newOrder' is a subset (e.g., just General questions)

        // Strategy: Create a map of IDs to their new index order
        // Then map over the original questions array, if ID exists in newOrder, update its position visually?
        // Actually, framer-motion controls the visual order of the subset.
        // We need to update the 'questions' state to reflect the new order to prevent "snap back".

        const newOrderIds = new Set(newOrder.map(q => q.id));

        // Keep questions NOT in the moved set as they are
        const unaffectedQuestions = questions.filter(q => !newOrderIds.has(q.id));

        // Combine them (this might mess up global sort if we are not careful)
        // Better: Update the specific objects in the master array? 
        // No, simplest is to just re-fetch after DB update, but that's slow.
        // For local state:
        // We need to verify if we are reordering General or Elective.

        // A safer standard approach for this specific UI structure:
        // 1. Calculate new order_index for items in newOrder (0 to N)
        // 2. Send updates to DB
        // 3. Refetch (easiest) or manually splice (complex)

        try {
            const updates = newOrder.map((q, index) => ({
                id: q.id,
                order_index: index
            }));

            // Prepare Supabase updates
            // Since Supabase doesn't support bulk update of different values easily without RPC, 
            // we'll loop (for N < 50 this is fine)

            await Promise.all(updates.map(u =>
                supabase.from('questions').update({ order_index: u.order_index }).eq('id', u.id)
            ));

            // Update local state by mapping through
            setQuestions(prev => {
                const updated = [...prev];
                updates.forEach(u => {
                    const idx = updated.findIndex(q => q.id === u.id);
                    if (idx !== -1) updated[idx].order_index = u.order_index;
                });
                // Re-sort locally to match new order_indices?
                // Actually, the mapped views (getGroupedQuestions) rely on filtering.
                // If we sort the master list by order_index, rendering will update.
                return updated.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            });

        } catch (error) {
            console.error('Error reordering:', error);
            showToast.error('Failed to save new order');
        }
    };

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
                        onClick={() => setMobilePreview(true)}
                        className="glass-button flex items-center gap-2 text-purple-300 border-purple-500/30 hover:bg-purple-500/10"
                    >
                        <Smartphone size={18} />
                        Mobile Preview
                    </button>
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

                            {/* Set Name Input for Bulk Import */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2 uppercase tracking-wide">
                                    Set Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={bulkImportData.category}
                                    onChange={(e) => setBulkImportData({ ...bulkImportData, category: e.target.value })}
                                    className="glass-input px-4 w-full"
                                    placeholder="e.g., Set A, Set B"
                                    required
                                />
                            </div>

                            {bulkImportData.file && (
                                <div className="flex item-center justify-between p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <FileText size={20} className="text-cyan-400" />
                                        <span className="text-sm font-medium text-white">{bulkImportData.file.name}</span>
                                    </div>
                                    <button
                                        onClick={parseWordDocument}
                                        disabled={importing || !bulkImportData.category}
                                        className="text-sm font-bold text-cyan-400 hover:text-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                            <div key={setName} className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl group">
                                <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-lg shadow-cyan-500/20">
                                            <Layers size={24} className="text-white" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white">{setName}</h3>
                                        <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-slate-300">
                                            {(sections.general.length || 0) + Object.values(sections.elective).reduce((a, b) => a + b.length, 0)} Questions
                                        </span>
                                    </div>

                                    {/* Set Actions - Show on hover */}
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleRenameSet(setName)}
                                            className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                                            title="Rename Set"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteSet(setName)}
                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Delete Set"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Vertical Stack Layout for Questions */}
                                <div className="space-y-8">
                                    {/* Section A: General */}
                                    <div className="glass-panel-inner p-6 rounded-xl border border-white/5 bg-white/5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                                                <span className="w-2 h-8 bg-cyan-500 rounded-full"></span>
                                                Section A: General Questions
                                            </h4>
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs text-slate-500 uppercase tracking-wide font-bold">Mandatory</span>
                                                <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-full">
                                                    {sections.general.length} Questions
                                                </span>
                                            </div>
                                        </div>

                                        {sections.general.length > 0 ? (
                                            <DraggableQuestionList
                                                questions={sections.general}
                                                onReorder={handleReorder}
                                                onEdit={handleEdit}
                                                onDelete={handleDelete}
                                                type="general"
                                            />
                                        ) : (
                                            <div className="p-12 text-center bg-black/20 rounded-xl border border-dashed border-white/10">
                                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <FileText size={24} className="text-slate-600" />
                                                </div>
                                                <p className="text-slate-400 font-medium">No general questions added yet</p>
                                                <p className="text-slate-500 text-sm mt-1">Start by adding questions manually or importing a file</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Section B: Elective */}
                                    <div className="glass-panel-inner p-6 rounded-xl border border-white/5 bg-white/5">
                                        <div className="flex items-center justify-between mb-6">
                                            <h4 className="text-lg font-bold text-purple-400 flex items-center gap-2">
                                                <span className="w-2 h-8 bg-purple-500 rounded-full"></span>
                                                Section B: Elective Questions
                                            </h4>
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs text-slate-500 uppercase tracking-wide font-bold">Candidate Chooses One</span>
                                                <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">
                                                    {Object.values(sections.elective).reduce((a, b) => a + b.length, 0)} Total
                                                </span>
                                            </div>
                                        </div>

                                        {Object.keys(sections.elective).length > 0 ? (
                                            <div className="space-y-6">
                                                {/* Subject Selector Tabs */}
                                                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                                    {Object.keys(sections.elective).map((subject) => (
                                                        <button
                                                            key={subject}
                                                            onClick={() => setActiveElectiveSubject(subject)}
                                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 border ${activeElectiveSubject === subject ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/20' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:border-white/10 hover:text-white'}`}
                                                        >
                                                            <Tag size={14} className={activeElectiveSubject === subject ? 'text-white' : 'text-purple-400'} />
                                                            {subject}
                                                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeElectiveSubject === subject ? 'bg-white/20 text-white' : 'bg-black/20 text-slate-500'}`}>
                                                                {sections.elective[subject].length}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Selected Subject Questions */}
                                                {activeElectiveSubject && sections.elective[activeElectiveSubject] && (
                                                    <div className="animate-fade-in bg-black/20 rounded-xl border border-white/5 overflow-hidden">
                                                        <div className="px-6 py-4 bg-gradient-to-r from-purple-500/10 to-transparent border-b border-purple-500/10 flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-1.5 bg-purple-500/20 rounded-lg">
                                                                    <List size={16} className="text-purple-400" />
                                                                </div>
                                                                <h5 className="font-bold text-purple-200 capitalize text-lg">{activeElectiveSubject} Questions</h5>
                                                            </div>
                                                        </div>
                                                        <div className="p-6 grid md:grid-cols-2 gap-4">
                                                            <DraggableQuestionList
                                                                questions={questions.filter(q =>
                                                                    q.category === setName &&
                                                                    q.section === 'elective' &&
                                                                    q.subsection === activeElectiveSubject
                                                                )}
                                                                onReorder={handleReorder}
                                                                onEdit={handleEdit}
                                                                onDelete={handleDelete}
                                                                type="elective"
                                                            />
                                                        </div>
                                                    </div>

                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-12 text-center bg-black/20 rounded-xl border border-dashed border-white/10">
                                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Tag size={24} className="text-slate-600" />
                                                </div>
                                                <p className="text-slate-400 font-medium">No elective questions added yet</p>
                                                <p className="text-slate-500 text-sm mt-1">Add general questions first, then add electives</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onClose={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
                type="danger"
            />

            {/* Mobile Preview Overlay */}
            {
                mobilePreview && (
                    <MobilePreview
                        onClose={() => setMobilePreview(false)}
                        questions={questions}
                        activeSet={Object.keys(groupedData)[0] || 'Set A'}
                        criteriaName={criteriaList.find(c => c.id === activeCriteriaId)?.name}
                    />
                )
            }
        </div >
    );
}

// Components extracted to separate files:
// - CriteriaTabs: @/components/admin/questions/CriteriaTabs.jsx
// - QuestionCard: @/components/admin/questions/QuestionCard.jsx

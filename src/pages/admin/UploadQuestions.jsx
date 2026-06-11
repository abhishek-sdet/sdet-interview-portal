import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleLayout from '@/components/admin/SimpleLayout';
import { supabase } from '@/lib/supabase';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { preprocessDocumentText, detectSections, parseQuestionsInSection } from '@/utils/questionParser';

export default function UploadQuestions() {
    const navigate = useNavigate();
    const [criteria, setCriteria] = useState([]);
    const [criteriaMode, setCriteriaMode] = useState('select'); // 'select' or 'create'
    const [selectedCriteria, setSelectedCriteria] = useState('');
    const [newCriteriaName, setNewCriteriaName] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [uploadStats, setUploadStats] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(null);

    useEffect(() => {
        checkAuth();
        fetchCriteria();
    }, []);

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

            // Auto-select first criteria
            if (data && data.length > 0) {
                setSelectedCriteria(data[0].id);
            }
        } catch (err) {
            console.error('Error fetching criteria:', err);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (!selectedFile.name.endsWith('.docx') && !selectedFile.name.endsWith('.txt') && !selectedFile.name.endsWith('.xlsx')) {
                setMessage({ type: 'error', text: 'Please select a .docx, .txt, or .xlsx file' });
                return;
            }
            setFile(selectedFile);
            setMessage({ type: '', text: '' });
        }
    };

    // Helper to read text file with correct encoding (handles UTF-16LE BOM)
    const readTextFile = async (file) => {
        const buffer = await file.arrayBuffer();
        const view = new DataView(buffer);

        // Check for UTF-16LE BOM (FF FE)
        if (view.getUint16(0, true) === 0xFEFF) {
            return new TextDecoder('utf-16le').decode(buffer);
        }
        // Check for UTF-16BE BOM (FE FF)
        if (view.getUint16(0, false) === 0xFEFF) {
            return new TextDecoder('utf-16be').decode(buffer);
        }

        // Default to UTF-8
        return new TextDecoder('utf-8').decode(buffer);
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if ((criteriaMode === 'select' && !selectedCriteria) || (criteriaMode === 'create' && !newCriteriaName.trim()) || !file) {
            setMessage({ type: 'error', text: 'Please fill all required fields' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });
        setUploadStats(null);
        setUploadProgress({ parsing: true, current: 0, total: 0 });

        try {
            let currentCriteriaId = selectedCriteria;

            // Handle new criteria creation
            if (criteriaMode === 'create') {
                const { data: newCriteria, error: criteriaError } = await supabase
                    .from('criteria')
                    .insert([{ name: newCriteriaName.trim() }])
                    .select()
                    .single();

                if (criteriaError) {
                    console.error('Error creating criteria:', criteriaError);
                    throw new Error('Failed to create new criteria. It might already exist.');
                }
                currentCriteriaId = newCriteria.id;
                
                // Update criteria list so the new one is available in the dropdown
                setCriteria(prev => [...prev, newCriteria]);
            }

            let allQuestions = [];

            if (file.name.endsWith('.xlsx')) {
                console.log('📄 Parsing Excel file...');
                const arrayBuffer = await file.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const data = XLSX.utils.sheet_to_json(worksheet);

                if (!data || data.length === 0) {
                    throw new Error('No valid questions found in Excel document');
                }

                // Map Excel rows to internal question format
                for (let i = 0; i < data.length; i++) {
                    const row = data[i];
                    if (!row.Question) continue;

                    let options = [];
                    if (row['Option A']) options.push(row['Option A'].toString().trim());
                    if (row['Option B']) options.push(row['Option B'].toString().trim());
                    if (row['Option C']) options.push(row['Option C'].toString().trim());
                    if (row['Option D']) options.push(row['Option D'].toString().trim());

                    if (options.length < 2) {
                        console.warn(`Row ${i + 2} skipped: Not enough options`);
                        continue;
                    }

                    allQuestions.push({
                        criteria_id: currentCriteriaId,
                        category: 'Common',
                        section: row.Category ? row.Category.toString().trim() : 'General',
                        subsection: row.Category ? row.Category.toString().trim() : 'aptitude',
                        question_text: row.Question.toString().trim(),
                        options: options,
                        correct_option: row.Answer ? row.Answer.toString().trim().toUpperCase() : 'A'
                    });
                }
            } else {
                console.log(`📄 Parsing ${file.name}...`);
                let text = '';

                if (file.name.endsWith('.docx')) {
                    // Extract text from Word document using mammoth
                    const arrayBuffer = await file.arrayBuffer();
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    text = result.value;
                } else if (file.name.endsWith('.txt')) {
                    // Read text file directly with encoding detection
                    text = await readTextFile(file);

                    // Fallback: If text contains null bytes (common when UTF-16 is read as UTF-8 or BOM missing), strip them
                    if (text.indexOf('\0') !== -1) {
                        console.warn('Found null bytes in text, stripping to fix encoding...');
                        text = text.replace(/\0/g, '');
                    }
                }

                if (!text || text.trim().length === 0) {
                    throw new Error('No text found in document');
                }

                console.log(`✅ Extracted ${text.length} characters`);

                // Use the shared robust parser
                // 1. Preprocess (handle newlines etc)
                text = preprocessDocumentText(text);

                // 2. Detect sections
                const sections = detectSections(text);
                console.log(`Found ${sections.length} sections`);

                const importData = {
                    criteria_id: currentCriteriaId,
                    category: 'Common',
                    difficulty: 'medium'
                };

                // 3. Parse each section
                for (const section of sections) {
                    const questions = parseQuestionsInSection(section, importData);
                    allQuestions = [...allQuestions, ...questions];
                }
            }

            if (allQuestions.length === 0) {
                throw new Error('No valid questions found in document');
            }

            console.log(`✅ Parsed ${allQuestions.length} questions`);

            // Delete existing questions with same criteria_id and category
            const { error: deleteError } = await supabase
                .from('questions')
                .delete()
                .eq('criteria_id', currentCriteriaId)
                .eq('category', 'Common');

            if (deleteError) {
                console.error('Error deleting old questions:', deleteError);
            }

            // Insert new questions in batches to speed up the process
            let successCount = 0;
            let failedCount = 0;
            
            const processedQuestions = allQuestions.map(q => {
                let dbSection = 'general';
                let dbSubsection = q.subsection || (q.section ? q.section.toLowerCase() : 'aptitude');

                const sectionLower = (q.section || '').toLowerCase();
                if (sectionLower.includes('java') || sectionLower.includes('python') || sectionLower.includes('database')) {
                    dbSection = 'elective';
                    dbSubsection = sectionLower.includes('java') ? 'java' : (sectionLower.includes('python') ? 'python' : 'database');
                } else {
                    dbSection = 'general';
                    if (sectionLower.includes('computer')) dbSubsection = 'computer_science';
                    else if (sectionLower.includes('logical')) dbSubsection = 'logical_reasoning';
                    else if (sectionLower.includes('miscellaneous')) dbSubsection = 'miscellaneous';
                    else if (sectionLower.includes('grammar')) dbSubsection = 'grammar';
                    else if (sectionLower.includes('aptitude')) dbSubsection = 'aptitude';
                }

                if (q.subsection) {
                    dbSubsection = q.subsection;
                    if (q.subsection === 'java' || q.subsection === 'python' || q.subsection === 'database') {
                        dbSection = 'elective';
                    }
                }

                return {
                    criteria_id: q.criteria_id,
                    category: q.category,
                    section: dbSection,
                    subsection: dbSubsection,
                    question_text: q.question_text,
                    options: q.options.map(opt => opt.trim()),
                    correct_option: q.correct_option || 'A',
                    correct_answer: (q.correct_option
                        ? (q.options[q.correct_option.charCodeAt(0) - 65] || q.options[0])
                        : (q.options[0] || '')).trim(),
                    difficulty: 'medium',
                    is_active: true,
                    points: 1
                };
            });

            setUploadProgress({ parsing: false, current: 0, total: processedQuestions.length });

            const CHUNK_SIZE = 50;
            for (let i = 0; i < processedQuestions.length; i += CHUNK_SIZE) {
                const chunk = processedQuestions.slice(i, i + CHUNK_SIZE);
                const { error } = await supabase.from('questions').insert(chunk);

                if (!error) {
                    successCount += chunk.length;
                } else {
                    console.error('[Upload Error] Failed to insert chunk:', error);
                    failedCount += chunk.length;
                }

                setUploadProgress({
                    parsing: false,
                    current: Math.min(i + CHUNK_SIZE, processedQuestions.length),
                    total: processedQuestions.length
                });
            }

            setMessage({
                type: 'success',
                text: 'Upload process completed successfully!'
            });

            setUploadStats({
                total: allQuestions.length,
                success: successCount,
                failed: failedCount
            });
            setUploadProgress(null);

            // Reset form
            setFile(null);
            if (criteriaMode === 'create') {
                setCriteriaMode('select');
                setSelectedCriteria(currentCriteriaId);
                setNewCriteriaName('');
            }
            if (document.getElementById('file-input')) {
                document.getElementById('file-input').value = '';
            }

        } catch (err) {
            console.error('Upload error:', err);
            setMessage({ type: 'error', text: err.message || 'Failed to upload questions' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SimpleLayout>
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Upload Questions</h1>
                    <p className="text-slate-500 text-sm mt-1">Import questions from a Word or Text document</p>
                </div>

                {/* Message */}
                {message.text && !uploadStats && (
                    <div className={`p-4 rounded-lg flex items-start gap-3 ${message.type === 'success'
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-red-500/10 border border-red-500/20'
                        }`}>
                        {message.type === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        )}
                        <p className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                            {message.text}
                        </p>
                    </div>
                )}

                {/* Upload Stats Card */}
                {uploadStats && !uploadProgress && (
                    <div className="bg-gradient-to-br from-[#0b101b] to-[#131b2c] border border-brand-blue/20 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                            <div className="w-10 h-10 rounded-full bg-brand-blue/20 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-brand-blue" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Upload Complete</h3>
                                <p className="text-sm text-slate-400">Here are your upload statistics</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                                <div className="text-3xl font-black text-brand-blue mb-1">{uploadStats.total}</div>
                                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Parsed</div>
                            </div>
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                                <div className="text-3xl font-black text-green-400 mb-1">{uploadStats.success}</div>
                                <div className="text-xs font-medium text-green-400/80 uppercase tracking-wider">Saved</div>
                            </div>
                            <div className={`border rounded-xl p-4 flex flex-col items-center justify-center text-center ${uploadStats.failed > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/5'}`}>
                                <div className={`text-3xl font-black mb-1 ${uploadStats.failed > 0 ? 'text-red-400' : 'text-slate-400'}`}>{uploadStats.failed}</div>
                                <div className={`text-xs font-medium uppercase tracking-wider ${uploadStats.failed > 0 ? 'text-red-400/80' : 'text-slate-500'}`}>Failed</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upload Progress Bar */}
                {uploadProgress && (
                    <div className="bg-[#0b101b]/60 backdrop-blur border border-brand-blue/30 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex flex-col space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-semibold text-white">
                                    {uploadProgress.parsing ? 'Parsing Document...' : 'Saving to Database...'}
                                </span>
                                {!uploadProgress.parsing && uploadProgress.total > 0 && (
                                    <span className="text-brand-blue font-medium">
                                        {uploadProgress.current} / {uploadProgress.total}
                                    </span>
                                )}
                            </div>
                            
                            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-white/5 relative">
                                {uploadProgress.parsing ? (
                                    <div className="h-full bg-brand-blue rounded-full w-full animate-pulse"></div>
                                ) : (
                                    <div 
                                        className="h-full bg-brand-blue rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                                        style={{ width: `${Math.max(5, (uploadProgress.current / uploadProgress.total) * 100)}%` }}
                                    ></div>
                                )}
                            </div>
                            
                            {!uploadProgress.parsing && (
                                <p className="text-xs text-slate-400 text-center animate-pulse">
                                    Please do not close this window
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Upload Form */}
                <form onSubmit={handleUpload} className="bg-[#0b101b]/60 backdrop-blur border border-white/[0.08] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
                    {/* Criteria Selection Redesign */}
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-slate-300">
                            Interview Criteria
                        </label>
                        
                        {/* Mode Toggle */}
                        <div className="flex p-1 bg-white/5 border border-white/10 rounded-lg w-full">
                            <button
                                type="button"
                                onClick={() => setCriteriaMode('select')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                                    criteriaMode === 'select' 
                                    ? 'bg-brand-blue text-white shadow-lg' 
                                    : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Select Existing
                            </button>
                            <button
                                type="button"
                                onClick={() => setCriteriaMode('create')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                                    criteriaMode === 'create' 
                                    ? 'bg-brand-blue text-white shadow-lg' 
                                    : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Create New
                            </button>
                        </div>

                        {criteriaMode === 'select' ? (
                            <div className="animate-in fade-in slide-in-from-top-1">
                                <select
                                    value={selectedCriteria}
                                    onChange={(e) => setSelectedCriteria(e.target.value)}
                                    required={criteriaMode === 'select'}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                                >
                                    <option value="" disabled className="bg-[#0b101b]">Choose Criteria...</option>
                                    {criteria.map(c => (
                                        <option key={c.id} value={c.id} className="bg-[#0b101b]">
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-top-1">
                                <input
                                    type="text"
                                    value={newCriteriaName}
                                    onChange={(e) => setNewCriteriaName(e.target.value)}
                                    placeholder="Enter new criteria name (e.g., Campus Drive 2024)"
                                    required={criteriaMode === 'create'}
                                    autoFocus
                                    className="w-full px-4 py-3 bg-white/5 border border-brand-blue/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all shadow-inner shadow-brand-blue/5"
                                />
                            </div>
                        )}
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Select Document (.docx, .txt, or .xlsx)
                        </label>
                        <div className="relative">
                            <input
                                id="file-input"
                                type="file"
                                accept=".docx,.txt,.xlsx"
                                onChange={handleFileChange}
                                required
                                className="hidden"
                            />
                            <label
                                htmlFor="file-input"
                                className="flex items-center justify-center gap-3 w-full px-4 py-8 bg-white/5 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:border-brand-blue/50 hover:bg-white/10 transition-all"
                            >
                                {file ? (
                                    <>
                                        <FileText className="w-6 h-6 text-green-400" />
                                        <span className="text-white font-medium">{file.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-6 h-6 text-slate-400" />
                                        <span className="text-slate-400">Click to select Word (.docx), Text (.txt), or Excel (.xlsx) file</span>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-brand-blue hover:bg-blue-500 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-blue/25 hover:shadow-brand-blue/40 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {uploadProgress?.parsing ? 'Parsing Document...' : 'Uploading...'}
                            </>
                        ) : (
                            <>
                                <Upload size={20} />
                                Upload Questions
                            </>
                        )}
                    </button>
                </form>

                {/* Instructions */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
                    <h3 className="font-bold text-white mb-3 flex items-center gap-2 text-sm">
                        <FileText size={16} className="text-blue-400" />
                        Document Format Guidelines (.docx, .txt, or .xlsx)
                    </h3>
                    <ul className="text-sm text-slate-400 space-y-1.5">
                        <li className="font-semibold text-white">For Word (.docx) and Text (.txt) Files:</li>
                        <li>• Questions should be numbered (1. 2. 3. or 1) 2) 3))</li>
                        <li>Ensure options are clearly marked with A), B), C), D)</li>
                        <li>Ensure the correct answer is marked with "Answer: "</li>
                        <br/>
                        <li className="font-semibold text-white">For Excel (.xlsx) Files:</li>
                        <li>Use the following columns: Category, Question, Option A, Option B, Option C, Option D, Answer</li>
                        <li>Category represents the section (e.g. "Testing Fundamentals", "Java", etc.)</li>
                        <li>Answer should be the option letter (A, B, C, or D)</li>
                    </ul>
                </div>
            </div>
        </SimpleLayout>
    );
}


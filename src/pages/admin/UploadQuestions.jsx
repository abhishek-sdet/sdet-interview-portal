import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleLayout from '@/components/admin/SimpleLayout';
import { supabase } from '@/lib/supabase';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import mammoth from 'mammoth';

export default function UploadQuestions() {
    const navigate = useNavigate();
    const [criteria, setCriteria] = useState([]);
    const [selectedCriteria, setSelectedCriteria] = useState('');
    const [setName, setSetName] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

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
            if (!selectedFile.name.endsWith('.docx')) {
                setMessage({ type: 'error', text: 'Please select a .docx file' });
                return;
            }
            setFile(selectedFile);
            setMessage({ type: '', text: '' });
        }
    };

    // Helper function to parse questions from text
    const parseSimpleQuestions = (text, importData) => {
        console.log('Raw text sample:', text.substring(0, 500)); // Debug log

        const questions = [];

        // Normalize text
        // Aggressively fix merged lines: "validation?A. Executing" -> "validation?\nA. Executing"
        // And "defectsB. Reviewing" -> "defects\nB. Reviewing"
        const cleanText = text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\t/g, ' ')
            .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
            // Inject newline before options A. B. C. D. if they are not at start of line
            // Look for: any char, followed by A-D, followed by dot/paren, followed by space
            .replace(/([^\n])([A-D][\.\)]\s+)/g, '$1\n$2')
            // Also handle if there is no space after dot (rare but possible in bad formatting)
            .replace(/([^\n])([A-D][\.\)][A-Z])/g, '$1\n$2')
            // Inject newline before Answer/Ans/Correct key if not at start of line
            .replace(/([^\n])((?:Answer|Ans|Correct)\s*[:\-])/gi, '$1\n$2');

        // Split into lines for line-by-line analysis (fallback method)
        const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l);

        // Detect sections
        let currentSection = 'general';
        let currentSubsection = null;

        let currentQuestion = null;

        // Regex patterns
        const sectionRegex = /^(General|Java|Python|Elective|Section|Part)/i;
        const questionStartRegex = /^(\d+|Q\d+)[\.)\s]\s*(.+)/i;
        const optionRegex = /^([A-D])[\.)\)]\s*(.+)/i;
        const answerRegex = /^(Answer|Ans|Correct)\s*[:\-]\s*([A-D])/i;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // 1. Check for Section Headers
            // Logic: Must start with "Section" or "Part" OR be a very short header (e.g. "Java", "Python Questions")
            const isExplicitSection = /^(Section|Part)\s+[\w\d]/i.test(line);
            const isShortHeader = line.length < 40 && /^(General|Java|Python|Elective)/i.test(line);

            if ((isExplicitSection || isShortHeader) && line.length < 150) {
                // If it contains "Java" -> Java section
                if (/java/i.test(line)) {
                    currentSection = 'elective';
                    currentSubsection = 'java';
                } else if (/python/i.test(line)) {
                    currentSection = 'elective';
                    currentSubsection = 'python';
                } else {
                    // Default to General unless it explicitly says Elective without Java/Python
                    if (/elective/i.test(line) && !/java|python/i.test(line)) {
                        currentSection = 'elective';
                        currentSubsection = null; // Mixed or unknown
                    } else {
                        // If it's just "Section A", assume general unless we know otherwise
                        // But if we are already in Java/Python, maybe don't switch back to general on vague header?
                        // For now heavily bias towards general if nothing else
                        currentSection = 'general';
                        currentSubsection = null;
                    }
                }
                continue;
            }

            // 2. Check for New Question Start
            const qMatch = line.match(questionStartRegex);
            if (qMatch) {
                // Save previous question if valid
                if (currentQuestion && currentQuestion.options.some(o => o)) {
                    // Ensure 4 options
                    while (currentQuestion.options.length < 4) currentQuestion.options.push('');
                    questions.push(currentQuestion);
                }

                currentQuestion = {
                    ...importData,
                    section: currentSection,
                    subsection: currentSubsection,
                    question_text: qMatch[2],
                    options: [],
                    original_options: [], // Temporary storage
                    correct_option: 'A',
                    is_active: true
                };
                continue;
            }

            // 3. Check for Options
            const optMatch = line.match(optionRegex);
            if (optMatch && currentQuestion) {
                const letter = optMatch[1].toUpperCase();
                const text = optMatch[2];

                // Map letter to index
                const map = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                if (map[letter] !== undefined) {
                    currentQuestion.options[map[letter]] = text.replace(/\*/g, '').trim();

                    // Check for inline asterisk
                    if (text.includes('*')) {
                        currentQuestion.correct_option = letter;
                    }
                }
                continue;
            }

            // 4. Check for Answer Key
            const ansMatch = line.match(answerRegex);
            if (ansMatch && currentQuestion) {
                currentQuestion.correct_option = ansMatch[2].toUpperCase();
                continue;
            }

            // 5. Append continuation text to question or last option
            // (If the line doesn't match anything else)
            if (currentQuestion) {
                // If we haven't started options yet, append to question text
                if (currentQuestion.options.length === 0 && !currentQuestion.options[0]) {
                    currentQuestion.question_text += ' ' + line;
                }
                // Else append to the last found option (a bit risky but handles multi-line options)
                /* 
                 * Logic: We can't easily know which option this belongs to without state.
                 * For safety, we'll skip appending to options to avoid messy data, 
                 * unless we are sure. Let's ignore continuation lines for options for now to be safe.
                 */
            }
        }

        // Add the last question
        if (currentQuestion && currentQuestion.options.some(o => o)) {
            while (currentQuestion.options.length < 4) currentQuestion.options.push('');
            questions.push(currentQuestion);
        }

        console.log(`Parsed ${questions.length} questions`);

        if (questions.length === 0) {
            // Fallback: Try the block-based parser if line-based failed (e.g., widely different format)
            // Or just log detailed info to help debug
            console.warn('Line-based parser found 0 questions. Text sample:', lines.slice(0, 10));
        }

        return questions;
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!selectedCriteria || !setName || !file) {
            setMessage({ type: 'error', text: 'Please fill all fields' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            console.log('📄 Parsing Word document...');

            // Extract text from Word document using mammoth
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            const text = result.value;

            if (!text || text.trim().length === 0) {
                throw new Error('No text found in document');
            }

            console.log(`✅ Extracted ${text.length} characters`);

            // Simple parsing: split by lines and parse questions
            const importData = {
                criteria_id: selectedCriteria,
                category: setName.trim(),
                difficulty: 'medium'
            };

            // Parse questions from the text
            const allQuestions = parseSimpleQuestions(text, importData);

            if (allQuestions.length === 0) {
                throw new Error('No valid questions found in document');
            }

            console.log(`✅ Parsed ${allQuestions.length} questions`);

            // Delete existing questions with same criteria_id and category
            const { error: deleteError } = await supabase
                .from('questions')
                .delete()
                .eq('criteria_id', selectedCriteria)
                .eq('category', setName.trim());

            if (deleteError) {
                console.error('Error deleting old questions:', deleteError);
            }

            // Insert new questions
            let successCount = 0;
            for (const q of allQuestions) {
                const questionData = {
                    criteria_id: q.criteria_id,
                    category: q.category,
                    section: q.section,
                    subsection: q.subsection,
                    question_text: q.question_text,
                    options: q.options,
                    option_a: q.options[0] || '',
                    option_b: q.options[1] || '',
                    option_c: q.options[2] || '',
                    option_d: q.options[3] || '',
                    correct_option: q.correct_option || 'A',
                    correct_answer: q.options[q.correct_option ? q.correct_option.charCodeAt(0) - 65 : 0] || q.options[0] || '',
                    is_active: q.is_active
                };

                const { error } = await supabase
                    .from('questions')
                    .insert([questionData]);

                if (!error) successCount++;
            }

            setMessage({
                type: 'success',
                text: `Successfully uploaded ${successCount} questions for "${setName}"`
            });

            // Reset form
            setSetName('');
            setFile(null);
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

    // Helper function to parse questions from a section
    const parseQuestionsInSection = (section, importData) => {
        const questions = [];
        const lines = section.text.split('\n').filter(line => line.trim());

        let currentQuestion = null;
        let optionIndex = 0;

        for (let line of lines) {
            line = line.trim();

            // Question pattern: starts with number followed by dot or parenthesis
            if (/^\d+[\.)]\s/.test(line)) {
                if (currentQuestion && currentQuestion.question_text) {
                    questions.push(currentQuestion);
                }

                currentQuestion = {
                    ...importData,
                    section: section.section,
                    subsection: section.subsection,
                    question_text: line.replace(/^\d+[\.)]\s*/, '').trim(),
                    options: [],
                    correct_option: 'A',
                    is_active: true
                };
                optionIndex = 0;
            }
            // Option pattern: A) B) C) D) or a) b) c) d)
            else if (/^[A-Da-d][\)\.]\s/.test(line) && currentQuestion) {
                const optionText = line.replace(/^[A-Da-d][\)\.]\s*/, '').trim();
                currentQuestion.options.push(optionText);

                // Check if this is marked as correct (contains *)
                if (line.includes('*') || optionText.includes('*')) {
                    currentQuestion.correct_option = String.fromCharCode(65 + optionIndex);
                    currentQuestion.options[optionIndex] = optionText.replace(/\*/g, '').trim();
                }
                optionIndex++;
            }
            // Answer pattern: "Answer: A" or "Ans: A"
            else if (/^(Answer|Ans):/i.test(line) && currentQuestion) {
                const match = line.match(/[A-D]/i);
                if (match) {
                    currentQuestion.correct_option = match[0].toUpperCase();
                }
            }
        }

        // Add last question
        if (currentQuestion && currentQuestion.question_text && currentQuestion.options.length >= 2) {
            questions.push(currentQuestion);
        }

        return questions;
    };

    return (
        <SimpleLayout>
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Upload Questions</h1>
                    <p className="text-slate-400">Import questions from a Word document</p>
                </div>

                {/* Message */}
                {message.text && (
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

                {/* Upload Form */}
                <form onSubmit={handleUpload} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 space-y-6">
                    {/* Criteria Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Select Criteria
                        </label>
                        <select
                            value={selectedCriteria}
                            onChange={(e) => setSelectedCriteria(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                        >
                            {criteria.map(c => (
                                <option key={c.id} value={c.id} className="bg-[#0b101b]">
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Set Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Set Name
                        </label>
                        <input
                            type="text"
                            value={setName}
                            onChange={(e) => setSetName(e.target.value)}
                            placeholder="e.g., Set A, Set B"
                            required
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                        />
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Word Document (.docx)
                        </label>
                        <div className="relative">
                            <input
                                id="file-input"
                                type="file"
                                accept=".docx"
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
                                        <span className="text-slate-400">Click to select Word document</span>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-brand-blue hover:bg-blue-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-blue/20"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Uploading...
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
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                    <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                        <FileText size={18} className="text-blue-400" />
                        Document Format Guidelines
                    </h3>
                    <ul className="text-sm text-slate-300 space-y-2">
                        <li>• Questions should be numbered (1. 2. 3. or 1) 2) 3))</li>
                        <li>• Options should be labeled (A) B) C) D) or a) b) c) d))</li>
                        <li>• Mark correct answer with * or add "Answer: A" line</li>
                        <li>• Use headings to separate sections (General, Java, Python, etc.)</li>
                    </ul>
                </div>
            </div>
        </SimpleLayout>
    );
}

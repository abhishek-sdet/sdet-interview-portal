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
            if (!selectedFile.name.endsWith('.docx') && !selectedFile.name.endsWith('.txt')) {
                setMessage({ type: 'error', text: 'Please select a .docx or .txt file' });
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
        const cleanText = text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\t/g, ' ')
            .replace(/\u00A0/g, ' '); // Replace non-breaking spaces

        // Split into lines for line-by-line analysis
        const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l);

        // Detect sections
        let currentSection = 'general';
        let currentSubsection = null;

        let currentQuestion = null;

        // Regex patterns
        // Section: [Computer Science], Section A, 🔹 MISCELLANEOUS LOGIC
        const sectionRegex = /^\[(.+)\]$|^(Section|Part|🔹)\s+[\w\d\s]|^[A-Z\s]+LOGIC/i;

        // Question: #1. or Q1. or 1.
        // IMPROVED: Split into two to avoid matching code like "1 + 2" as "1."
        // 1. Prefix format: #1, Q1, Q 1 (allows space separator)
        const questionPrefixRegex = /^(?:#|Q)\s*(\d+)[\.)\s]?\s*(.+)?/i;
        // 2. No prefix format: 1. or 1) (MUST have DOT or PAREN, no space allowed as separator)
        const questionNoPrefixRegex = /^(\d+)[\.)]\s*(.+)?/i;

        // Option: A. or A)
        const optionRegex = /^([A-D])[\.)\)]\s*(.+)/i;

        // Answer: ✅ Answer: A or Answer: A or Ans: A
        const answerRegex = /^(?:✅\s*)?(?:Answer|Ans|Correct)\s*[:\-]\s*([A-D])/i;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // 1. Check for Section Headers
            // Logic: Strict matches for known headers to avoid false positives in text
            if (sectionRegex.test(line) || line.includes('MISCELLANEOUS')) {
                const rawName = line.replace(/[\[\]🔹]/g, '').trim().toLowerCase();

                // Exclude if it looks like a question or option
                if (/^Answer|^Question|^\d/.test(rawName)) continue;

                if (rawName.includes('java')) {
                    currentSection = 'elective';
                    currentSubsection = 'java';
                } else if (rawName.includes('python')) {
                    currentSection = 'elective';
                    currentSubsection = 'python';
                } else if (rawName.includes('computer science')) {
                    currentSection = 'Computer Science';
                    currentSubsection = null;
                } else if (rawName.includes('logical reasoning')) {
                    currentSection = 'Logical Reasoning';
                    currentSubsection = null;
                } else if (rawName.includes('miscellaneous')) {
                    currentSection = 'Miscellaneous Logic';
                    currentSubsection = null;
                } else if (rawName.includes('grammar')) {
                    currentSection = 'Grammar';
                    currentSubsection = null;
                }
                // Don't continue here blindly, just in case it wasn't a section. 
                // But if we matched specific keywords, we updated the state.
                if (rawName.includes('java') || rawName.includes('python') ||
                    rawName.includes('computer') || rawName.includes('logical') ||
                    rawName.includes('miscellaneous') || rawName.includes('grammar')) {
                    continue;
                }
            }

            // 2. Check for Answer Key matches First (to avoid confusing with options if formatted weirdly)
            const ansMatch = line.match(answerRegex);
            if (ansMatch && currentQuestion) {
                currentQuestion.correct_option = ansMatch[1].toUpperCase();
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

            // 4. Check for New Question Start
            let qMatch = line.match(questionPrefixRegex) || line.match(questionNoPrefixRegex);

            // Extra safety: Ensure this isn't inside a code block context if possible, 
            // but the stricter regex should handle "1 + 2" or "10 / 0" correctly now.

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
                    question_text: qMatch[2] || '', // Capture text if on same line
                    options: [],
                    original_options: [], // Temporary storage
                    correct_option: 'A',
                    is_active: true
                };
                continue;
            }

            // 5. Append continuation text to question
            // (If the line doesn't match anything else)
            if (currentQuestion) {
                // If we haven't started options yet, append to question text
                if (currentQuestion.options.length === 0 && !currentQuestion.options[0]) {
                    if (currentQuestion.question_text) {
                        currentQuestion.question_text += '\n' + line; // Use newline for better code formatting
                    } else {
                        currentQuestion.question_text = line;
                    }
                }
                // Else ignore (or append to last option if we wanted multi-line options)
            }
        }

        // Add the last question
        if (currentQuestion && currentQuestion.options.some(o => o)) {
            while (currentQuestion.options.length < 4) currentQuestion.options.push('');
            questions.push(currentQuestion);
        }

        console.log(`Parsed ${questions.length} questions`);

        if (questions.length === 0) {
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
            console.log(`📄 Parsing ${file.name}...`);
            let text = '';

            if (file.name.endsWith('.docx')) {
                // Extract text from Word document using mammoth
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                text = result.value;
            } else if (file.name.endsWith('.txt')) {
                // Read text file directly
                text = await file.text();
            }

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
                    <p className="text-slate-400">Import questions from a Word or Text document</p>
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
                            Select Document (.docx or .txt)
                        </label>
                        <div className="relative">
                            <input
                                id="file-input"
                                type="file"
                                accept=".docx,.txt"
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
                                        <span className="text-slate-400">Click to select Word (.docx) or Text (.txt) file</span>
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
                        Document Format Guidelines (.docx or .txt)
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

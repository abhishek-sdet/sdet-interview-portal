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
        console.log('Starting parse of text length:', text.length);

        const questions = [];

        // Normalize text
        const cleanText = text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\t/g, ' ')
            .replace(/\u00A0/g, ' '); // Replace non-breaking spaces

        // Split into lines for line-by-line analysis
        const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l);

        // Default state
        let currentSection = 'general';
        let currentSubsection = null;
        let currentQuestion = null;

        // Regex patterns
        // Section: [Computer Science], Section A, 🔹 MISCELLANEOUS LOGIC, [Java programming...]
        // We capture the content inside [] or after cues
        const sectionRegex = /^\[(.+)\]$|^(?:Section|Part|🔹)\s+(.+)|^([A-Z\s]+LOGIC)$/i;

        // Question: #1. or Q1. or 1.
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
            const sectionMatch = line.match(sectionRegex);
            if (sectionMatch) {
                // Extract the meaningful name from the match groups
                const rawName = (sectionMatch[1] || sectionMatch[2] || sectionMatch[3]).trim();
                const lowerName = rawName.toLowerCase();

                // Safety: Exclude if it looks like a question or option or answer
                if (/^Answer|^Ans|^Question|^\d/.test(rawName)) {
                    // Do nothing, treat as text
                } else {
                    console.log(`[Parser] Found Section: "${rawName}"`);

                    if (lowerName.includes('java')) {
                        currentSection = 'elective';
                        currentSubsection = 'java';
                    } else if (lowerName.includes('python')) {
                        currentSection = 'elective';
                        currentSubsection = 'python';
                    } else if (lowerName.includes('computer')) {
                        currentSection = 'Computer Science';
                        currentSubsection = null;
                    } else if (lowerName.includes('logical')) {
                        currentSection = 'Logical Reasoning';
                        currentSubsection = null;
                    } else if (lowerName.includes('miscellaneous')) {
                        currentSection = 'Miscellaneous Logic';
                        currentSubsection = null;
                    } else if (lowerName.includes('grammar')) {
                        currentSection = 'Grammar';
                        currentSubsection = null;
                    } else {
                        // Default fallback for other headers
                        currentSection = rawName;
                        currentSubsection = null;
                    }
                    continue; // Skip this line
                }
            }

            // 2. Check for Answer Key matches (Priority over options)
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

            if (qMatch) {
                // Save previous question if valid
                if (currentQuestion) {
                    // Fix: Be more lenient. If it has text, accept it. 
                    // Fill missing options with empty strings.
                    while (currentQuestion.options.length < 4) currentQuestion.options.push('');

                    // Only push if we have at least ONE option or it looks like a question
                    if (currentQuestion.options.some(o => o) || currentQuestion.question_text) {
                        questions.push(currentQuestion);
                    } else {
                        console.warn('[Parser] Dropping empty question:', currentQuestion);
                    }
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
            if (currentQuestion) {
                // If we haven't started options yet, append to question text
                if (currentQuestion.options.length === 0 && !currentQuestion.options[0]) {
                    if (currentQuestion.question_text) {
                        currentQuestion.question_text += '\n' + line;
                    } else {
                        currentQuestion.question_text = line;
                    }
                }
                // If we ARE in options, but this line didn't match an option regex,
                // it might be a multiline option. Append to the LAST option.
                else {
                    // Find the last filled option index
                    let lastIdx = -1;
                    for (let k = 3; k >= 0; k--) {
                        if (currentQuestion.options[k]) {
                            lastIdx = k;
                            break;
                        }
                    }
                    if (lastIdx !== -1) {
                        currentQuestion.options[lastIdx] += ' ' + line;
                    }
                }
            }
        }

        // Add the last question
        if (currentQuestion) {
            while (currentQuestion.options.length < 4) currentQuestion.options.push('');
            if (currentQuestion.options.some(o => o) || currentQuestion.question_text) {
                questions.push(currentQuestion);
            }
        }

        console.log(`[Parser] Successfully parsed ${questions.length} questions.`);
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
            // IMPORTANT: Insert one by one to isolate bad rows and log errors
            for (const q of allQuestions) {
                // Map section to allowed database values ('general' or 'elective')
                // and preserve the specific topic in subsection
                let dbSection = 'general';
                let dbSubsection = q.subsection || (q.section ? q.section.toLowerCase() : 'aptitude');

                const sectionLower = (q.section || '').toLowerCase();
                if (sectionLower.includes('java') || sectionLower.includes('python')) {
                    dbSection = 'elective';
                    dbSubsection = sectionLower.includes('java') ? 'java' : 'python';
                } else {
                    dbSection = 'general';
                    // Clean up subsection naming
                    if (sectionLower.includes('computer')) dbSubsection = 'computer_science';
                    else if (sectionLower.includes('logical')) dbSubsection = 'logical_reasoning';
                    else if (sectionLower.includes('miscellaneous')) dbSubsection = 'miscellaneous';
                    else if (sectionLower.includes('grammar')) dbSubsection = 'grammar';
                    else if (sectionLower.includes('aptitude')) dbSubsection = 'aptitude';
                }

                // If q.subsection already existed (from parser), prioritize mapped logic above but if parser was specific?
                // Actually the parser sets subsection sometimes. Let's merge logic:
                // If parser set subsection (like 'java'), trust it for elective.
                // If parser set subsection to null, map section name.

                if (q.subsection) {
                    dbSubsection = q.subsection;
                    if (q.subsection === 'java' || q.subsection === 'python') {
                        dbSection = 'elective';
                    }
                }

                const questionData = {
                    criteria_id: q.criteria_id,
                    category: q.category,
                    section: dbSection,
                    subsection: dbSubsection,
                    question_text: q.question_text,
                    options: q.options, // This is an array, Supabase JSONB should handle it
                    correct_answer: q.options[q.correct_option ? q.correct_option.charCodeAt(0) - 65 : 0] || q.options[0] || '',
                    difficulty: 'medium',
                    is_active: true,
                    points: 1
                };

                // Remove temp fields
                delete questionData.original_options;

                const { error } = await supabase
                    .from('questions')
                    .insert([questionData]);

                if (!error) {
                    successCount++;
                } else {
                    console.error('[Upload Error] Failed to insert question:', error);
                    console.error('Failed Data:', JSON.stringify(questionData, null, 2));
                }
            }

            setMessage({
                type: 'success',
                text: `Successfully uploaded ${successCount} out of ${allQuestions.length} questions for "${setName}"`
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
                                <UploadQuestionsText loading={loading} />
                            </>
                        ) : (
                            <>
                                <Upload size={20} />
                                <UploadQuestionsText loading={loading} />
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

const UploadQuestionsText = ({ loading }) => (
    <span>{loading ? 'Uploading...' : 'Upload Questions'}</span>
);

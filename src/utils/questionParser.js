/**
 * Question Parser Utility
 * 
 * Pure functions for parsing Word documents and extracting questions.
 * No React dependencies - can be used anywhere in the app.
 */

/**
 * Preprocess document text to ensure proper line breaks
 * Mammoth.js sometimes extracts text without proper line breaks
 */
export function preprocessDocumentText(text) {
    // Add newline before option letters (A., B., C., D. or a. b. c. d. or A) B) etc)
    // Case 1: Letter followed by dot/paren and space
    text = text.replace(/([^\n])\s*([A-Da-d][\.)\]])\s+/g, '$1\n$2 ');

    // Case 2: "Answer:" or "Ans:" pattern
    text = text.replace(/([^\n])\s*(Answer|Ans|Correct)\s*:/gi, '$1\n$2:');

    return text;
}

/**
 * Detect sections in the document
 * Returns array of section objects
 */
export function detectSections(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const sections = [];
    let currentSectionStart = 0;
    let currentSectionName = 'Default Section';
    let currentSectionType = 'mandatory';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detect section headers - improved patterns
        // Patterns: 
        // - "Section A: Multiple Choice Questions"
        // - "Section A – Generic Multiple Choice Questions"
        // - "Section B - Long Answer (5 x 5 = 25 Marks)"
        // - "JAVA Based Questions (Optional - Choose 3 out of 6)"
        // - "Python Based Questions"
        // - Standalone markers: "JAVA", "Python", "Java", "PYTHON"
        const sectionMatch = line.match(/^(?:Section\s+[A-Z][\s:\-–—]+|[A-Z][A-Za-z\s]+(?:Questions?|Based|MCQ|Answer)|^(?:JAVA|Python|Java|PYTHON)$)/i);

        // Additional check: line should be relatively short (section headers) and not start with a number
        const looksLikeSection = sectionMatch && line.length < 150 && !line.match(/^\d+[\.)]/)

            ;

        if (looksLikeSection) {
            console.log(`   🔍 Detected potential section header: "${line}"`);

            // Save previous section if exists
            if (currentSectionStart < i) {
                const sectionContent = lines.slice(currentSectionStart, i).join('\n');
                if (sectionContent.trim()) {
                    sections.push(createSectionObject(currentSectionName, currentSectionType, sectionContent));
                }
            }

            // Start new section
            currentSectionName = line;
            currentSectionType = line.toLowerCase().includes('optional') ? 'optional' : 'mandatory';
            currentSectionStart = i + 1;
        }
    }

    // Don't forget the last section
    if (currentSectionStart < lines.length) {
        const sectionContent = lines.slice(currentSectionStart).join('\n');
        if (sectionContent.trim()) {
            sections.push(createSectionObject(currentSectionName, currentSectionType, sectionContent));
        }
    }

    // If no sections detected, treat entire document as one section
    if (sections.length === 0) {
        console.log('   ⚠️ No sections detected, treating entire document as one section');
        sections.push(createSectionObject('Imported Questions', 'mandatory', text));
    }

    return sections;
}

/**
 * Detect if section is general or elective based on section name
 */
function detectSectionType(sectionName) {
    const lower = sectionName.toLowerCase();
    if (lower.includes('general') || lower.includes('section a') || lower.includes('mandatory')) {
        return 'general';
    }
    if (lower.includes('elective') || lower.includes('section b') || lower.includes('optional') ||
        lower.includes('java') || lower.includes('python') || lower.includes('aptitude')) {
        return 'elective';
    }
    return 'general'; // default
}

/**
 * Detect subsection (programming language or topic) from section name
 */
function detectSubsection(sectionName) {
    const lower = sectionName.toLowerCase();
    if (lower.includes('java')) return 'java';
    if (lower.includes('python')) return 'python';
    if (lower.includes('aptitude')) return 'aptitude';
    if (lower.includes('sql') || lower.includes('database')) return 'sql';
    return null; // for general sections
}

/**
 * Create section object with metadata
 */
export function createSectionObject(name, type, content) {
    const section = {
        name: name.trim(),
        type: type || 'mandatory',
        content: content,
        isOptional: type === 'optional',
        selectCount: null,
        totalCount: null
    };

    // Extract optional question counts from section name
    // Pattern: "Choose 3 out of 6", "Select 3 out of 3", etc.
    const optionalMatch = name.match(/(?:Choose|Select)\s+(\d+)\s+out\s+of\s+(\d+)/i);
    if (optionalMatch) {
        section.isOptional = true;
        section.type = 'optional';
        section.selectCount = parseInt(optionalMatch[1]);
        section.totalCount = parseInt(optionalMatch[2]);
    }

    return section;
}

/**
 * Parse questions within a section
 * Returns array of question objects
 */
export function parseQuestionsInSection(section, importData) {
    const questions = [];
    // Enhanced splitting: handle standard newlines, but also multiple spaces that might look like gaps
    const lines = section.content.split(/\n+/).map(l => l.trim()).filter(l => l);

    let currentQuestion = null;
    let currentOptions = [];
    let correctAnswer = '';
    let questionNumber = 0;
    let lastLine = ''; // Track previous line for retroactive detection

    // Helper to extract options from a text line that might have them inline
    // e.g. "What is X? A. Y B. Z" -> returns { text: "What is X?", options: ["Y", "Z"] }
    const extractInlineOptions = (text) => {
        // Simple heuristic: look for option markers like "A.", "a)", or "(A)"
        // Improved: Allow markers to be preceded by space OR punctuation (like ?) OR start of line
        // This handles "What?A. Option"
        const firstOptionMatch = text.match(/(?:[\s\t]+|(?<=[?!.)\s]|^))([A-Da-d])[\.)\]]/);
        // Note: JS lookbehind support varies, but in Node 20 it works. 
        // Safer: match delimiters in group 1

        // Safer Regex: Match (Delimiter)(Marker)
        // Delimiter: Space, Tab, ?, !, ., ), or Start of String
        // But we must be careful with Start of String.
        // Let's use a simpler approach: Splitting by markers.

        // Regex to find markers: 
        // Must be preceded by boundary-like char
        const markerRegex = /(?:^|[\s\t?!.)])([A-Da-d])[\.)\]]/g;

        // Find all matches
        const matches = [...text.matchAll(markerRegex)];

        if (matches.length === 0) return { qText: text, foundOptions: [], foundAnswer: '' };

        // The first match is the first option.
        // However, we must ensure it's not part of a word (e.g. "U.S.A.").
        // The preceding char check helps.

        const firstMatch = matches[0];
        // text before match is Question
        // But firstMatch[0] includes the delimiter!
        // If delimiter is punctuation '?', it belongs to Question.
        // If delimiter is space, it belongs to neither (or question).

        // Correct splitting point:
        const splitIndex = firstMatch.index + firstMatch[0].length - 2; // -2 to keep letter and dot/paren in option part?
        // match[0] is " A." (length 3) or "?A." (length 3).
        // Marker is "A." (length 2).
        // Delimiter is length 1.
        // So split at index + 1.

        // Let's refine capturing.
        // Regex: /([?!.)\s]|^)([A-Da-d][\.)\]])/
        const preciseMatch = text.match(/([?!.)\s]|^)([A-Da-d][\.)\]])/);

        if (!preciseMatch) return { qText: text, foundOptions: [], foundAnswer: '' };

        const delimiter = preciseMatch[1];
        const marker = preciseMatch[2];
        const matchIndex = preciseMatch.index;

        // Question text includes the delimiter
        // qText = text.substring(0, matchIndex + delimiter.length);
        const qText = text.substring(0, matchIndex + delimiter.length).trim();

        // Remaining text starts at marker
        const remaining = text.substring(matchIndex + delimiter.length);

        // Now parse remaining for other options
        const foundOptions = [];
        let foundAnswer = '';

        // Split remaining by markers
        // We know remaining starts with "A." (or similar)
        // Split by subsequent markers

        // Regex for subsequent markers: must be preceded by space or punctuation
        // e.g. "Option A text B. Option B"
        // Split by /[\s\t]+[A-Da-d][\.)\]]/ ? 
        // User text might be "Option?B. Option".

        // Let's iterate using regex
        const contentRegex = /([?!.)\s]|^)([A-Da-d][\.)\]])/g;
        // This is getting complex.

        // Simpler fallback: Split by " A. ", " B. " etc if possible, else rely on smart regex
        // Let's proceed with finding next markers based on typical patterns

        // Current implementation of extractInlineOptions (previous step) used split.
        // Let's update it to respect delimiters.

        // Re-implement using split with lookahead-like logic
        const parts = remaining.split(/(?=(?:[\s\t]+|[?!.)])[A-Da-d][\.)\]])/);
        // This splits BEFORE the delimiter.
        // "A. Opt?B. Opt" -> "A. Opt", "?B. Opt"
        // But loop below expects "B. Opt".
        // We need to clean up part.

        if (parts.length > 0) {
            // First part is "A. Option..."
            // Subsequent parts might start with delimiter.
            parts.forEach((p, idx) => {
                let cleanP = p;
                // If not first part, it might start with delimiter
                if (idx > 0) {
                    const delimMatch = cleanP.match(/^([?!.)\s]+)/);
                    if (delimMatch) {
                        cleanP = cleanP.substring(delimMatch[0].length);
                    }
                }

                cleanP = cleanP.trim();
                if (!cleanP) return;

                const markerMatch = cleanP.match(/^([A-Da-d])[\.)\]]/);
                if (markerMatch) {
                    // Check for Answer at end
                    let content = cleanP.substring(markerMatch[0].length).trim();
                    const ansMatch = content.match(/(?:Correct|Answer|Ans)[\s:]+([A-Da-d])/i);
                    if (ansMatch) {
                        foundAnswer = ansMatch[1].toUpperCase();
                        content = content.replace(ansMatch[0], '').trim();
                    }
                    foundOptions.push(content);
                }
            });
        }

        return { qText, foundOptions, foundAnswer };
    };

    // Helper to save current question
    const saveCurrentQuestion = () => {
        // If we have a question text but no options, try to extract inline options now
        if (currentQuestion && currentOptions.length === 0) {
            const { qText, foundOptions, foundAnswer } = extractInlineOptions(currentQuestion);
            if (foundOptions.length > 0) {
                currentQuestion = qText;
                currentOptions = foundOptions;
                if (foundAnswer) {
                    const idx = foundAnswer.charCodeAt(0) - 65;
                    if (currentOptions[idx]) correctAnswer = currentOptions[idx];
                }
            }
        }

        if (currentQuestion && currentOptions.length >= 2) {
            questionNumber++;

            // Detect section and subsection from section header
            let detectedSection = detectSectionType(section.name);
            let detectedSubsection = detectSubsection(section.name);

            // ALWAYS analyze question content for language-specific keywords
            // This overrides section header detection if keywords are found
            const questionLower = currentQuestion.toLowerCase();

            // Check for Java-specific keywords
            if (questionLower.includes('java') || questionLower.includes('jvm') ||
                questionLower.includes('spring') || questionLower.includes('hibernate') ||
                questionLower.includes('servlet') || questionLower.includes('jsp')) {
                detectedSection = 'elective';
                detectedSubsection = 'java';
                console.log(`      🔵 JAVA detected in Q${questionNumber + 1}`);
            }
            // Check for Python-specific keywords
            else if (questionLower.includes('python') || questionLower.includes('django') ||
                questionLower.includes('flask') || questionLower.includes('pandas') ||
                questionLower.includes('numpy') || questionLower.includes('pip')) {
                detectedSection = 'elective';
                detectedSubsection = 'python';
                console.log(`      🟡 PYTHON detected in Q${questionNumber + 1}`);
            }

            questions.push({
                criteria_id: importData.criteria_id,
                category: importData.category || 'Set A',
                section: detectedSection,
                subsection: detectedSubsection,
                question_text: currentQuestion,
                options: currentOptions,
                correct_option: correctAnswer ? String.fromCharCode(65 + currentOptions.indexOf(correctAnswer)) : '',
                difficulty: importData.difficulty,
                is_active: true
            });
            const answerStatus = correctAnswer ? '✓' : '⚠ (No answer)';
            console.log(`      ${answerStatus} Q${questionNumber}: ${currentQuestion.substring(0, 50)}... [${detectedSection}/${detectedSubsection || 'none'}]`);
        } else if (currentQuestion && currentOptions.length > 0) {
            console.log(`      ✗ Skipped incomplete question: ${currentQuestion.substring(0, 40)}... (only ${currentOptions.length} options)`);
        }

        // Reset
        currentQuestion = null;
        currentOptions = [];
        correctAnswer = '';
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        // Skip instructions/marks (only if not inside options/question flow)
        if (currentOptions.length === 0 && !currentQuestion) {
            if (line.match(/^(?:Choose|Select|Answer|Attempt|Section|Note)/i) && line.length < 100 && !line.includes('?')) {
                lastLine = line;
                continue;
            }
            if (line.match(/\d+\s*x\s*\d+\s*=\s*\d+\s*Marks/i)) {
                lastLine = line;
                continue;
            }
        }

        // 1. Detect Question Start
        // Pattern A: Numbered (1. Question...)
        const numberedMatch = line.match(/^(?:Q\.?\s*)?(\d+)[\.)\s]+(.+)/);

        // Pattern B: Unnumbered but looks like a question
        const isQuestionText = line.includes('?') ||
            /^(What|Who|Where|When|Why|How|Which|Define|Explain)\s/.test(line);

        if (numberedMatch) {
            saveCurrentQuestion();
            // Check for inline options immediately in the captured text
            const { qText, foundOptions, foundAnswer } = extractInlineOptions(numberedMatch[2].trim());
            currentQuestion = qText;
            if (foundOptions.length > 0) {
                currentOptions = foundOptions;
                if (foundAnswer) {
                    const idx = foundAnswer.charCodeAt(0) - 65;
                    if (currentOptions[idx]) correctAnswer = currentOptions[idx];
                }
            }
            lastLine = line;
            continue;
        } else if (isQuestionText && currentOptions.length === 0) {
            // Treat as new question if we don't have active options OR if it looks distinct
            // If we already have a question but NO options, append to it (multiline question)
            if (currentQuestion && !line.match(/^[A-D][\.)]/)) {
                currentQuestion += ' ' + line;
            } else {
                saveCurrentQuestion(); // Save previous if exists

                // EXTRACT INLINE OPTIONS FROM UNNUMBERED QUESTION TOO
                const { qText, foundOptions, foundAnswer } = extractInlineOptions(line);
                currentQuestion = qText;
                if (foundOptions.length > 0) {
                    currentOptions = foundOptions;
                    if (foundAnswer) {
                        const idx = foundAnswer.charCodeAt(0) - 65;
                        if (currentOptions[idx]) correctAnswer = currentOptions[idx];
                    }
                }
            }
            lastLine = line;
            continue;
        }

        // 2. Detect Options (Priority check)
        // Format: "A. Option" or "a) Option"
        const optionMatch = line.match(/^([A-Da-d])[\.)\]\s]+(.+)/);

        if (optionMatch) {
            // RETROACTIVE DETECTION:
            // If we found an option "A." but have no current question, 
            // the PREVIOUS line must have been the question!
            if (!currentQuestion && currentOptions.length === 0 && lastLine) {
                // Check if lastLine wasn't skipped/instruction
                if (!lastLine.match(/^(?:Choose|Select|Answer|Attempt)/i)) {
                    console.log('      💡 Retroactively detected question:', lastLine.substring(0, 30) + '...');
                    currentQuestion = lastLine;
                }
            }

            // Only add option if we have a question (detected now or before)
            if (currentQuestion) {
                currentOptions.push(optionMatch[2].trim());

                // Inline answer check
                const inlineAnsMatch = optionMatch[2].match(/Answer\s*:\s*([A-Da-d])/i);
                if (inlineAnsMatch) {
                    // We ignore inline logic for now to keep simple, relies on regex #3 below or manual fix
                }
                lastLine = line;
                continue;
            }
        }

        // 3. Detect "Answer:" line
        const answerMatch = line.match(/^(?:Correct|Answer|Ans)[\s:]+([A-Da-d])/i);
        if (answerMatch) {
            const answerLetter = answerMatch[1].toUpperCase();
            const correctIndex = answerLetter.charCodeAt(0) - 65;
            if (correctIndex >= 0 && correctIndex < currentOptions.length) {
                correctAnswer = currentOptions[correctIndex];
            }
            lastLine = line;
            continue;
        }

        // 4. Handle Question Text (if not identified as option/answer)
        if (isQuestionText && currentOptions.length === 0) {
            if (currentQuestion && !line.match(/^[A-D][\.)]/)) {
                currentQuestion += ' ' + line; // Append to existing
            } else {
                saveCurrentQuestion();
                currentQuestion = line;
            }
            lastLine = line;
            continue;
        }

        // 5. Fallback: Identify text as question if we are "idle" (no current question)
        // and it's not an option/answer. 
        // This catches "Explain Polymorphism." (no ? no Number)
        if (!currentQuestion && currentOptions.length === 0) {
            // It's a candidate for retroactive detection later, or we start it now?
            // Let's just store it as lastLine. Retroactive check at 'A.' will pick it up.
            // But if it's the LAST question and has no options? We might miss it.
            // Multiline check:
        }

        lastLine = line;
    }

    saveCurrentQuestion(); // Save last question

    return questions;
}

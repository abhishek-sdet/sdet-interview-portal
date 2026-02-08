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
    // Add newline before option letters (A., B., C., D.) if they're not at the start of a line
    text = text.replace(/([^\n])([A-D][\.)\]\s])/g, '$1\n$2');

    // Add newline before "Answer:" if it's not at the start of a line
    text = text.replace(/([^\n])(Answer\s*:)/gi, '$1\n$2');

    // Add newline before "Correct Answer:" if it's not at the start of a line
    text = text.replace(/([^\n])(Correct\s+Answer\s*:)/gi, '$1\n$2');

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
        // - "Section A – Generic Multiple Choice Questions"
        // - "Section B - Long Answer (5 x 5 = 25 Marks)"
        // - "JAVA Based Questions (Optional - Choose 3 out of 6)"
        // - "Python Based Questions"
        const sectionMatch = line.match(/^(?:Section\s+[A-Z][\s\-–—]+|[A-Z][A-Za-z\s]+(?:Questions?|Based|MCQ|Answer))/i);

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
 * Create section object with metadata
 */
export function createSectionObject(name, type, content) {
    const section = {
        name: name.trim(),
        type: type,
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
    const lines = section.content.split('\n').map(l => l.trim());

    let currentQuestion = null;
    let currentOptions = [];
    let correctAnswer = '';
    let questionNumber = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        // Skip instruction lines and marks allocation
        if (line.match(/^(?:Choose|Select|Answer|Attempt)/i) && line.length > 50) {
            continue;
        }
        if (line.match(/\d+\s*x\s*\d+\s*=\s*\d+\s*Marks/i)) {
            continue; // Skip marks allocation like "5 x 5 = 25 Marks"
        }

        // Detect question start (1., 2., Q1., etc.)
        const questionMatch = line.match(/^(?:Q\.?\s*)?(\d+)[\.)\s*(.+)/);
        if (questionMatch) {
            // Save previous question if it has 4 options (valid MCQ)
            if (currentQuestion && currentOptions.length === 4) {
                questionNumber++;
                questions.push({
                    criteria_id: importData.criteria_id,
                    category: importData.category || 'General',
                    set_name: section.name,
                    set_type: section.type,
                    questions_to_select: section.selectCount,
                    total_in_set: section.totalCount,
                    set_order: questionNumber,
                    question_text: currentQuestion,
                    options: currentOptions,
                    correct_answer: correctAnswer || '', // Allow empty - admin can set later
                    difficulty: importData.difficulty,
                    is_active: true
                });
                const answerStatus = correctAnswer ? '✓' : '⚠ (No answer)';
                console.log(`      ${answerStatus} Q${questionNumber}: ${currentQuestion.substring(0, 50)}...`);
            } else if (currentQuestion && currentOptions.length > 0 && currentOptions.length < 4) {
                // Question has some options but not 4 - likely incomplete, skip it
                console.log(`      ✗ Skipped incomplete question: ${currentQuestion.substring(0, 40)}... (only ${currentOptions.length} options)`);
            } else if (currentQuestion && currentOptions.length === 0) {
                // Question without options - likely essay/descriptive question, skip it
                console.log(`      ⊘ Skipped descriptive question: ${currentQuestion.substring(0, 40)}...`);
            }

            // Start new question
            currentQuestion = questionMatch[2].trim();
            currentOptions = [];
            correctAnswer = '';
            continue;
        }

        // Detect options - TWO FORMATS:
        // Format 1: "A. Option text" or "A) Option text"
        const optionMatch = line.match(/^([A-Da-d])[\.)\s*(.+)/);
        if (optionMatch && currentOptions.length < 4) {
            currentOptions.push(optionMatch[2].trim());
            continue;
        }

        // Format 2: Just "Option text" (no letter prefix)
        // If we have a question but no options yet, and this line doesn't look like a question or answer,
        // treat it as an option
        if (currentQuestion && currentOptions.length < 4 &&
            !line.match(/^(?:Q\.?\s*)?\d+[\.)]/) && // Not a question number
            !line.match(/^(?:Answer|Correct|Ans)[\s:]/i) && // Not an answer line
            !line.match(/^(?:Section|Choose|Select)/i) && // Not a section header
            line.length > 3 && line.length < 200) { // Reasonable length for an option
            currentOptions.push(line.trim());
            continue;
        }

        // Detect correct answer
        const correctMatch = line.match(/^(?:Correct|Answer|Ans|Correct Answer)[\s:]+([A-Da-d])/i);
        if (correctMatch) {
            const answerLetter = correctMatch[1].toUpperCase();
            const correctIndex = answerLetter.charCodeAt(0) - 65;
            if (correctIndex >= 0 && correctIndex < currentOptions.length) {
                correctAnswer = currentOptions[correctIndex];
            }
            continue;
        }

        // Multi-line question text
        if (currentQuestion && currentOptions.length === 0 && !line.match(/^[A-Da-d][\.)]/)

        ) {
            currentQuestion += ' ' + line;
        }
    }

    // Don't forget the last question in section (if it has 4 options)
    if (currentQuestion && currentOptions.length === 4) {
        questionNumber++;
        questions.push({
            criteria_id: importData.criteria_id,
            category: importData.category || 'General',
            set_name: section.name,
            set_type: section.type,
            questions_to_select: section.selectCount,
            total_in_set: section.totalCount,
            set_order: questionNumber,
            question_text: currentQuestion,
            options: currentOptions,
            correct_answer: correctAnswer || '', // Allow empty - admin can set later
            difficulty: importData.difficulty,
            is_active: true
        });
        const answerStatus = correctAnswer ? '✓' : '⚠ (No answer)';
        console.log(`      ${answerStatus} Q${questionNumber}: ${currentQuestion.substring(0, 50)}...`);
    } else if (currentQuestion && currentOptions.length > 0 && currentOptions.length < 4) {
        console.log(`      ✗ Skipped incomplete last question: ${currentQuestion.substring(0, 40)}... (only ${currentOptions.length} options)`);
    } else if (currentQuestion && currentOptions.length === 0) {
        console.log(`      ⊘ Skipped descriptive last question: ${currentQuestion.substring(0, 40)}...`);
    }

    return questions;
}

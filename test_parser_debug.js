const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------
//  DEBUG COPY OF QUESTION PARSER
// ---------------------------------------------------------

function detectSectionType(sectionName) {
    const lower = sectionName.toLowerCase();
    if (lower.includes('java')) return 'java';
    if (lower.includes('python')) return 'python';
    if (lower.includes('aptitude')) return 'aptitude';
    if (lower.includes('sql') || lower.includes('database')) return 'sql';

    // Mappings for Fresher Drive Set
    if (lower.includes('computer') || lower.includes('cs') || lower.includes('technical')) return 'computer_science';
    if (lower.includes('logical') || lower.includes('reasoning')) return 'logical_reasoning';
    if (lower.includes('miscellaneous')) return 'miscellaneous';
    if (lower.includes('grammar') || lower.includes('english') || lower.includes('verbal')) return 'grammar';

    return null;
}

function detectSubsection(sectionName) {
    const lower = sectionName.toLowerCase();
    if (lower.includes('java')) return 'java';
    if (lower.includes('python')) return 'python';
    if (lower.includes('aptitude')) return 'aptitude';
    if (lower.includes('sql') || lower.includes('database')) return 'sql';

    // Mappings for Fresher Drive Set
    if (lower.includes('computer') || lower.includes('cs') || lower.includes('technical')) return 'computer_science';
    if (lower.includes('logical') || lower.includes('reasoning')) return 'logical_reasoning';
    if (lower.includes('miscellaneous')) return 'miscellaneous';
    if (lower.includes('grammar') || lower.includes('english') || lower.includes('verbal')) return 'grammar';

    return null;
}

function createSectionObject(name, type, content) {
    return {
        name: name.trim(),
        type: type || 'mandatory',
        content: content
    };
}

function detectSections(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const sections = [];
    let currentSectionStart = 0;
    let currentSectionName = 'Default Section';
    let currentSectionType = 'mandatory';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const sectionMatch = line.match(/^(?:\[.+\]|Section\s+[\w\s:\-–—]+|[A-Z][A-Za-z\s]+(?:Questions?|Based|MCQ|Answer)|(?:JAVA|Python|Java|PYTHON)|\W*(?:MISCELLANEOUS|General|Aptitude|Technical|Logical|Grammar|Computer|Verbal)\b.*)/i);
        const looksLikeSection = sectionMatch && line.length < 150 && !line.match(/^\d+[\.)]/);

        if (looksLikeSection) {
            console.log(`[DEBUG] Found Section Header at line ${i}: "${line}"`);
            if (currentSectionStart < i) {
                const sectionContent = lines.slice(currentSectionStart, i).join('\n');
                if (sectionContent.trim()) {
                    sections.push(createSectionObject(currentSectionName, currentSectionType, sectionContent));
                }
            }
            currentSectionName = line;
            currentSectionType = line.toLowerCase().includes('optional') ? 'optional' : 'mandatory';
            currentSectionStart = i + 1;
        }
    }

    if (currentSectionStart < lines.length) {
        const sectionContent = lines.slice(currentSectionStart).join('\n');
        if (sectionContent.trim()) {
            sections.push(createSectionObject(currentSectionName, currentSectionType, sectionContent));
        }
    }
    return sections;
}

function parseQuestionsInSection(section) {
    console.log(`\n--- Parsing Section: ${section.name} ---`);
    const questions = [];
    const lines = section.content.split(/\n+/).map(l => l.trim()).filter(l => l);

    let currentQuestion = null;
    let currentOptions = [];
    let correctAnswer = '';
    let questionNumber = 0;
    let lastLine = '';

    const saveCurrentQuestion = () => {
        if (currentQuestion && currentOptions.length >= 2) {
            questionNumber++;
            questions.push({
                question_text: currentQuestion,
                options: currentOptions,
                correct_option: correctAnswer ? String.fromCharCode(65 + currentOptions.indexOf(correctAnswer)) : '',
                section_name: section.name
            });
            console.log(`  [SAVED] Q${questionNumber}: ${currentQuestion.substring(0, 30)}...`);
        } else if (currentQuestion) {
            console.log(`  [SKIP] Incomplete Question: ${currentQuestion.substring(0, 30)}... Options: ${currentOptions.length}`);
        }
        currentQuestion = null;
        currentOptions = [];
        correctAnswer = '';
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        const optionMatch = line.match(/^([A-Da-d])[\.)\]\s]+(.+)/);
        const answerMatch = line.match(/^(?:[^a-zA-Z0-9]*)(?:Correct\s+Answer|Correct\s+Option|Answer\s+Key|Correct|Answer|Ans|Ans\.?)[\s:\-\)\.]+(?:\(?)\s*([A-Da-d])/i);

        // DEBUG: Check regex for Q30/Q31
        const numberedMatch = line.match(/^(?:Q\.?|#)?\s*(\d+)[\.)\s]*(.*)/);
        const isNumberedStart = numberedMatch && line.match(/^(?:Q\.?|#)?\s*\d+[\.)]/);

        if (line.includes('Q31') || line.includes('#30')) {
            console.log(`  [DEBUG LINE "${line}"]`);
            console.log(`     numberedMatch: ${!!numberedMatch}`);
            console.log(`     isNumberedStart: ${!!isNumberedStart}`);
            console.log(`     optionMatch: ${!!optionMatch}`);
        }

        if (isNumberedStart && !optionMatch && !answerMatch) {
            saveCurrentQuestion();
            const text = numberedMatch[2] ? numberedMatch[2].trim() : '';
            currentQuestion = text;
            lastLine = line;
            console.log(`  [START] Numbered Question: "${text}" (from "${line}")`);
            continue;
        }

        if (optionMatch) {
            if (currentQuestion === null && currentOptions.length === 0 && lastLine && !lastLine.match(/^(?:Choose|Select|Answer|Attempt)/i)) {
                console.log(`      [RETRO] Detected question from prev line: "${lastLine}"`);
                currentQuestion = lastLine;
            }

            if (currentQuestion !== null) {
                currentOptions.push(optionMatch[2].trim());
                lastLine = line;
                continue;
            } else {
                console.log(`  [WARN] Option found but no question: "${line}"`);
            }
        }

        if (answerMatch) {
            const answerLetter = answerMatch[1].toUpperCase();
            const correctIndex = answerLetter.charCodeAt(0) - 65;
            if (correctIndex >= 0 && correctIndex < currentOptions.length) {
                correctAnswer = currentOptions[correctIndex];
            }
            lastLine = line;
            continue;
        }

        if (currentQuestion !== null && currentOptions.length === 0) {
            if (currentQuestion === '') {
                currentQuestion = line;
            } else {
                currentQuestion += '\n' + line;
            }
            lastLine = line;
            console.log(`  [APPEND] "${line}"`);
            continue;
        }

        if (currentQuestion === null && currentOptions.length === 0) {
            const isQuestionText = line.includes('?') || /^(What|Who|Where|When|Why|How|Which|Define|Explain)\s/.test(line);
            if (isQuestionText) {
                saveCurrentQuestion();
                currentQuestion = line;
                console.log(`  [START] Unnumbered Question: "${line}"`);
            } else {
                console.log(`  [IGNORE] "${line}"`);
            }
        }

        lastLine = line;
    }
    saveCurrentQuestion();
    return questions;
}

// ---------------------------------------------------------
//  RUN TEST
// ---------------------------------------------------------
try {
    const filePath = path.join(__dirname, '..', 'Set_A_Fresher (1).txt');
    console.log(`Reading file: ${filePath}`);
    let text = fs.readFileSync(filePath, 'utf8');

    // MOCK PREPROCESS (simplified)
    text = text.replace(/([^\n])\s*([A-Da-d][\.)\]])\s+/g, '$1\n$2 ');
    text = text.replace(/([^\n])\s*([^a-zA-Z0-9\n]*(?:Correct\s+Answer|Correct\s+Option|Answer\s+Key|Correct|Answer|Ans)[^a-zA-Z0-9\n]*)/gi, '$1\n$2');

    const sections = detectSections(text);
    console.log(`Found ${sections.length} sections.`);

    let allQ = [];
    sections.forEach(s => {
        allQ = [...allQ, ...parseQuestionsInSection(s)];
    });

    console.log(`\nParsed ${allQ.length} questions total.`);
} catch (err) {
    console.error("CRASH:", err);
}

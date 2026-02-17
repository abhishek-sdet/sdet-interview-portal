
const fs = require('fs');
const path = require('path');

// Mock specific logic from UploadQuestions.jsx
const parseSimpleQuestions = (text) => {
    // console.log('Raw text sample:', text.substring(0, 500)); 

    const questions = [];

    // Normalize text
    const cleanText = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ')
        .replace(/\u00A0/g, ' ');

    const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l);

    let currentSection = 'general';
    let currentSubsection = null;

    let currentQuestion = null;

    // Regex patterns
    const sectionRegex = /^\[(.+)\]$|^(Section|Part)\s+[\w\d]/i;
    const questionStartRegex = /^(?:#|Q)?\s*(\d+)[\.)\s]\s*(.+)?/i;
    const optionRegex = /^([A-D])[\.)\)]\s*(.+)/i;
    const answerRegex = /^(?:✅\s*)?(?:Answer|Ans|Correct)\s*[:\-]\s*([A-D])/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 1. Check for Section Headers
        const sectionMatch = line.match(sectionRegex);
        if (sectionMatch) {
            console.log(`[DEBUG] Section detected: ${line}`);
            const sectionName = (sectionMatch[1] || sectionMatch[0]).toLowerCase();

            if (sectionName.includes('java')) {
                currentSection = 'elective';
                currentSubsection = 'java';
            } else if (sectionName.includes('python')) {
                currentSection = 'elective';
                currentSubsection = 'python';
            } else if (sectionName.includes('elective')) {
                currentSection = 'elective';
                currentSubsection = null;
            } else if (sectionName.includes('logic') || sectionName.includes('reasoning')) {
                currentSection = 'general';
            } else {
                currentSection = 'general';
                currentSubsection = null;
            }
            continue;
        }

        // 2. Check for Answer Key
        const ansMatch = line.match(answerRegex);
        if (ansMatch && currentQuestion) {
            console.log(`[DEBUG] Answer detected for Q${currentQuestion.question_text.substring(0, 10)}...: ${ansMatch[1]}`);
            currentQuestion.correct_option = ansMatch[1].toUpperCase();
            continue;
        }

        // 3. Check for Options
        const optMatch = line.match(optionRegex);
        if (optMatch && currentQuestion) {
            console.log(`[DEBUG] Option detected for Q${currentQuestion.question_text.substring(0, 10)}...: ${line}`);
            const letter = optMatch[1].toUpperCase();
            const text = optMatch[2];
            const map = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
            if (map[letter] !== undefined) {
                currentQuestion.options[map[letter]] = text.replace(/\*/g, '').trim();
                if (text.includes('*')) currentQuestion.correct_option = letter;
            }
            continue;
        }

        // 4. Check for New Question Start
        const qMatch = line.match(questionStartRegex);
        if (qMatch) {
            console.log(`[DEBUG] Question detected: ${line}`);
            if (currentQuestion && currentQuestion.options.some(o => o)) {
                console.log(`[DEBUG] Pushing previous question. Options count: ${currentQuestion.options.filter(o => o).length}`);
                while (currentQuestion.options.length < 4) currentQuestion.options.push('');
                questions.push(currentQuestion);
            } else if (currentQuestion) {
                console.log(`[DEBUG] SKIPPING previous question (No options!): ${currentQuestion.question_text}`);
            }

            currentQuestion = {
                section: currentSection,
                subsection: currentSubsection,
                question_text: qMatch[2] || '',
                options: [],
                correct_option: 'A',
                is_active: true
            };
            continue;
        }

        // 5. Append
        if (currentQuestion) {
            // console.log(`[DEBUG] Appending text: ${line}`);
            if (currentQuestion.options.length === 0 && !currentQuestion.options[0]) {
                if (currentQuestion.question_text) {
                    currentQuestion.question_text += '\n' + line;
                } else {
                    currentQuestion.question_text = line;
                }
            }
        } else {
            console.log(`[DEBUG] Ignored line (No Active Question): ${line}`);
        }
    }

    if (currentQuestion && currentQuestion.options.some(o => o)) {
        console.log(`[DEBUG] Pushing last question.`);
        while (currentQuestion.options.length < 4) currentQuestion.options.push('');
        questions.push(currentQuestion);
    } else if (currentQuestion) {
        console.log(`[DEBUG] SKIPPING last question (No options!): ${currentQuestion.question_text}`);
    }

    return questions;
};

// Main execution
const filePath = 'Set_A_Fresher (1).txt';
try {
    // Try to read from parent dir or absolute path if needed. 
    // Assuming script is run from project root, and file is in parent? 
    // The user context says file is at "c:\Users\abhishek.johri\OneDrive - SDET TECH\Documents\SDET Apps\ALL the app for fresher drive\Set_A_Fresher (1).txt"
    // And this script is likely in "fresher-drive-system\scripts".

    // We will hardcode the absolute path found in metadata context to be safe
    const absPath = "c:\\Users\\abhishek.johri\\OneDrive - SDET TECH\\Documents\\SDET Apps\\ALL the app for fresher drive\\Set_A_Fresher (1).txt";

    if (fs.existsSync(absPath)) {
        console.log(`Reading file: ${absPath}`);
        const content = fs.readFileSync(absPath, 'utf8');
        const results = parseSimpleQuestions(content);
        console.log(`\nTotal parsed: ${results.length}`);

        // List parsed questions to see holes
        results.forEach((q, i) => {
            console.log(`${i + 1}. [${q.section} - ${q.subsection}] ${q.question_text.substring(0, 30).replace(/\n/g, ' ')}...`);
        });

    } else {
        console.error("File not found at: " + absPath);
    }
} catch (e) {
    console.error("Error:", e);
}

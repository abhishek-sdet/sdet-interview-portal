
const fs = require('fs');
const path = require('path');

// MOCK the questionParser imports since we are in node
// Copying logic from src/utils/questionParser.js to ensure we test exact logic
function preprocessDocumentText(text) {
    text = text.replace(/([^\n])\s*([A-Da-d][\.)\]])\s+/g, '$1\n$2 ');
    // The FIX I implemented:
    text = text.replace(/([^\n])\s*([^a-zA-Z0-9\n]*(?:Answer|Ans|Correct)\s*:)/gi, '$1\n$2');
    return text;
}

function detectSections(text) {
    // simplified for debug
    return [{ content: text, name: "Debug Section" }];
}

function parseQuestionsInSection(section) {
    const questions = [];
    const lines = section.content.split(/\n+/).map(l => l.trim()).filter(l => l);
    let currentQuestion = null;
    let currentOptions = [];
    let correctAnswer = '';
    let questionNumber = 0;

    // Helper to extract options (simplified as typically lines are split)
    const extractInlineOptions = (text) => ({ qText: text, foundOptions: [], foundAnswer: '' });

    const saveCurrentQuestion = () => {
        if (currentQuestion && currentOptions.length >= 2) {
            questionNumber++;
            questions.push({
                question_text: currentQuestion,
                options: currentOptions,
                correct_option: correctAnswer ? String.fromCharCode(65 + currentOptions.indexOf(correctAnswer)) : '',
                correct_answer_text: correctAnswer
            });
        }
    };

    const questionPrefixRegex = /^(?:#|Q)\s*(\d+)[\.)\s]?\s*(.+)?/i;
    const questionNoPrefixRegex = /^(\d+)[\.)]\s*(.+)?/i;
    const optionRegex = /^([A-D])[\.)\)]\s*(.+)/i;
    // THE FIX I IMPLEMENTED:
    const answerRegex = /^(?:[^a-zA-Z0-9]*)(?:Correct|Answer|Ans|Ans\.?)[\s:]+([A-Da-d])/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Answer Detection
        const ansMatch = line.match(answerRegex);
        if (ansMatch) {
            console.log(`[Line ${i}] MATCHED ANSWER: "${line}" -> Letter: ${ansMatch[1]}`);
            if (currentQuestion) {
                const letter = ansMatch[1].toUpperCase();
                const idx = letter.charCodeAt(0) - 65;
                if (currentQuestion.options && currentQuestion.options.length > idx) {
                    // Update the logic to match the parser's logic
                    // In parser, we set `correctAnswer` variable? 
                    // Wait, the parser logic I copied uses `correctAnswer = currentOptions[correctIndex]`.
                    // But `currentQuestion` might store it?
                    // In `UploadQuestions.jsx` logic (which I DELETED), it updated `currentQuestion`.
                    // In `questionParser.js`, it uses `correctAnswer` variable.
                }
                // Let's use `correctAnswer` var to match `questionParser.js` structure
                const correctIndex = ansMatch[1].toUpperCase().charCodeAt(0) - 65;
                if (correctIndex >= 0 && correctIndex < currentOptions.length) {
                    correctAnswer = currentOptions[correctIndex];
                    console.log(`   -> Set correctAnswer to "${correctAnswer}"`);
                } else {
                    console.log(`   -> INVALID INDEX ${correctIndex} for options length ${currentOptions.length}`);
                }
            }
            continue;
        } else {
            if (line.includes('Answer') || line.includes('Ans')) {
                console.log(`[Line ${i}] FAILED Regex on: "${line}"`);
                // Print char codes to see if hidden chars
                const codes = [];
                for (let c = 0; c < Math.min(line.length, 20); c++) codes.push(line.charCodeAt(c));
                console.log(`   Char codes: ${codes.join(',')}`);
            }
        }

        // Option
        const optMatch = line.match(optionRegex);
        if (optMatch) {
            if (currentQuestion) {
                currentOptions.push(optMatch[2].trim());
            }
            continue;
        }

        // Question
        let qMatch = line.match(questionPrefixRegex);
        if (qMatch) {
            saveCurrentQuestion();
            currentQuestion = qMatch[2] ? qMatch[2].trim() : "Question";
            currentOptions = [];
            correctAnswer = '';
            continue;
        }
    }
    saveCurrentQuestion();
    return questions;
}

async function run() {
    const filePath = 'c:\\Users\\abhishek.johri\\OneDrive - SDET TECH\\Documents\\SDET Apps\\ALL the app for fresher drive\\Set_A_Fresher (1).txt';
    console.log(`Reading file: ${filePath}`);

    try {
        const buffer = fs.readFileSync(filePath);

        let text = '';
        // Detect Encoding
        if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
            console.log('Detected UTF-16LE BOM');
            text = new TextDecoder('utf-16le').decode(buffer);
        } else if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
            console.log('Detected UTF-16BE BOM');
            text = new TextDecoder('utf-16be').decode(buffer);
        } else {
            console.log('Defaulting to UTF-8');
            text = new TextDecoder('utf-8').decode(buffer);
        }

        console.log(`Read ${text.length} characters.`);
        console.log(`First 500 chars snippet:\n${text.substring(0, 500)}\n-----------------`);

        const cleanText = preprocessDocumentText(text);
        const questions = parseQuestionsInSection({ content: cleanText });

        console.log(`Parsed ${questions.length} questions.`);
        if (questions.length > 0) {
            console.log('Sample Q1:', JSON.stringify(questions[0], null, 2));
            console.log('Sample Q10:', JSON.stringify(questions[9], null, 2));
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

run();

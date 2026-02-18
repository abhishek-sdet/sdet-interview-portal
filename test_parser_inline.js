
const fs = require('fs');

// --- PARSER LOGIC START (Copied from questionParser.js) ---

function preprocessDocumentText(text) {
    if (!text) return "";
    text = text.replace(/([^\n])\s*([A-Da-d][\.)\]])\s+/g, '$1\n$2 ');
    text = text.replace(/([^\n])\s*([^a-zA-Z0-9\n]*(?:Answer|Ans|Correct)\s*:)/gi, '$1\n$2');
    return text;
}

function parseQuestionsInSection(section) {
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
                correct_answer_text: correctAnswer // Debug
            });
        }
        currentQuestion = null;
        currentOptions = [];
        correctAnswer = '';
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        // Log line for debug
        // console.log(`Line ${i}: ${line}`);

        // 1. Detect Question Start
        const numberedMatch = line.match(/^(?:Q\.?\s*)?(\d+)[\.)\s]+(.+)/);
        if (numberedMatch) {
            saveCurrentQuestion();
            currentQuestion = numberedMatch[2].trim();
            currentOptions = [];
            correctAnswer = '';
            lastLine = line;
            continue;
        }

        // 2. Detect Options
        const optionMatch = line.match(/^([A-Da-d])[\.)\]\s]+(.+)/);
        if (optionMatch) {
            if (currentQuestion) {
                currentOptions.push(optionMatch[2].trim());
                lastLine = line;
                continue;
            }
        }

        // 3. Detect Answer
        // Regex from UploadQuestions.jsx (the fixed one)
        const answerMatch = line.match(/^(?:[^a-zA-Z0-9]*)(?:Correct|Answer|Ans|Ans\.?)[\s:]+([A-Da-d])/i);

        if (answerMatch) {
            const answerLetter = answerMatch[1].toUpperCase();
            const correctIndex = answerLetter.charCodeAt(0) - 65;
            if (correctIndex >= 0 && correctIndex < currentOptions.length) {
                correctAnswer = currentOptions[correctIndex];
            }
            lastLine = line;
            continue;
        }

        lastLine = line;
    }
    saveCurrentQuestion();
    return questions;
}

// --- PARSER LOGIC END ---

// TEST DATA
const rawText = `
#10. Which register holds next instruction address?

A. IR
B. MAR
C. PC
D. MDR

✅ Answer: C

#11. Another Q
A. opt1
B. opt2

Ans: A
`;

// Simulate null byte stripping if it was UTF-16LE read as UTF-8
// const corruptedText = "C\0o\0r\0r\0e\0c\0t\0"; 

const cleanText = preprocessDocumentText(rawText);
console.log("Clean Text:\n", cleanText);

const section = { content: cleanText };
const results = parseQuestionsInSection(section);

fs.writeFileSync('parser_result.json', JSON.stringify(results, null, 2));
console.log("Written parser_result.json");

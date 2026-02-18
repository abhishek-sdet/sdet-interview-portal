
// Mock dependencies and helper functions
function detectSectionType(name) { return 'general'; }
function detectSubsection(name) { return null; }

function parseQuestionsInSection(section) {
    const questions = [];
    const lines = section.content.split(/\n+/).map(l => l.trim()).filter(l => l);

    let currentQuestion = null;
    let currentOptions = [];
    let correctAnswer = '';
    let questionNumber = 0;
    let lastLine = '';

    const extractInlineOptions = (text) => {
        // Simplified mock, not testing this part
        return { qText: text, foundOptions: [], foundAnswer: '' };
    };

    const saveCurrentQuestion = () => {
        if (currentQuestion && currentOptions.length >= 2) {
            questionNumber++;
            questions.push({
                question_text: currentQuestion,
                options: currentOptions,
                correct_option: correctAnswer ? String.fromCharCode(65 + currentOptions.indexOf(correctAnswer)) : '',
                correct_answer_text: correctAnswer // Debug field
            });
            console.log(`Saved Q${questionNumber}: ${currentQuestion.substring(0, 20)}... Correct: ${correctAnswer || 'NONE'}`);
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        console.log(`Processing line: "${line}"`);

        // Skip instructions simplified
        if (currentOptions.length === 0 && !currentQuestion) {
            // simplified
        }

        // 1. Detect Question Start
        const numberedMatch = line.match(/^(?:Q\.?\s*)?(\d+)[\.)\s]+(.+)/);
        const isQuestionText = line.includes('?') || /^(What|Who|Where|When|Why|How)\s/.test(line);

        if (numberedMatch) {
            saveCurrentQuestion();
            currentQuestion = numberedMatch[2].trim();
            currentOptions = [];
            correctAnswer = ''; // Reset
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

        // 3. Detect "Answer:" line - THE FIX
        const answerMatch = line.match(/^(?:[✅\->\s]*)(?:Correct|Answer|Ans|Ans\.)[\s:]+([A-Da-d])/i);
        if (answerMatch) {
            console.log(`   MATCHED ANSWER LINE: "${line}" -> Letter: ${answerMatch[1]}`);
            const answerLetter = answerMatch[1].toUpperCase();
            const correctIndex = answerLetter.charCodeAt(0) - 65;
            if (correctIndex >= 0 && correctIndex < currentOptions.length) {
                correctAnswer = currentOptions[correctIndex];
                console.log(`   Set correctAnswer to: ${correctAnswer}`);
            } else {
                console.log(`   FAILED INDEX: ${correctIndex} (Options length: ${currentOptions.length})`);
            }
            lastLine = line;
            continue;
        } else {
            // Debug failure
            if (line.includes('Answer') || line.includes('Ans')) {
                console.log(`   FAILED TO MATCH ANSWER REGEX: "${line}"`);
            }
        }

        // 4. Handle Question Text append
        if (isQuestionText && currentOptions.length === 0) {
            // simplified
        }

        lastLine = line;
    }
    saveCurrentQuestion();
    return questions;
}

// Test Case
const testContent = `
#10. Which register holds next instruction address?

A. IR
B. MAR
C. PC
D. MDR

✅ Answer: C

#24. Output?
A. true
B. false
C. Error
D. Runtime error

✅ Ans: A
`;

const result = parseQuestionsInSection({ content: testContent, name: 'Test' });
console.log(JSON.stringify(result, null, 2));

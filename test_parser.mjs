
import fs from 'fs';
import mammoth from 'mammoth';
import { parseDocumentWithSeparatedAnswers } from './src/utils/questionParser.js';

function log(msg) {
    try {
        fs.appendFileSync('parser_debug.txt', msg + '\n');
    } catch (e) {
        // ignore
    }
}


// Intercept console.log
const originalLog = console.log;
console.log = function (...args) {
    const msg = args.map(a => String(a)).join(' ');
    log('[INTERNAL] ' + msg);
    // originalLog.apply(console, args); // Optional: keep printing to stdout
};

async function testParser() {
    try {
        log('Starting test...');

        if (!fs.existsSync('set_a.docx')) {
            log('Error: set_a.docx not found!');
            return;
        }

        log('Reading set_a.docx...');
        const result = await mammoth.extractRawText({ path: 'set_a.docx' });
        const text = result.value;
        log('Text extracted. Length: ' + text.length);

        log('Parsing text...');
        // Mock importData
        const importData = { criteria_id: 'test', category: 'General', difficulty: 'easy' };

        const questions = parseDocumentWithSeparatedAnswers(text, importData);

        log(`Parsed ${questions.length} questions.`);

        if (questions.length > 0) {
            log('Q1 Question: ' + questions[0].question_text.substring(0, 50));
            log('Q1 Answer: ' + questions[0].correct_answer);
        }

        const answeredCount = questions.filter(q => q.correct_answer).length;
        log(`Questions with answers: ${answeredCount}/${questions.length}`);

    } catch (err) {
        log('Test failed: ' + err.message);
        if (err.stack) log(err.stack);
    }
}

// Clear log file first
fs.writeFileSync('parser_debug.txt', '');
testParser();

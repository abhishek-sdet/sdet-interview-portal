
import fs from 'fs';
import mammoth from 'mammoth';
import { parseDocumentWithSeparatedAnswers } from './src/utils/questionParser.js';

// Setup file logging
const LOG_FILE = 'verify_log.txt';
fs.writeFileSync(LOG_FILE, ''); // Clear log

function log(msg) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

function error(msg) {
    console.error(msg);
    fs.appendFileSync(LOG_FILE, 'ERROR: ' + msg + '\n');
}

// Mock importData
const importData = { criteria_id: 'test', category: 'General', difficulty: 'easy', isGlobal: true };

async function verify() {
    log('Verifying Answer Key Parsing...');
    try {
        const filePath = 'set_a.docx';
        if (!fs.existsSync(filePath)) {
            error('set_a.docx not found');
            return;
        }

        const result = await mammoth.extractRawText({ path: filePath });
        const text = result.value;

        const questions = parseDocumentWithSeparatedAnswers(text, importData);

        log(`Parsed ${questions.length} questions.`);

        let answeredCount = 0;
        let sets = {};

        questions.forEach((q, i) => {
            if (q.correct_answer) answeredCount++;
            const set = q.set_name || 'Unknown';
            if (!sets[set]) sets[set] = { total: 0, answered: 0 };
            sets[set].total++;
            if (q.correct_answer) sets[set].answered++;

            // Log first few to check
            if (i < 3 || i > 12) {
                log(`[${set}] Q: ${q.question_text.substring(0, 30)}... Ans: ${q.correct_answer || 'NONE'}`);
            }
        });

        log('\n--- Summary ---');
        Object.entries(sets).forEach(([set, counts]) => {
            log(`Set: ${set} - Total: ${counts.total}, Answered: ${counts.answered}`);
        });

        if (answeredCount === questions.length) {
            log('\n✅ ALL questions have answers!');
        } else {
            log(`\n⚠️ Only ${answeredCount}/${questions.length} questions have answers.`);
        }

    } catch (err) {
        error(err.message + '\n' + err.stack);
    }
}

verify().catch(err => error('Top Level Error: ' + err.message));

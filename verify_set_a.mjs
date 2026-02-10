
import fs from 'fs';
import mammoth from 'mammoth';
import { parseDocumentWithSeparatedAnswers } from './src/utils/questionParser.js';

// Mock importData for parser
const importData = { criteria_id: 'test', category: 'General', difficulty: 'easy' };

// Override console.log to capture parser output
const originalLog = console.log;
console.log = function (...args) {
    const msg = args.map(a => String(a)).join(' ');
    fs.appendFileSync('verify_output.txt', '[CONSOLE] ' + msg + '\n');
    // originalLog(...args); // Optional, but run_command output is flaky
};

function log(msg) {
    console.log(msg);
}

async function verifySetA() {
    try {
        fs.writeFileSync('verify_output.txt', ''); // Clear file
        log('Verifying SET A.docx...');

        const filePath = 'set_a.docx'; // Expecting file in root
        if (!fs.existsSync(filePath)) {
            log('Error: set_a.docx not found in current directory.');
            // List files to help debug
            const files = fs.readdirSync('.');
            log('Files in directory: ' + files.join(', '));
            return;
        }

        const result = await mammoth.extractRawText({ path: filePath });
        const text = result.value;
        log('--- Raw Text Start ---');
        log(text.substring(0, 3000));
        log('--- Raw Text End ---');
        log('Text extracted. Parsing...');

        const questions = parseDocumentWithSeparatedAnswers(text, importData);
        log(`Total questions parsed: ${questions.length}`);

        // Analyze Set Names
        const setCounts = {};
        questions.forEach(q => {
            const setName = q.set_name || 'Common/Default';
            setCounts[setName] = (setCounts[setName] || 0) + 1;
        });

        log('\n--- Section Analysis ---');
        Object.entries(setCounts).forEach(([name, count]) => {
            log(`Set: "${name}" - Count: ${count}`);
        });

        // Validation Logic
        log('\n--- Details ---');
        questions.forEach((q, i) => {
            log(`${i + 1}. [${q.set_name || 'Common'}] ${q.question_text.substring(0, 50)}...`);
        });

    } catch (err) {
        log('Verification failed: ' + err.message);
        if (err.stack) log(err.stack);
    }
}

verifySetA();

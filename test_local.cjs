const fs = require('fs');

function log(msg) {
    fs.appendFileSync('debug_output.txt', msg + '\n');
}

try {
    log('Script started.');
    const mammoth = require('mammoth');
    log('Mammoth loaded.');

    if (fs.existsSync('set_a.docx')) {
        log('File found.');
        mammoth.extractRawText({ path: 'set_a.docx' })
            .then(result => {
                log('--- EXTRACTED TEXT ---');
                log(result.value);
                log('--- END TEXT ---');
            })
            .catch(err => {
                log('Error: ' + err.message);
            });
    } else {
        log('File NOT found.');
    }
} catch (e) {
    log('Exception: ' + e.message);
}

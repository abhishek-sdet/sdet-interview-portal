
const fs = require('fs');
const path = require('path');

try {
    const parentDir = 'c:\\Users\\abhishek.johri\\OneDrive - SDET TECH\\Documents\\SDET Apps\\ALL the app for fresher drive';

    // Log directory listing
    let log = `Listing dir: ${parentDir}\n`;
    let files = [];
    try {
        files = fs.readdirSync(parentDir);
        log += `Files found: ${files.length}\n`;
        files.forEach(f => log += ` - ${f}\n`);
    } catch (e) {
        log += `Error listing dir: ${e.message}\n`;
    }

    const targetName = 'Set_A_Fresher (1).txt';
    const foundFile = files.find(f => f === targetName);

    if (foundFile) {
        log += `\nTarget file FOUND: ${foundFile}\n`;
        const fullPath = path.join(parentDir, foundFile);

        try {
            const buf = fs.readFileSync(fullPath);
            log += `Read ${buf.length} bytes.\n`;

            // Hex Dump of start
            let hexHead = "";
            for (let i = 0; i < min(50, buf.length); i++) hexHead += buf[i].toString(16).padStart(2, '0') + " ";
            log += `Heax Head: ${hexHead}\n`;

            // Decode and Search
            // Assuming UTF-16LE based on previous failures
            const textLE = buf.toString('utf16le');
            const textUTF8 = buf.toString('utf8');

            log += `\n--- UTF-16LE Decode Start ---\n${textLE.substring(0, 100)}\n`;

            // Check lines in LE
            log += `\n--- Searching Answers in UTF-16LE ---\n`;
            const lines = textLE.split(/\r?\n/);
            lines.forEach((line, idx) => {
                // Check basically
                if (line.includes("Answer") || line.includes("Ans")) {
                    log += `Line ${idx}: "${line}"\n`;
                    // Check char codes
                    let codes = "";
                    for (let c = 0; c < line.length; c++) codes += line.charCodeAt(c).toString(16) + " ";
                    log += `Codes: ${codes}\n`;
                }
            });

        } catch (readErr) {
            log += `Error reading file: ${readErr.message}\n`;
        }
    } else {
        log += `\nTarget file NOT found in listing.\n`;
    }

    fs.writeFileSync('debug_analysis.txt', log, 'utf8');

} catch (err) {
    // If we can't write log, we are doomed, but try console
    console.error(err);
}

function min(a, b) { return a < b ? a : b; }

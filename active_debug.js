const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Set_A_Fresher (1).txt');
console.log(`Reading: ${filePath}`);

try {
    const text = fs.readFileSync(filePath, 'utf8');
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    console.log(`Total lines: ${lines.length}`);
    console.log('Scanning for question starts...');

    let qCount = 0;

    lines.forEach((line, idx) => {
        // EXACT LOGIC FROM questionParser.js
        const numberedMatch = line.match(/^(?:Q\.?|#)?\s*(\d+)[\.)\s]*(.*)/);

        // Case A: Standard "1." or "1)" (Prefix optional)
        const matchesStrict = line.match(/^(?:Q\.?|#)?\s*\d+[\.)]/);
        // Case B: Prefix + Space "Q1 " or "#1 " (Dot/Paren not required if prefix exists)
        const matchesPrefixWithSpace = line.match(/^(?:Q\.?|#)\s*\d+\s/);

        // Valid if numberedMatch exists AND (Strict OR PrefixWithSpace)
        const isNumberedStart = numberedMatch && (matchesStrict || matchesPrefixWithSpace);

        if (isNumberedStart) {
            const num = numberedMatch[1];
            console.log(`[HIT] Line ${idx + 1}: Q${num} | "${line.substring(0, 40)}"`);
            qCount++;
        } else {
            // Check near misses for Java/Python area
            if (line.includes('24') || line.includes('25') || line.includes('26') ||
                line.includes('31') || line.includes('36') || line.includes('37')) {
                // console.log(`[MISS] Line ${idx+1}: "${line}"`);
            }
        }
    });

    console.log(`\nTotal Questions Detected: ${qCount}`);

} catch (e) {
    console.error(e);
}

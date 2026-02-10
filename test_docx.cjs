const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

// Handle spaces in path by wrapping in quotes or just using the string
const filePath = "C:\\Users\\abhishek.johri\\OneDrive - SDET TECH\\Documents\\SDET Apps\\ALL the app for fresher drive\\SET A.docx";

console.log('Attempting to read file:', filePath);

try {
    if (!fs.existsSync(filePath)) {
        console.error('File does NOT exist at path:', filePath);
        // Try to list the directory to see what's there
        const dir = path.dirname(filePath);
        if (fs.existsSync(dir)) {
            console.log('Directory exists. Files in directory:');
            console.log(fs.readdirSync(dir).join('\n'));
        } else {
            console.log('Directory does NOT exist:', dir);
        }
        process.exit(1);
    }

    console.log('File exists. Reading...');

    mammoth.extractRawText({ path: filePath })
        .then(result => {
            console.log('--- CONTENT START ---');
            console.log(result.value);
            console.log('--- CONTENT END ---');
        })
        .catch(err => {
            console.error('Error reading docx:', err);
        });

} catch (e) {
    console.error('Exception:', e);
}

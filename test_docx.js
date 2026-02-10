const mammoth = require('mammoth');
const fs = require('fs');

const filePath = 'C:/Users/abhishek.johri/OneDrive - SDET TECH/Documents/SDET Apps/ALL the app for fresher drive/SET A.docx';

console.log('Attempting to read file:', filePath);

if (!fs.existsSync(filePath)) {
    console.error('File does NOT exist at path:', filePath);
    process.exit(1);
}

mammoth.extractRawText({ path: filePath })
    .then(result => {
        console.log('--- CONTENT START ---');
        console.log(result.value);
        console.log('--- CONTENT END ---');
    })
    .catch(err => {
        console.error('Error reading docx:', err);
    });

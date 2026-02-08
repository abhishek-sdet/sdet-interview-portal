const mammoth = require('mammoth');
const fs = require('fs');

const filePath = 'c:\\Users\\abhishek.johri\\OneDrive - SDET TECH\\Documents\\SDET Apps\\ALL the app for fresher drive\\SDET_Tech_Interview_Question_Paper_Set_A.docx';

mammoth.extractRawText({ path: filePath })
    .then(result => {
        console.log(result.value);
    })
    .catch(err => {
        console.error('Error:', err);
    });

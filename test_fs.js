
const fs = require('fs');
try {
    fs.writeFileSync('test_output.txt', 'FS WORKS');
    console.log('File written');
} catch (e) {
    console.error(e);
}

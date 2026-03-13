import { execSync } from 'child_process';
import fs from 'fs';

try {
    const status = execSync('git status', { encoding: 'utf8' });
    fs.writeFileSync('git_debug.txt', status);
} catch (error) {
    fs.writeFileSync('git_debug.txt', 'ERROR: ' + error.message + '\n' + error.stdout + '\n' + error.stderr);
}

import { execSync } from 'child_process';
import fs from 'fs';

try {
    const log = execSync('git log -n 5 --oneline', { encoding: 'utf8' });
    fs.writeFileSync('git_log_debug.txt', log);
} catch (error) {
    fs.writeFileSync('git_log_debug.txt', 'ERROR: ' + error.message);
}

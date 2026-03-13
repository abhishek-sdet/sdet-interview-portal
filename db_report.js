import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    let output = 'Database State Report\n=====================\n\n';

    try {
        output += '--- CRITERIA ---\n';
        const { data: criteria } = await supabase.from('criteria').select('id, name');
        output += JSON.stringify(criteria, null, 2) + '\n\n';

        output += '--- DRIVES (Scheduled Interviews) ---\n';
        const { data: drives } = await supabase.from('scheduled_interviews').select('id, description');
        output += JSON.stringify(drives, null, 2) + '\n\n';

        output += '--- INTERVIEWS ---\n';
        const { data: interviews, error } = await supabase
            .from('interviews')
            .select(`
                id, 
                status, 
                scheduled_interview_id, 
                criteria_id,
                criteria(name),
                candidates(full_name, email)
            `);
        
        if (error) {
            output += 'Error fetching interviews: ' + JSON.stringify(error) + '\n';
        } else {
            output += `Total interviews: ${interviews.length}\n`;
            const orphaned = interviews.filter(i => !i.scheduled_interview_id);
            output += `Orphaned interviews (no drive): ${orphaned.length}\n\n`;
            
            if (orphaned.length > 0) {
                output += '--- SAMPLE ORPHANED INTERVIEWS ---\n';
                output += JSON.stringify(orphaned.slice(0, 20), null, 2) + '\n';
            }
        }
    } catch (err) {
        output += '\nEXCEPTION CAUGHT:\n' + err.stack + '\n';
    }

    fs.writeFileSync('db_diagnostic.txt', output);
    console.log('Report written to db_diagnostic.txt');
}

run().catch(err => {
    fs.appendFileSync('db_diagnostic.txt', '\nFATAL ERROR:\n' + err.stack);
});

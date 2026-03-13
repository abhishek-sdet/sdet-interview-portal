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
    const email = 'test@test.com';
    let log = `Checking status for email: ${email}\n\n`;

    const { data: candidates, error: cError } = await supabase
        .from('candidates')
        .select('id, full_name')
        .eq('email', email);

    if (cError) {
        log += 'Candidate fetch error: ' + JSON.stringify(cError) + '\n';
    } else if (!candidates || candidates.length === 0) {
        log += 'No candidate found with this email.\n';
    } else {
        log += 'Candidates found: ' + JSON.stringify(candidates, null, 2) + '\n\n';

        for (const candidate of candidates) {
            const { data: interviews, error: iError } = await supabase
                .from('interviews')
                .select(`
                    id, 
                    status, 
                    completed_at, 
                    scheduled_interview_id,
                    scheduled_interviews(description)
                `)
                .eq('candidate_id', candidate.id);

            if (iError) {
                log += `Interview fetch error for candidate ${candidate.id}: ` + JSON.stringify(iError) + '\n';
            } else {
                log += `Interviews for candidate ${candidate.id}: ` + JSON.stringify(interviews, null, 2) + '\n';
            }
        }
    }

    fs.writeFileSync('check_candidate_log.txt', log);
    console.log('Log written to check_candidate_log.txt');
}

run().catch(err => {
    fs.appendFileSync('check_candidate_log.txt', '\nFATAL ERROR:\n' + err.stack);
});

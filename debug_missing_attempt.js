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
    const email = 'tes@test.com'; // User's specific email
    let log = `DIAGNOSTIC FOR: ${email}\n\n`;

    const { data: candidates } = await supabase.from('candidates').select('*').eq('email', email);
    log += `Candidates: ${JSON.stringify(candidates, null, 2)}\n\n`;

    if (candidates && candidates.length > 0) {
        for (const candidate of candidates) {
            const { data: interviews } = await supabase
                .from('interviews')
                .select(`
                    *,
                    scheduled_interviews(description, is_active)
                `)
                .eq('candidate_id', candidate.id);
            log += `Interviews for ${candidate.id}:\n${JSON.stringify(interviews, null, 2)}\n\n`;
        }
    } else {
        log += "No candidate found with exact email 'tes@test.com'. Checking for similar emails...\n";
        const { data: similar } = await supabase.from('candidates').select('email').ilike('email', '%tes%');
        log += `Similar emails: ${JSON.stringify(similar, null, 2)}\n`;
    }

    fs.writeFileSync('missing_attempt_debug.txt', log);
}

run();

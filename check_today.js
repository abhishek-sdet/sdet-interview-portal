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
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    
    let log = `--- ACTIVITY FOR TODAY (${startOfToday} AND LATER) ---\n\n`;

    const { data: interviews, error: iError } = await supabase
        .from('interviews')
        .select(`
            id,
            status,
            started_at,
            completed_at,
            scheduled_interview_id,
            candidate_id,
            candidates(full_name, email)
        `)
        .gte('started_at', startOfToday);

    if (iError) {
        log += `ERROR: ${JSON.stringify(iError)}\n`;
    } else {
        log += `Found ${interviews.length} interviews today.\n`;
        log += JSON.stringify(interviews, null, 2) + '\n';
    }

    fs.writeFileSync('today_activity_debug.txt', log);
    console.log('Today activity written to today_activity_debug.txt');
}

run();

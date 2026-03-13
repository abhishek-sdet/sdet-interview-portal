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
    const interviewId = 'ca7fc8d2-44e2-4ee9-a3f7-8a88a04a792a';
    
    let log = `--- SURGICAL DIAGNOSTIC FOR INTERVIEW ${interviewId} ---\n\n`;

    const { data: interview, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', interviewId)
        .single();

    if (error) {
        log += `ERROR: ${JSON.stringify(error)}\n`;
    } else {
        log += JSON.stringify(interview, null, 2) + '\n';
    }

    fs.writeFileSync('surgical_interview_debug.txt', log);
}

run();

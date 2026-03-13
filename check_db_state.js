import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    console.log('Script starting...');
    console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'Found' : 'Not Found');

    console.log('--- CRITERIA ---');
    const { data: criteria } = await supabase.from('criteria').select('id, name');
    console.log(JSON.stringify(criteria, null, 2));

    console.log('\n--- DRIVES ---');
    const { data: drives } = await supabase.from('scheduled_interviews').select('id, description');
    console.log(JSON.stringify(drives, null, 2));

    console.log('\n--- INTERVIEWS ---');
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
        console.error('Error fetching interviews:', error);
        return;
    }

    console.log('Total interviews:', interviews.length);
    const orphaned = interviews.filter(i => !i.scheduled_interview_id);
    console.log('Orphaned interviews (no drive):', orphaned.length);
    
    if (orphaned.length > 0) {
        console.log('\n--- SAMPLE ORPHANED INTERVIEWS ---');
        console.log(JSON.stringify(orphaned.slice(0, 10), null, 2));
    }
}

run().catch(console.error);

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
    let log = '--- ORPHANED INTERVIEWS CLEANUP ---\n';
    console.log('--- ORPHANED INTERVIEWS CLEANUP ---');
    
    // 1. Fetch orphaned interviews to log them before deletion
    const { data: orphans, error: fetchError } = await supabase
        .from('interviews')
        .select(`
            id, 
            criteria(name),
            candidates(full_name, email)
        `)
        .is('scheduled_interview_id', null);

    if (fetchError) {
        console.error('Error fetching orphaned interviews:', fetchError);
        return;
    }

    console.log(`Found ${orphans.length} orphaned records.`);

    if (orphans.length === 0) {
        console.log('Nothing to clean up.');
        return;
    }

    orphans.forEach(o => {
        console.log(`- Deleting: ${o.candidates?.full_name} (${o.criteria?.name || 'N/A'})`);
    });

    // 2. Delete them
    const { error: deleteError } = await supabase
        .from('interviews')
        .delete()
        .is('scheduled_interview_id', null);

    if (deleteError) {
        console.error('Error deleting orphaned interviews:', deleteError);
        log += 'Error deleting orphaned interviews: ' + JSON.stringify(deleteError) + '\n';
    } else {
        console.log('SUCCESS: All orphaned interviews deleted.');
        log += 'SUCCESS: All orphaned interviews deleted.\n';
    }
    
    fs.writeFileSync('cleanup_log.txt', log);
}

run().catch(console.error);

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
    const { data: criteria, error } = await supabase.from('criteria').select('*');
    if (error) {
        fs.writeFileSync('criteria_debug.txt', 'ERROR: ' + JSON.stringify(error));
    } else {
        fs.writeFileSync('criteria_debug.txt', JSON.stringify(criteria, null, 2));
    }
}

run();

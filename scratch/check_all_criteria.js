import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    const { data: criteria, error } = await supabase
        .from('criteria')
        .select('*');

    if (error) {
        console.error('Error fetching criteria:', error);
        return;
    }

    console.log('--- ALL CRITERIA ---');
    criteria.forEach(c => {
        console.log(`ID: ${c.id}`);
        console.log(`Name: ${c.name}`);
        console.log(`Description: ${c.description}`);
        console.log(`Passing %: ${c.passing_percentage}`);
        console.log(`Timer: ${c.timer_duration}`);
        console.log(`Metadata:`, JSON.stringify(c.metadata, null, 2));
        console.log('--------------------');
    });
}

run();

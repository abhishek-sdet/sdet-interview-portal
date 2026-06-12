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

    console.log('Criteria in DB:');
    criteria.forEach(c => {
        console.log(`- ID: ${c.id}`);
        console.log(`  Name: ${c.name}`);
        console.log(`  Timer Duration: ${c.timer_duration}`);
        console.log(`  Passing Percentage: ${c.passing_percentage}`);
        console.log(`  Metadata:`, JSON.stringify(c.metadata, null, 2));
        console.log('---');
    });
}

run();

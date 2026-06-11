import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
    let { data: criteriaData } = await supabase
        .from('criteria')
        .select('*')
        .ilike('name', 'Fresher')
        .single();
    
    if (criteriaData) {
        const { count, error } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('criteria_id', criteriaData.id);
        
        console.log(`Total Fresher questions in DB: ${count}`);
    } else {
        console.log('No Fresher criteria found.');
    }
}

check();

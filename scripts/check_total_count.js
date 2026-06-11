import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function checkTotal() {
    const { count, error } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });
        
    console.log(`Total questions in entire DB: ${count}`);
}

checkTotal();

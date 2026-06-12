import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    const interviewId = 'e32b5a63-222c-4b2f-852e-b05d6155e42b';

    const { data: interview, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', interviewId)
        .single();

    if (error) {
        console.error('Error fetching interview:', error);
        return;
    }

    console.log('Interview Details:', JSON.stringify(interview, null, 2));
}

run();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    try {
        const { data: totalData, error: totalError } = await supabase.from('interviews').select('id', { count: 'exact', head: true });
        console.log('Total Global Interviews:', totalData ? totalData.length : 'N/A', 'Total count:', totalError ? totalError : 'OK');
        
        const { data: drives, error: driveError } = await supabase.from('scheduled_interviews').select('id, description');
        console.log('Drives:', JSON.stringify(drives, null, 2));

        const { data: interviews, error } = await supabase.from('interviews').select('id, scheduled_interview_id');
        if (error) {
            console.error('Error:', error);
            return;
        }
        
        const counts = {};
        interviews.forEach(i => {
            const id = i.scheduled_interview_id || 'null';
            counts[id] = (counts[id] || 0) + 1;
        });
        console.log('Counts per drive:', JSON.stringify(counts, null, 2));
    } catch (e) {
        console.error('Catch:', e);
    }
}

check();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://glkxyflalplqixfefexf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsa3h5ZmxhbHBscWl4ZmVmZXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTQyMDgsImV4cCI6MjA4NjEzMDIwOH0.Ul-wp51Mx3SwV-FwxRm3mZrisoGfUTb_HmGgm25Eajc'
);

async function run() {
    try {
        const { data, error } = await supabase.from('interviews').select('*').limit(5);
        if (error) {
            console.error('Error:', error);
            return;
        }
        console.log('Columns:', Object.keys(data[0]));
        console.log('Sample data:', JSON.stringify(data, null, 2));

        const { data: drive } = await supabase.from('scheduled_interviews').select('id').eq('description', 'Saturday Fresher Drive (Feb 21)').single();
        if (drive) {
            console.log('Drive ID:', drive.id);
            const { data: stats } = await supabase.from('interviews').select('score, criteria_id').eq('scheduled_interview_id', drive.id).eq('status', 'completed');
            console.log('Completed count for drive:', stats.length);
            console.log('Stats Sample:', JSON.stringify(stats.slice(0, 10), null, 2));
        }

    } catch (err) {
        console.error('Fatal:', err);
    }
}

run();

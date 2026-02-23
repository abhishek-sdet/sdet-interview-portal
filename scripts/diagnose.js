import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://glkxyflalplqixfefexf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsa3h5ZmxhbHBscWl4ZmVmZXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTQyMDgsImV4cCI6MjA4NjEzMDIwOH0.Ul-wp51Mx3SwV-FwxRm3mZrisoGfUTb_HmGgm25Eajc'
);

async function run() {
    console.log('--- DIAGNOSTIC START ---');

    try {
        const { data: drives, error: drivesError } = await supabase
            .from('scheduled_interviews')
            .select('*');

        console.log('Drives count:', drives?.length || 0);
        if (drivesError) console.error('Drives Error:', drivesError);
        else console.log('Drives Summary:', drives.map(d => ({ id: d.id, desc: d.description, date: d.scheduled_date })));

        const { data: interviews, error: interviewsError } = await supabase
            .from('interviews')
            .select('id, started_at, scheduled_interview_id')
            .order('started_at', { ascending: false })
            .limit(50);

        if (interviewsError) console.error('Interviews Error:', interviewsError);
        else {
            console.log('Recent Interviews (last 50):');
            const dateMap = {};
            interviews.forEach(i => {
                const d = i.started_at.split('T')[0];
                dateMap[d] = (dateMap[d] || 0) + 1;
            });
            console.log('Interviews by date:', dateMap);

            const feb21Interviews = interviews.filter(i => i.started_at.startsWith('2026-02-21'));
            console.log('Feb 21 specific count:', feb21Interviews.length);
            if (feb21Interviews.length > 0) {
                console.log('Feb 21 sample drive ID:', feb21Interviews[0].scheduled_interview_id);
            }
        }

    } catch (err) {
        console.error('Fatal error:', err);
    }

    console.log('--- DIAGNOSTIC END ---');
}

run();

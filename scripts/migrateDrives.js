import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://glkxyflalplqixfefexf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsa3h5ZmxhbHBscWl4ZmVmZXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTQyMDgsImV4cCI6MjA4NjEzMDIwOH0.Ul-wp51Mx3SwV-FwxRm3mZrisoGfUTb_HmGgm25Eajc'
);

async function migrate() {
    console.log('--- STARTING MIGRATION ---');

    const driveDescription = 'Saturday Fresher Drive (Feb 21)';
    const scheduledDate = '2026-02-21';

    // 1. Create the drive
    const { data: drive, error: createError } = await supabase
        .from('scheduled_interviews')
        .insert([
            {
                description: driveDescription,
                scheduled_date: scheduledDate,
                is_active: false
            }
        ])
        .select()
        .single();

    if (createError) {
        console.error('Error creating drive:', createError.message);
        if (!createError.message.includes('unique')) return;
    }

    const driveId = drive?.id;
    console.log('Drive ID:', driveId);

    // 2. Link interviews
    const { data: interviews } = await supabase
        .from('interviews')
        .select('id')
        .gte('started_at', `${scheduledDate}T00:00:00`)
        .lte('started_at', `${scheduledDate}T23:59:59`);

    console.log('Interviews found:', interviews?.length);

    if (interviews?.length > 0 && driveId) {
        const ids = interviews.map(i => i.id);
        const { error: updateError } = await supabase
            .from('interviews')
            .update({ scheduled_interview_id: driveId })
            .in('id', ids);

        console.log('Update status:', updateError ? updateError.message : 'Success');
    }

    console.log('--- MIGRATION FINISHED ---');
}

migrate();
circular_dependency_prevention: true

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://glkxyflalplqixfefexf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsa3h5ZmxhbHBscWl4ZmVmZXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTQyMDgsImV4cCI6MjA4NjEzMDIwOH0.Ul-wp51Mx3SwV-FwxRm3mZrisoGfUTb_HmGgm25Eajc'
);

async function repair() {
    console.log('--- REPAIR START ---');

    try {
        // 1. Delete the "Unnamed Drive" entries scheduled for 2/12/2026 to clean up
        const { error: deleteError } = await supabase
            .from('scheduled_interviews')
            .delete()
            .eq('scheduled_date', '2026-02-12');

        if (deleteError) console.warn('Delete error (might be restricted by RLS):', deleteError.message);
        else console.log('Deleted potential duplicate/unnamed drives from 2/12/2026');

        // 2. Create the correct drive
        const driveDescription = 'Saturday Fresher Drive (Feb 21)';
        const scheduledDate = '2026-02-21';

        console.log('Creating drive:', driveDescription);
        const { data: newDrive, error: createError } = await supabase
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
            // If it exists, let's find it
            const { data: existing } = await supabase
                .from('scheduled_interviews')
                .select('id')
                .eq('description', driveDescription)
                .single();
            if (existing) {
                console.log('Found existing drive:', existing.id);
                var driveId = existing.id;
            } else {
                return;
            }
        } else {
            var driveId = newDrive.id;
            console.log('Created drive with ID:', driveId);
        }

        // 3. Link interviews from Feb 21
        console.log('Searching for interviews on:', scheduledDate);
        const { data: interviews, error: fetchError } = await supabase
            .from('interviews')
            .select('id')
            .gte('started_at', `${scheduledDate}T00:00:00`)
            .lte('started_at', `${scheduledDate}T23:59:59`);

        if (fetchError) {
            console.error('Error fetching interviews:', fetchError);
            return;
        }

        console.log('Found', interviews?.length || 0, 'interviews to link.');

        if (interviews?.length > 0) {
            const ids = interviews.map(i => i.id);
            const { error: updateError } = await supabase
                .from('interviews')
                .update({ scheduled_interview_id: driveId })
                .in('id', ids);

            if (updateError) console.error('Update error:', updateError.message);
            else console.log('Successfully linked', ids.length, 'interviews to the drive!');
        }

    } catch (err) {
        console.error('Fatal repair error:', err);
    }

    console.log('--- REPAIR FINISHED ---');
}

repair();

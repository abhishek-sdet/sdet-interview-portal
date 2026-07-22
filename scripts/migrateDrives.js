import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env before running this script.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
true

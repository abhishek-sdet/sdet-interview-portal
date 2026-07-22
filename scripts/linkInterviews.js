import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env before running this script.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function link() {
    console.log('--- LINKING START ---');

    try {
        // 1. Get the drive ID
        const { data: drive, error: driveError } = await supabase
            .from('scheduled_interviews')
            .select('id')
            .eq('description', 'Saturday Fresher Drive (Feb 21)')
            .single();

        if (driveError || !drive) {
            console.error('Could not find the drive. Error:', driveError?.message);
            return;
        }
        const driveId = drive.id;
        console.log('Found Drive ID:', driveId);

        // 2. Find interviews from Feb 21
        const { data: interviews, error: fetchError } = await supabase
            .from('interviews')
            .select('id')
            .filter('started_at', 'gte', '2026-02-21T00:00:00')
            .filter('started_at', 'lte', '2026-02-21T23:59:59');

        if (fetchError) {
            console.error('Error fetching interviews:', fetchError.message);
            return;
        }
        console.log('Found', interviews?.length, 'interviews to link.');

        if (interviews?.length > 0) {
            const ids = interviews.map(i => i.id);

            // Update in batches of 50 to avoid any potential limits
            for (let i = 0; i < ids.length; i += 50) {
                const batch = ids.slice(i, i + 50);
                const { error: updateError } = await supabase
                    .from('interviews')
                    .update({ scheduled_interview_id: driveId })
                    .in('id', batch);

                if (updateError) {
                    console.error('Batch Update error:', updateError.message);
                } else {
                    console.log(`Linked batch ${i / 50 + 1}`);
                }
            }
            console.log('Linking completed.');
        }
    } catch (err) {
        console.error('Fatal error:', err);
    }
    console.log('--- LINKING END ---');
}

link().then(() => process.exit(0)).catch(() => process.exit(1));

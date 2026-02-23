require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugInterviews() {
    try {
        console.log('Fetching active drives...');
        const { data: drives, error: driveError } = await supabase
            .from('scheduled_interviews')
            .select('id, description, scheduled_date')
            .order('created_at', { ascending: false });

        if (driveError) throw driveError;
        console.log('Drives:', drives);

        console.log('\nFetching recent interviews...');
        const { data: interviews, error: intError } = await supabase
            .from('interviews')
            .select(`
                id, 
                scheduled_interview_id, 
                candidates!inner(email, full_name, phone)
            `)
            .order('completed_at', { ascending: false, nullsFirst: false })
            .limit(5);

        if (intError) throw intError;
        console.log('Recent Interviews:', JSON.stringify(interviews, null, 2));

        // Find the test drive
        const testDrive = drives.find(d => d.description && d.description.toLowerCase().includes('test'));
        if (!testDrive) {
            console.log('No test drive found!');
            return;
        }

        // Find the specific interview for test user
        const testInterview = interviews.find(i => i.candidates.email === 'test@example.com');
        if (testInterview) {
            if (testInterview.scheduled_interview_id !== testDrive.id) {
                console.log(`\nUpdating interview ${testInterview.id} to link to drive ${testDrive.id}`);
                const { error: updateError } = await supabase
                    .from('interviews')
                    .update({ scheduled_interview_id: testDrive.id })
                    .eq('id', testInterview.id);

                if (updateError) throw updateError;
                console.log('Successfully linked interview to drive.');
            } else {
                console.log('\nInterview is already linked to the drive.');
            }
        } else {
            console.log('Test interview not found!');
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

debugInterviews();

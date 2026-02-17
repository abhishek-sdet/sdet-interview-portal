
const { createClient } = require('@supabase/supabase-js');

const start = async () => {
    const supabaseUrl = 'https://glkxyflalplqixfefexf.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsa3h5ZmxhbHBscWl4ZmVmZXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTQyMDgsImV4cCI6MjA4NjEzMDIwOH0.Ul-wp51Mx3SwV-FwxRm3mZrisoGfUTb_HmGgm25Eajc';

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching candidate record for abhgh150@gmail.com...');

    // 1. Get Candidate ID
    const { data: candidates, error: candError } = await supabase
        .from('candidates')
        .select('id, email')
        .eq('email', 'abhgh150@gmail.com');

    if (candError || !candidates.length) {
        console.error('Candidate not found or error:', candError);
        return;
    }

    const candidateId = candidates[0].id;
    console.log(`Candidate Found: ${candidateId} (${candidates[0].email})`);

    // 2. Get Interview Record
    const { data: interviews, error: intError } = await supabase
        .from('interviews')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });

    if (intError) {
        console.error('Error fetching interviews:', intError);
        return;
    }

    console.log(`Found ${interviews.length} interviews.`);

    for (const interview of interviews) {
        console.log(`Checking Interview ID: ${interview.id}`);
        console.log(`  - Score: ${interview.score}`);
        console.log(`  - Total: ${interview.total_questions}`);
        console.log(`  - Status: ${interview.passed ? 'PASSED' : 'FAILED'}`);

        // Calculate Percentage
        const total = interview.total_questions || 18; // fallback
        const percentage = (interview.score / total) * 100;
        console.log(`  - Percentage: ${percentage.toFixed(2)}%`);

        // IF percentage is < 80 AND currently marked as PASSED -> UPDATE IT
        // Criteria for Experienced is 80%.
        // 77.8% < 80% => Should be FAILED.

        if (percentage < 80 && interview.passed) {
            console.log('  -> INCORRECT STATUS DETECTED. Fixing...');

            const { error: updateError } = await supabase
                .from('interviews')
                .update({ passed: false })
                .eq('id', interview.id);

            if (updateError) {
                console.error('Failed to update:', updateError);
            } else {
                console.log('  -> FIXED: Updated status to FAILED.');
            }
        } else if (percentage >= 80 && !interview.passed) {
            // Just in case it should be passed but isn't
            console.log('  -> Percentage is >= 80 but marked FAILED. (Assuming 80% criteria)');
            // We won't auto-fix this one without being sure, but the user complained about INCORRECT QUALIFIED.
        } else {
            console.log('  -> Status appears correct based on 80% threshold.');
        }
    }
};

start();

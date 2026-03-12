const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    let output = '';
    try {
        const { data: interviews, error } = await supabase.from('interviews').select('id, scheduled_interview_id');
        if (error) {
            output += 'Error: ' + JSON.stringify(error) + '\n';
        } else {
            output += 'Total Interviews: ' + interviews.length + '\n';
            const counts = {};
            interviews.forEach(i => {
                const id = i.scheduled_interview_id || 'null';
                counts[id] = (counts[id] || 0) + 1;
            });
            output += 'Counts per drive: ' + JSON.stringify(counts, null, 2) + '\n';
        }
        
        const { data: drives } = await supabase.from('scheduled_interviews').select('id, description');
        output += 'Drives: ' + JSON.stringify(drives, null, 2) + '\n';
        
    } catch (e) {
        output += 'Catch: ' + e.message + '\n';
    }
    fs.writeFileSync('debug_db.txt', output);
}

check();

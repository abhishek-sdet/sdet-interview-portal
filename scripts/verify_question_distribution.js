
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyQuestions() {
    const { data, error } = await supabase
        .from('questions')
        .select('section, subsection, category, is_active')
        .eq('is_active', true);

    if (error) {
        console.error('Error fetching questions:', error);
        return;
    }

    const stats = {};

    data.forEach(q => {
        const section = q.section || 'null';
        const subsection = q.subsection || 'null';
        const category = q.category || 'null';

        if (!stats[section]) stats[section] = {};
        if (!stats[section][subsection]) stats[section][subsection] = {};
        if (!stats[section][subsection][category]) stats[section][subsection][category] = 0;

        stats[section][subsection][category]++;
    });

    console.log('Question Distribution (Section > Subsection > Category/Set):');
    console.log(JSON.stringify(stats, null, 2));
}

verifyQuestions();

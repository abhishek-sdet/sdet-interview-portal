
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function fix() {
    const url = 'https://glkxyflalplqixfefexf.supabase.co';
    const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsa3h5ZmxhbHBscWl4ZmVmZXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTQyMDgsImV4cCI6MjA4NjEzMDIwOH0.Ul-wp51Mx3SwV-FwxRm3mZrisoGfUTb_HmGgm25Eajc';
    const supabase = createClient(url, key);

    console.log('Fetching current settings...');
    const { data, error } = await supabase.from('site_settings').select('*').maybeSingle();

    if (error) {
        fs.writeFileSync('db_fix_result.txt', 'Error fetching: ' + JSON.stringify(error));
        return;
    }

    const updateData = {
        enforce_full_screen: true,
        proctoring_auto_submit: true,
        is_site_active: true,
        allow_screenshots: false
    };

    if (data) {
        console.log('Updating existing settings row:', data.id);
        const { error: uError } = await supabase.from('site_settings').update(updateData).eq('id', data.id);
        fs.writeFileSync('db_fix_result.txt', uError ? 'Error updating: ' + JSON.stringify(uError) : 'Success: Updated row ' + data.id);
    } else {
        console.log('Inserting new settings row...');
        const { error: iError } = await supabase.from('site_settings').insert(updateData);
        fs.writeFileSync('db_fix_result.txt', iError ? 'Error inserting: ' + JSON.stringify(iError) : 'Success: Inserted new row');
    }
}

fix();

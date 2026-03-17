const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl ? 'Laden' : 'MISSING');
console.log('KEY:', supabaseAnonKey ? 'Laden' : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSettings() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('allow_screenshots, proctoring_auto_submit, enforce_full_screen')
    .single();

  if (error) {
    console.error('Error fetching site settings:', error);
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
}

checkSettings();

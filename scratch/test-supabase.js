import dotenv from 'dotenv';
dotenv.config();

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log(`URL: ${URL}`);

async function test() {
    try {
        const response = await fetch(`${URL}/rest/v1/`, {
            headers: {
                'apikey': KEY,
                'Authorization': `Bearer ${KEY}`
            }
        });
        console.log(`Status: ${response.status}`);
        const text = await response.text();
        console.log(`Response: ${text}`);
    } catch (e) {
        console.error(`Error: ${e.message}`);
    }
}

test();

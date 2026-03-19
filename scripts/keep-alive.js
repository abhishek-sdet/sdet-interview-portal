const URL = process.env.URL;
const KEY = process.env.KEY;

if (!URL || !KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.");
    process.exit(1);
}

const cleanUrl = URL.endsWith('/') ? URL.slice(0, -1) : URL;

async function ping(name, endpoint) {
    const fullUrl = `${cleanUrl}${endpoint}`;
    console.log(`[${name}] Pinging: ${fullUrl}`);
    try {
        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'apikey': KEY,
                'Authorization': `Bearer ${KEY}`
            }
        });
        console.log(`[${name}] Status: ${response.status} ${response.statusText}`);
        if (response.ok) {
            console.log(`[${name}] Success!`);
            return true;
        } else {
            const body = await response.text();
            console.log(`[${name}] Details: ${body.substring(0, 200)}`);
            return false;
        }
    } catch (error) {
        console.error(`[${name}] Fetch failed:`, error.message);
        return false;
    }
}

async function run() {
    console.log("Starting Supabase Keep-Alive Health Check...");
    
    // We try multiple endpoints to be absolutely sure we wake it up
    const endpoints = [
        { name: 'Auth Health', path: '/auth/v1/health' },
        { name: 'Rest v1 Root', path: '/rest/v1/' },
        { name: 'PostgREST Health', path: '/' }
    ];

    let success = false;
    for (const e of endpoints) {
        const ok = await ping(e.name, e.path);
        if (ok) success = true;
        console.log("-------------------");
    }

    if (success) {
        console.log("Supabase project is alive and responsive.");
        process.exit(0);
    } else {
        console.error("All keep-alive attempts failed. Project might be paused or credentials invalid.");
        process.exit(1);
    }
}

run();

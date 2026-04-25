const URL = process.env.URL || process.env.VITE_SUPABASE_URL;
const KEY = process.env.KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!URL || !KEY) {
    console.error("❌ ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY.");
    console.log("Please ensure you have added the following secrets to your GitHub repository:");
    console.log("1. SUPABASE_URL (or VITE_SUPABASE_URL)");
    console.log("2. SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY)");
    console.log("\nTo add secrets:");
    console.log("Settings -> Secrets and variables -> Actions -> New repository secret");
    process.exit(1);
}

const cleanUrl = URL.endsWith('/') ? URL.slice(0, -1) : URL;

async function ping(name, endpoint) {
    const fullUrl = `${cleanUrl}${endpoint}`;
    console.log(`[${name}] Pinging: ${fullUrl}`);
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'apikey': KEY,
                'Authorization': `Bearer ${KEY}`
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log(`[${name}] Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            console.log(`[${name}] Success!`);
            return true;
        } else {
            const body = await response.text();
            console.log(`[${name}] Details: ${body.substring(0, 200)}`);
            
            if (response.status === 503 || response.status === 504) {
                console.warn(`[${name}] ⚠️  Project might be starting up or paused.`);
            } else if (response.status === 401 || response.status === 403) {
                console.error(`[${name}] ❌ Authentication failed. Check your ANON_KEY.`);
            }
            
            return false;
        }
    } catch (error) {
        const cause = error.cause || {};
        if (error.name === 'AbortError') {
            console.error(`[${name}] ❌ Timeout: Request took longer than 10s.`);
        } else if (cause.code === 'ENOTFOUND' || (error.message && error.message.includes('getaddrinfo'))) {
            console.error(`[${name}] ❌ Host not found: Could not resolve ${new global.URL(cleanUrl).hostname}.`);
            console.log(`💡 ADVICE: Check if the project has been deleted or if the URL is correct.`);
        } else {
            console.error(`[${name}] ❌ Fetch failed:`, error.message);
        }
        return false;
    }

}

async function run() {
    console.log("Starting Supabase Keep-Alive Health Check...");
    console.log(`Target URL: ${cleanUrl}`);
    
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
        console.log("✅ Supabase project is alive and responsive.");
        process.exit(0);
    } else {
        console.error("❌ All keep-alive attempts failed.");
        console.error("Project might be paused (without DNS), deleted, or credentials have expired.");
        console.log("\nNext Steps:");
        console.log("1. Login to Supabase Dashboard and check project status.");
        console.log("2. If paused, unpause it manually.");
        console.log("3. Verify your URL and KEY in GitHub Secrets.");
        process.exit(1);
    }
}

run();


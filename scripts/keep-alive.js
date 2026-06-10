import pg from 'pg';
const { Pool } = pg;
import dns from 'dns';
import dotenv from 'dotenv';

// Force IPv4 as GitHub Actions often has issues with IPv6 resolution (ENETUNREACH)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

dotenv.config();

async function keepAlive() {
  const connectionString = (process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL)?.trim();

  if (!connectionString) {
    console.error('❌ ERROR: DATABASE_URL is not set.');
    console.log('Please ensure you have added the DATABASE_URL secret to your GitHub repository.');
    process.exit(1);
  }

  // Manual parsing to handle multiple '@' symbols robustly (common in Supabase passwords)
  const connectionParts = connectionString.match(/postgresql?:\/\/(.*?):(.*)@(.*?):(\d+)\/(.*)/);
  
  let poolConfig;
  if (connectionParts) {
    const [_, user, password, host, port, database] = connectionParts;
    const decodedPassword = decodeURIComponent(password);
    poolConfig = {
      user,
      password: decodedPassword,
      host,
      port: parseInt(port),
      database,
    };
  } else {
    try {
      const url = new URL(connectionString);
      poolConfig = {
        user: url.username,
        password: decodeURIComponent(url.password),
        host: url.hostname,
        port: url.port || 5432,
        database: url.pathname.split('/')[1] || 'postgres',
      };
    } catch (e) {
      console.error('❌ ERROR: Could not parse connection string.');
      process.exit(1);
    }
  }

  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    attempt++;
    let pool;
    
    try {
      pool = new Pool({
        ...poolConfig,
        connectionTimeoutMillis: 15000,
        ssl: { 
          rejectUnauthorized: false,
          require: true 
        }
      });

      console.log(`--- Supabase Keep-Alive Heartbeat (Attempt ${attempt}/${MAX_RETRIES}) ---`);
      console.log(`Time: ${new Date().toISOString()}`);
      console.log(`Target: ${poolConfig.host}`);
      console.log('Connecting to database...');

      const start = Date.now();
      const res = await pool.query('SELECT current_timestamp, version();');
      const duration = Date.now() - start;
      
      if (res.rows[0]) {
        console.log('✅ SUCCESS: Database heartbeat sent successfully.');
        console.log(`DB Time: ${res.rows[0].current_timestamp}`);
        console.log(`Query Duration: ${duration}ms`);
      }
      
      await pool.end();
      console.log('--- Heartbeat Complete ---');
      process.exit(0);
    } catch (error) {
      if (pool) {
        try { await pool.end(); } catch (e) {}
      }
      
      console.error(`❌ ERROR: Heartbeat failed on attempt ${attempt}.`);
      console.error(`Message: ${error.message}`);
      
      if (error.message.includes('tenant/user') && error.message.includes('not found')) {
        console.error('❌ CRITICAL: Supabase project is either PAUSED or DELETED.');
        console.error('💡 ACTION REQUIRED: Log in to the Supabase Dashboard and manually RESTORE your project.');
        console.error('   The keep-alive script can only keep an active project from pausing, it cannot wake a paused project via the Database pooler.');
        process.exit(1);
      }
      
      if (error.message.includes('ENETUNREACH')) {
        console.error('CRITICAL: Network unreachable. Ensure you are using the Transaction Pooler URL (port 6543) for IPv4 support.');
      }
      
      if (attempt >= MAX_RETRIES) {
        console.error('❌ FATAL: Max retries reached. Exiting.');
        process.exit(1);
      }
      
      console.log('⏳ Retrying in 15 seconds...');
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }
}

keepAlive();


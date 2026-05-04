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

  const pool = new Pool({
    ...poolConfig,
    connectionTimeoutMillis: 15000,
    ssl: { 
      rejectUnauthorized: false,
      require: true 
    }
  });

  try {
    console.log('--- Supabase Keep-Alive Heartbeat ---');
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
    console.error('❌ ERROR: Heartbeat failed.');
    console.error(`Message: ${error.message}`);
    
    if (error.message.includes('ENETUNREACH')) {
      console.error('CRITICAL: Network unreachable. Ensure you are using the Transaction Pooler URL (port 6543) for IPv4 support.');
    }
    
    process.exit(1);
  }
}

keepAlive();


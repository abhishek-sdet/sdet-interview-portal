/**
 * Supabase Database Cleanup Script
 * ─────────────────────────────────────────────────────────────────────────────
 * PURPOSE: Automatically clean up old/abandoned data to stay within Supabase
 *          free tier storage limits (500 MB).
 *
 * WHAT IT DELETES (safely):
 *  1. Answers for abandoned interviews older than ABANDONED_DAYS days
 *  2. Abandoned interviews older than ABANDONED_DAYS days
 *  3. Orphan candidates (no interview, older than ORPHAN_DAYS days)
 *  4. Completed interviews older than COMPLETED_DAYS days (optional - configurable)
 *
 * WHAT IT NEVER DELETES:
 *  - Questions and criteria (master data)
 *  - Recent data (within configured thresholds)
 *  - Completed interviews (unless CLEANUP_COMPLETED=true)
 *
 * USAGE:
 *  node scripts/db-cleanup.js              → dry run (shows what WOULD be deleted)
 *  node scripts/db-cleanup.js --execute    → actually deletes
 *  node scripts/db-cleanup.js --report     → storage report only
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');
const { Client }       = require('pg');
const dns              = require('dns');

if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();

// ─── Configuration ──────────────────────────────────────────────────────────
const CONFIG = {
  // Days after which ABANDONED interviews are deleted
  ABANDONED_DAYS:  parseInt(process.env.CLEANUP_ABANDONED_DAYS  || '30'),
  // Days after which ORPHAN candidates (no interview) are deleted
  ORPHAN_DAYS:     parseInt(process.env.CLEANUP_ORPHAN_DAYS     || '7'),
  // Days after which COMPLETED interviews are archived/deleted (0 = never)
  COMPLETED_DAYS:  parseInt(process.env.CLEANUP_COMPLETED_DAYS  || '90'),
  // Whether to delete completed interviews (set CLEANUP_COMPLETED=true in env)
  DELETE_COMPLETED: process.env.CLEANUP_COMPLETED === 'true',
  // Batch size for delete operations
  BATCH_SIZE:      200,
};

// ─── CLI flags ───────────────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const DRY_RUN     = !args.includes('--execute');
const REPORT_ONLY = args.includes('--report');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const log  = (...a) => console.log(...a);
const warn = (...a) => console.warn(...a);
const line = (char = '─', len = 56) => log(char.repeat(len));

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return 'N/A';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = Number(bytes);
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit++; }
  return `${size.toFixed(2)} ${units[unit]}`;
}

// ─── Supabase client (for data cleanup) ─────────────────────────────────────
function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
           || process.env.VITE_SUPABASE_ANON_KEY
           || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Try reading from .env file directly
    try {
      const fs = require('fs');
      const envPath = '.env';
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const urlMatch = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.+)/);
        const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+)/)
                      || envContent.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.+)/);
        if (urlMatch && keyMatch) {
          return createClient(urlMatch[1].trim(), keyMatch[1].trim());
        }
      }
    } catch (_) {}
    throw new Error(
      'Missing VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY).\n' +
      'Set them in your .env file or GitHub Secrets.'
    );
  }
  return createClient(url, key);
}

// ─── PG client (for storage size queries - needs DATABASE_URL) ───────────────
async function getStorageReport(supabase) {
  log('\n📊  Storage Report:');
  line();

  // Row counts via Supabase (works with anon key)
  const tables = ['answers', 'interviews', 'candidates', 'questions', 'criteria'];
  const counts = {};

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    counts[table] = error ? 'ERR' : count;
  }

  log('  Table          │  Row Count');
  log('  ───────────────┼────────────');
  for (const [tbl, cnt] of Object.entries(counts)) {
    log(`  ${tbl.padEnd(15)}│  ${String(cnt).padStart(8)}`);
  }

  // Total row count
  const total = Object.values(counts).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  log('  ───────────────┴────────────');
  log(`  TOTAL ROWS     │  ${String(total).padStart(8)}`);
  line();

  return counts;
}

// ─── Cleanup logic ────────────────────────────────────────────────────────────

async function countToDelete(supabase) {
  const abandonedCutoff  = new Date(Date.now() - CONFIG.ABANDONED_DAYS  * 86400_000).toISOString();
  const orphanCutoff     = new Date(Date.now() - CONFIG.ORPHAN_DAYS      * 86400_000).toISOString();
  const completedCutoff  = new Date(Date.now() - CONFIG.COMPLETED_DAYS   * 86400_000).toISOString();

  // Abandoned interviews
  const { count: abandonedCount } = await supabase
    .from('interviews')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'abandoned')
    .lt('started_at', abandonedCutoff);

  // Orphan candidates
  const { data: orphanData } = await supabase
    .from('candidates')
    .select('id')
    .lt('created_at', orphanCutoff)
    .limit(10000);

  let orphanCount = 0;
  if (orphanData && orphanData.length > 0) {
    const candidateIds = orphanData.map(c => c.id);
    const { data: interviewedIds } = await supabase
      .from('interviews')
      .select('candidate_id')
      .in('candidate_id', candidateIds);
    const interviewedSet = new Set((interviewedIds || []).map(i => i.candidate_id));
    orphanCount = orphanData.filter(c => !interviewedSet.has(c.id)).length;
  }

  // Old completed interviews
  let completedCount = 0;
  if (CONFIG.DELETE_COMPLETED && CONFIG.COMPLETED_DAYS > 0) {
    const { count } = await supabase
      .from('interviews')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .lt('completed_at', completedCutoff);
    completedCount = count || 0;
  }

  return { abandonedCutoff, orphanCutoff, completedCutoff, abandonedCount, orphanCount, completedCount };
}

async function deleteInBatches(supabase, table, ids, label) {
  if (!ids || ids.length === 0) { log(`   ℹ️  No ${label} to delete.`); return 0; }
  let deleted = 0;
  for (let i = 0; i < ids.length; i += CONFIG.BATCH_SIZE) {
    const chunk = ids.slice(i, i + CONFIG.BATCH_SIZE);
    const { error } = await supabase.from(table).delete().in('id', chunk);
    if (error) { warn(`   ⚠️  Error deleting ${label} batch: ${error.message}`); }
    else { deleted += chunk.length; }
  }
  return deleted;
}

async function runCleanup(supabase) {
  const { abandonedCutoff, orphanCutoff, completedCutoff,
          abandonedCount, orphanCount, completedCount } = await countToDelete(supabase);

  log('\n🔍  What will be cleaned up:');
  line();
  log(`  Abandoned interviews (>${CONFIG.ABANDONED_DAYS}d old) : ${abandonedCount ?? 'N/A'}`);
  log(`  Orphan candidates   (>${CONFIG.ORPHAN_DAYS}d old)   : ${orphanCount}`);
  if (CONFIG.DELETE_COMPLETED && CONFIG.COMPLETED_DAYS > 0) {
    log(`  Old completed interviews (>${CONFIG.COMPLETED_DAYS}d) : ${completedCount}`);
  } else {
    log(`  Old completed interviews          : (skipped - set CLEANUP_COMPLETED=true to enable)`);
  }
  line();

  if (DRY_RUN) {
    warn('\n⚠️  DRY RUN MODE — No data deleted.');
    warn('   Run with --execute flag to actually delete.');
    warn('   Example: node scripts/db-cleanup.js --execute\n');
    return { dryRun: true };
  }

  log('\n🗑️  Starting cleanup...\n');
  const results = { answers: 0, abandonedInterviews: 0, orphanCandidates: 0, completedInterviews: 0 };

  // ── Step 1: Delete answers for abandoned interviews ────────────────────────
  log('  [1/4] Fetching abandoned interview IDs...');
  const { data: abandonedInterviews } = await supabase
    .from('interviews')
    .select('id')
    .eq('status', 'abandoned')
    .lt('started_at', abandonedCutoff);

  if (abandonedInterviews && abandonedInterviews.length > 0) {
    const interviewIds = abandonedInterviews.map(i => i.id);
    // Get answer IDs for these interviews
    const { data: answerData } = await supabase
      .from('answers')
      .select('id')
      .in('interview_id', interviewIds);
    if (answerData && answerData.length > 0) {
      const answerIds = answerData.map(a => a.id);
      log(`  [1/4] Deleting ${answerIds.length} answers for abandoned interviews...`);
      results.answers = await deleteInBatches(supabase, 'answers', answerIds, 'answers');
      log(`   ✅  Deleted ${results.answers} answers.`);
    } else {
      log('  [1/4] No answers found for abandoned interviews.');
    }
  }

  // ── Step 2: Delete abandoned interviews ────────────────────────────────────
  log('\n  [2/4] Deleting abandoned interviews...');
  if (abandonedInterviews && abandonedInterviews.length > 0) {
    const ids = abandonedInterviews.map(i => i.id);
    results.abandonedInterviews = await deleteInBatches(supabase, 'interviews', ids, 'abandoned interviews');
    log(`   ✅  Deleted ${results.abandonedInterviews} abandoned interviews.`);
  } else {
    log('   ℹ️  No abandoned interviews to delete.');
  }

  // ── Step 3: Delete orphan candidates ───────────────────────────────────────
  log('\n  [3/4] Finding orphan candidates...');
  const { data: allOldCandidates } = await supabase
    .from('candidates')
    .select('id')
    .lt('created_at', orphanCutoff);

  if (allOldCandidates && allOldCandidates.length > 0) {
    const oldIds = allOldCandidates.map(c => c.id);
    const { data: interviewedData } = await supabase
      .from('interviews')
      .select('candidate_id')
      .in('candidate_id', oldIds);
    const interviewedSet = new Set((interviewedData || []).map(i => i.candidate_id));
    const orphanIds = oldIds.filter(id => !interviewedSet.has(id));
    log(`   Found ${orphanIds.length} orphan candidates. Deleting...`);
    results.orphanCandidates = await deleteInBatches(supabase, 'candidates', orphanIds, 'orphan candidates');
    log(`   ✅  Deleted ${results.orphanCandidates} orphan candidates.`);
  } else {
    log('   ℹ️  No orphan candidates to delete.');
  }

  // ── Step 4: Delete old completed interviews (if enabled) ───────────────────
  log('\n  [4/4] Old completed interviews...');
  if (CONFIG.DELETE_COMPLETED && CONFIG.COMPLETED_DAYS > 0) {
    const { data: oldCompleted } = await supabase
      .from('interviews')
      .select('id')
      .eq('status', 'completed')
      .lt('completed_at', completedCutoff);

    if (oldCompleted && oldCompleted.length > 0) {
      const ids = oldCompleted.map(i => i.id);
      // Delete answers first
      const { data: ans } = await supabase.from('answers').select('id').in('interview_id', ids);
      if (ans && ans.length > 0) {
        await deleteInBatches(supabase, 'answers', ans.map(a => a.id), 'completed answers');
      }
      results.completedInterviews = await deleteInBatches(supabase, 'interviews', ids, 'completed interviews');
      log(`   ✅  Deleted ${results.completedInterviews} old completed interviews.`);
    } else {
      log('   ℹ️  No old completed interviews to delete.');
    }
  } else {
    log('   ℹ️  Skipped (set CLEANUP_COMPLETED=true + CLEANUP_COMPLETED_DAYS=90 to enable).');
  }

  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  line('═');
  log('  🧹  Supabase Database Cleanup');
  log(`  📅  ${new Date().toISOString()}`);
  log(`  🏃  Mode: ${REPORT_ONLY ? 'REPORT ONLY' : DRY_RUN ? 'DRY RUN (no deletes)' : '🔴 EXECUTE (will delete!)'}`);
  line('═');

  log('\n⚙️  Configuration:');
  log(`   Abandoned data older than : ${CONFIG.ABANDONED_DAYS} days`);
  log(`   Orphan candidates older   : ${CONFIG.ORPHAN_DAYS} days`);
  log(`   Completed interviews      : ${CONFIG.DELETE_COMPLETED ? CONFIG.COMPLETED_DAYS + ' days' : 'NOT deleting'}`);

  let supabase;
  try {
    supabase = getSupabaseClient();
    log('\n✅  Supabase client initialized.');
  } catch (err) {
    warn(`\n❌  Failed to init Supabase: ${err.message}`);
    process.exit(1);
  }

  // Storage report (always shown)
  await getStorageReport(supabase);

  if (REPORT_ONLY) {
    log('\n📊  Report complete. Run with --execute to clean up data.\n');
    process.exit(0);
  }

  // Run cleanup
  const results = await runCleanup(supabase);

  // Summary
  line('═');
  log('\n📋  CLEANUP SUMMARY:');
  line();
  if (results.dryRun) {
    log('  DRY RUN — nothing was deleted.');
    log('  Re-run with: node scripts/db-cleanup.js --execute');
  } else {
    log(`  Answers deleted           : ${results.answers}`);
    log(`  Abandoned interviews      : ${results.abandonedInterviews}`);
    log(`  Orphan candidates         : ${results.orphanCandidates}`);
    log(`  Old completed interviews  : ${results.completedInterviews}`);
    const totalDeleted = results.answers + results.abandonedInterviews +
                         results.orphanCandidates + results.completedInterviews;
    log(`  ─────────────────────────────`);
    log(`  TOTAL rows deleted        : ${totalDeleted}`);
    log('\n  ✅  Cleanup complete! Check Supabase dashboard for updated storage.');
  }
  line('═');

  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌  Unexpected error:', err.message);
  process.exit(1);
});

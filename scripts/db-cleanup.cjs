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
 *  5. Candidate identity photos older than PHOTO_DAYS days — the interview/score
 *     record is kept, only the (base64) photo blob is dropped. Photos are the
 *     single biggest storage cost, so this runs independent of #4.
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
  // Days after which a candidate's identity photo is deleted, independent of
  // whether the interview record itself is kept. Photos are the single
  // biggest storage cost (base64 blobs) but are only needed for a short
  // identity-verification review window — the score/interview history is
  // worth keeping far longer than the photo is.
  PHOTO_DAYS:      parseInt(process.env.CLEANUP_PHOTO_DAYS      || '45'),
  // Batch size for delete operations
  BATCH_SIZE:      200,
};

// ─── CLI flags ───────────────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const DRY_RUN     = !args.includes('--execute');
const REPORT_ONLY = args.includes('--report');
const FORCE       = args.includes('--force');

// Abort an --execute run if it would wipe out more than this fraction of a
// table in one go — guards against a misconfigured cutoff (e.g. a huge
// CLEANUP_ABANDONED_DAYS typo) silently deleting almost everything.
const MAX_DELETE_FRACTION = parseFloat(process.env.CLEANUP_MAX_DELETE_FRACTION || '0.5');

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
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Missing VITE_SUPABASE_URL (or SUPABASE_URL). Set it in your .env file or GitHub Secrets.');
  }

  if (!key) {
    // Try reading from .env file directly before giving up
    try {
      const fs = require('fs');
      const envPath = '.env';
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+)/);
        if (keyMatch) key = keyMatch[1].trim();
      }
    } catch (_) {}
  }

  if (!key) {
    // Deletes issued with the anon key are silently blocked by RLS — that
    // would make --execute look like it succeeded while deleting nothing.
    // Fail loudly instead of falling back to the anon key.
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY.\n' +
      'This script performs deletes that RLS blocks for the anon key — without the ' +
      'service role key, deletes would silently no-op. Set SUPABASE_SERVICE_ROLE_KEY ' +
      'in your .env file or GitHub Secrets before running --execute (or --report, which ' +
      'also requires it for accurate counts).'
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

// Fetches ALL matching rows for a query, paging through in chunks of
// `pageSize` instead of relying on a single .limit() call that silently
// drops anything beyond the cap.
async function fetchAll(queryBuilderFn, pageSize = 1000) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await queryBuilderFn().range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

// Looks up which of the given candidate IDs have an interview, chunking the
// `.in()` filter so the request URL doesn't blow up for large ID lists.
async function findInterviewedCandidateIds(supabase, candidateIds, chunkSize = 500) {
  const interviewed = new Set();
  for (let i = 0; i < candidateIds.length; i += chunkSize) {
    const chunk = candidateIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('interviews')
      .select('candidate_id')
      .in('candidate_id', chunk);
    if (error) throw error;
    (data || []).forEach(row => interviewed.add(row.candidate_id));
  }
  return interviewed;
}

async function countToDelete(supabase) {
  const abandonedCutoff  = new Date(Date.now() - CONFIG.ABANDONED_DAYS  * 86400_000).toISOString();
  const orphanCutoff     = new Date(Date.now() - CONFIG.ORPHAN_DAYS      * 86400_000).toISOString();
  const completedCutoff  = new Date(Date.now() - CONFIG.COMPLETED_DAYS   * 86400_000).toISOString();
  const photoCutoff      = new Date(Date.now() - CONFIG.PHOTO_DAYS       * 86400_000).toISOString();

  // Abandoned interviews
  const { count: abandonedCount } = await supabase
    .from('interviews')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'abandoned')
    .lt('started_at', abandonedCutoff);

  // Orphan candidates (paged — no row cap)
  const orphanData = await fetchAll(() => supabase
    .from('candidates')
    .select('id')
    .lt('created_at', orphanCutoff));

  let orphanCount = 0;
  if (orphanData && orphanData.length > 0) {
    const candidateIds = orphanData.map(c => c.id);
    const interviewedSet = await findInterviewedCandidateIds(supabase, candidateIds);
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

  // Old candidate photos (independent of interview status)
  const { count: photoCount } = await supabase
    .from('interview_photos')
    .select('*', { count: 'exact', head: true })
    .lt('created_at', photoCutoff);

  return { abandonedCutoff, orphanCutoff, completedCutoff, photoCutoff, abandonedCount, orphanCount, completedCount, photoCount: photoCount || 0 };
}

async function deleteInBatches(supabase, table, ids, label, keyColumn = 'id') {
  if (!ids || ids.length === 0) { log(`   ℹ️  No ${label} to delete.`); return 0; }
  let deleted = 0;
  for (let i = 0; i < ids.length; i += CONFIG.BATCH_SIZE) {
    const chunk = ids.slice(i, i + CONFIG.BATCH_SIZE);
    const { error } = await supabase.from(table).delete().in(keyColumn, chunk);
    if (error) { warn(`   ⚠️  Error deleting ${label} batch: ${error.message}`); }
    else { deleted += chunk.length; }
  }
  return deleted;
}

async function runCleanup(supabase) {
  const { abandonedCutoff, orphanCutoff, completedCutoff, photoCutoff,
          abandonedCount, orphanCount, completedCount, photoCount } = await countToDelete(supabase);

  log('\n🔍  What will be cleaned up:');
  line();
  log(`  Abandoned interviews (>${CONFIG.ABANDONED_DAYS}d old) : ${abandonedCount ?? 'N/A'}`);
  log(`  Orphan candidates   (>${CONFIG.ORPHAN_DAYS}d old)   : ${orphanCount}`);
  if (CONFIG.DELETE_COMPLETED && CONFIG.COMPLETED_DAYS > 0) {
    log(`  Old completed interviews (>${CONFIG.COMPLETED_DAYS}d) : ${completedCount}`);
  } else {
    log(`  Old completed interviews          : (skipped - set CLEANUP_COMPLETED=true to enable)`);
  }
  log(`  Candidate photos    (>${CONFIG.PHOTO_DAYS}d old)   : ${photoCount} (interview record is kept)`);
  line();

  if (DRY_RUN) {
    warn('\n⚠️  DRY RUN MODE — No data deleted.');
    warn('   Run with --execute flag to actually delete.');
    warn('   Example: node scripts/db-cleanup.js --execute\n');
    return { dryRun: true };
  }

  // ── Safety cap: refuse to blow away a huge fraction of a table in one run ──
  if (!FORCE) {
    const { count: totalInterviews } = await supabase
      .from('interviews').select('*', { count: 'exact', head: true });
    const { count: totalCandidates } = await supabase
      .from('candidates').select('*', { count: 'exact', head: true });

    const { count: totalPhotos } = await supabase
      .from('interview_photos').select('*', { count: 'exact', head: true });

    const interviewDeletes = (abandonedCount || 0) + (completedCount || 0);
    const interviewFraction = totalInterviews ? interviewDeletes / totalInterviews : 0;
    const candidateFraction = totalCandidates ? orphanCount / totalCandidates : 0;
    const photoFraction = totalPhotos ? photoCount / totalPhotos : 0;

    if (interviewFraction > MAX_DELETE_FRACTION || candidateFraction > MAX_DELETE_FRACTION || photoFraction > MAX_DELETE_FRACTION) {
      warn('\n🛑  SAFETY ABORT — this run would delete an unusually large share of the data:');
      warn(`   Interviews : ${interviewDeletes}/${totalInterviews} (${(interviewFraction * 100).toFixed(1)}%)`);
      warn(`   Candidates : ${orphanCount}/${totalCandidates} (${(candidateFraction * 100).toFixed(1)}%)`);
      warn(`   Photos     : ${photoCount}/${totalPhotos} (${(photoFraction * 100).toFixed(1)}%)`);
      warn(`   Threshold  : ${(MAX_DELETE_FRACTION * 100).toFixed(0)}% of the table.`);
      warn('   This usually means a cutoff/env var is misconfigured. Re-run with --force to override.\n');
      return { aborted: true };
    }
  }

  log('\n🗑️  Starting cleanup...\n');
  const results = { answers: 0, abandonedInterviews: 0, orphanCandidates: 0, completedInterviews: 0, photos: 0 };

  // ── Step 1: Delete answers for abandoned interviews ────────────────────────
  log('  [1/5] Fetching abandoned interview IDs...');
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
      log(`  [1/5] Deleting ${answerIds.length} answers for abandoned interviews...`);
      results.answers = await deleteInBatches(supabase, 'answers', answerIds, 'answers');
      log(`   ✅  Deleted ${results.answers} answers.`);
    } else {
      log('  [1/5] No answers found for abandoned interviews.');
    }
  }

  // ── Step 2: Delete abandoned interviews ────────────────────────────────────
  log('\n  [2/5] Deleting abandoned interviews...');
  if (abandonedInterviews && abandonedInterviews.length > 0) {
    const ids = abandonedInterviews.map(i => i.id);
    results.abandonedInterviews = await deleteInBatches(supabase, 'interviews', ids, 'abandoned interviews');
    log(`   ✅  Deleted ${results.abandonedInterviews} abandoned interviews.`);
  } else {
    log('   ℹ️  No abandoned interviews to delete.');
  }

  // ── Step 3: Delete orphan candidates ───────────────────────────────────────
  log('\n  [3/5] Finding orphan candidates...');
  const allOldCandidates = await fetchAll(() => supabase
    .from('candidates')
    .select('id')
    .lt('created_at', orphanCutoff));

  if (allOldCandidates && allOldCandidates.length > 0) {
    const oldIds = allOldCandidates.map(c => c.id);
    const interviewedSet = await findInterviewedCandidateIds(supabase, oldIds);
    const orphanIds = oldIds.filter(id => !interviewedSet.has(id));
    log(`   Found ${orphanIds.length} orphan candidates. Deleting...`);
    results.orphanCandidates = await deleteInBatches(supabase, 'candidates', orphanIds, 'orphan candidates');
    log(`   ✅  Deleted ${results.orphanCandidates} orphan candidates.`);
  } else {
    log('   ℹ️  No orphan candidates to delete.');
  }

  // ── Step 4: Delete old completed interviews (if enabled) ───────────────────
  log('\n  [4/5] Old completed interviews...');
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

  // ── Step 5: Delete old candidate photos (keeps the interview/score record) ─
  log(`\n  [5/5] Candidate photos older than ${CONFIG.PHOTO_DAYS}d...`);
  const oldPhotos = await fetchAll(() => supabase
    .from('interview_photos')
    .select('interview_id')
    .lt('created_at', photoCutoff));

  if (oldPhotos && oldPhotos.length > 0) {
    const photoIds = oldPhotos.map(p => p.interview_id);
    results.photos = await deleteInBatches(supabase, 'interview_photos', photoIds, 'candidate photos', 'interview_id');
    log(`   ✅  Deleted ${results.photos} candidate photos (interview records untouched).`);
  } else {
    log('   ℹ️  No candidate photos old enough to delete.');
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
  log(`   Candidate photos older    : ${CONFIG.PHOTO_DAYS} days (interview record is kept)`);

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
  if (results.aborted) {
    log('  ABORTED — safety cap tripped, nothing was deleted.');
    line('═');
    process.exit(1);
  } else if (results.dryRun) {
    log('  DRY RUN — nothing was deleted.');
    log('  Re-run with: node scripts/db-cleanup.js --execute');
  } else {
    log(`  Answers deleted           : ${results.answers}`);
    log(`  Abandoned interviews      : ${results.abandonedInterviews}`);
    log(`  Orphan candidates         : ${results.orphanCandidates}`);
    log(`  Old completed interviews  : ${results.completedInterviews}`);
    log(`  Candidate photos          : ${results.photos}`);
    const totalDeleted = results.answers + results.abandonedInterviews +
                         results.orphanCandidates + results.completedInterviews + results.photos;
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

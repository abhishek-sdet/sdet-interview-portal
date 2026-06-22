import React, { useState, useEffect, useCallback } from 'react';
import SimpleLayout from '@/components/admin/SimpleLayout';
import { supabase } from '@/lib/supabase';
import {
    Database, Download, Trash2, AlertTriangle, CheckCircle2,
    RefreshCw, HardDrive, Users, FileText, Calendar,
    TrendingDown, Shield, ChevronDown, ChevronUp, Archive
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Constants ───────────────────────────────────────────────────────────────
const FREE_TIER_LIMIT_MB = 500;
// Estimated bytes per row (conservative estimate for this schema)
const BYTES_PER_ANSWER    = 300;
const BYTES_PER_INTERVIEW = 400;
const BYTES_PER_CANDIDATE = 200;
const BYTES_PER_QUESTION  = 600;

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

// ─── Storage Meter Component ─────────────────────────────────────────────────
function StorageMeter({ usedMB, limitMB }) {
    const pct = Math.min((usedMB / limitMB) * 100, 100);
    const color = pct >= 90 ? 'from-red-500 to-rose-600'
                : pct >= 70 ? 'from-amber-500 to-orange-500'
                : 'from-emerald-500 to-cyan-500';
    const textColor = pct >= 90 ? 'text-red-400' : pct >= 70 ? 'text-amber-400' : 'text-emerald-400';

    return (
        <div className="space-y-3">
            <div className="flex items-end justify-between">
                <div>
                    <span className={`text-3xl font-black ${textColor}`}>{usedMB.toFixed(2)}</span>
                    <span className="text-slate-500 text-sm ml-1">MB used</span>
                </div>
                <div className="text-right">
                    <span className="text-slate-400 text-sm">{limitMB} MB limit</span>
                    <div className={`text-xs font-bold ${textColor}`}>{pct.toFixed(1)}% used</div>
                </div>
            </div>
            {/* Bar */}
            <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div
                    className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-1000 relative`}
                    style={{ width: `${pct}%` }}
                >
                    <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse opacity-50" />
                </div>
            </div>
            {/* Segments */}
            <div className="flex justify-between text-[10px] text-slate-600 font-medium">
                <span>0 MB</span>
                <span className="text-amber-600/60">350 MB ⚠️</span>
                <span className="text-red-600/60">500 MB 🔴</span>
            </div>
        </div>
    );
}

// ─── Drive Row Component ──────────────────────────────────────────────────────
function DriveRow({ drive, onDownload, onDelete, isDeleting, isDownloading }) {
    const [expanded, setExpanded] = useState(false);
    const estimatedBytes =
        (drive.answer_count   * BYTES_PER_ANSWER) +
        (drive.interview_count * BYTES_PER_INTERVIEW) +
        (drive.candidate_count * BYTES_PER_CANDIDATE);

    return (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-200">
            {/* Main Row */}
            <div className="flex items-center gap-4 px-5 py-4">
                {/* Date Badge */}
                <div className="flex-shrink-0 text-center bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 min-w-[60px]">
                    <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                        {new Date(drive.scheduled_date).toLocaleDateString('en-IN', { month: 'short' })}
                    </div>
                    <div className="text-xl font-black text-white leading-none">
                        {new Date(drive.scheduled_date).getDate()}
                    </div>
                </div>

                {/* Drive Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-sm truncate">{drive.description || 'Unnamed Drive'}</h3>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Users size={11} /> {drive.candidate_count} candidates
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                            <FileText size={11} /> {drive.answer_count} answers
                        </span>
                        <span className="flex items-center gap-1 text-xs text-emerald-500/70 font-medium">
                            <HardDrive size={11} /> ~{formatBytes(estimatedBytes)}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => setExpanded(e => !e)}
                        className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                        title="View details"
                    >
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button
                        onClick={() => onDownload(drive)}
                        disabled={isDownloading || drive.candidate_count === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isDownloading ? (
                            <RefreshCw size={13} className="animate-spin" />
                        ) : (
                            <Download size={13} />
                        )}
                        {isDownloading ? 'Saving...' : 'Download'}
                    </button>
                    <button
                        onClick={() => onDelete(drive)}
                        disabled={isDeleting || drive.candidate_count === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isDeleting ? (
                            <RefreshCw size={13} className="animate-spin" />
                        ) : (
                            <Trash2 size={13} />
                        )}
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>

            {/* Expanded Stats */}
            {expanded && (
                <div className="border-t border-white/5 px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white/[0.02]">
                    {[
                        { label: 'Candidates', value: drive.candidate_count, color: 'text-blue-400' },
                        { label: 'Interviews', value: drive.interview_count, color: 'text-purple-400' },
                        { label: 'Answers', value: drive.answer_count, color: 'text-cyan-400' },
                        { label: 'Est. Size', value: formatBytes(estimatedBytes), color: 'text-emerald-400' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="text-center">
                            <div className={`text-xl font-black ${color}`}>{value}</div>
                            <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mt-0.5">{label}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ drive, onConfirm, onCancel, isDeleting }) {
    if (!drive) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative z-10 bg-[#0f172a] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                        <AlertTriangle size={22} className="text-red-400" />
                    </div>
                    <div>
                        <h2 className="text-white font-black text-lg">Delete Drive Data?</h2>
                        <p className="text-slate-500 text-sm">This cannot be undone</p>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5">
                    <p className="text-white font-bold text-sm">{drive.description}</p>
                    <p className="text-slate-400 text-xs mt-1">{formatDate(drive.scheduled_date)}</p>
                    <div className="flex gap-4 mt-3">
                        <span className="text-xs text-red-400 font-bold">{drive.candidate_count} candidates will be deleted</span>
                        <span className="text-xs text-red-400 font-bold">{drive.answer_count} answers will be deleted</span>
                    </div>
                </div>
                <p className="text-amber-400 text-xs mb-5 flex items-start gap-2">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    Please download the data first before deleting. Deleted data cannot be recovered.
                </p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-bold transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                    >
                        {isDeleting ? 'Deleting...' : '🗑️ Yes, Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StorageManager() {
    const [stats, setStats] = useState(null);
    const [drives, setDrives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [deletingDriveId, setDeletingDriveId] = useState(null);
    const [downloadingDriveId, setDownloadingDriveId] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    // ── Fetch Stats ───────────────────────────────────────────────────────────
    const fetchStats = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        try {
            // Row counts
            const [ansRes, intRes, canRes, qRes, criRes, driveRes] = await Promise.all([
                supabase.from('answers').select('*', { count: 'exact', head: true }),
                supabase.from('interviews').select('*', { count: 'exact', head: true }),
                supabase.from('candidates').select('*', { count: 'exact', head: true }),
                supabase.from('questions').select('*', { count: 'exact', head: true }),
                supabase.from('criteria').select('*', { count: 'exact', head: true }),
                supabase.from('scheduled_interviews')
                    .select('id, description, scheduled_date')
                    .order('scheduled_date', { ascending: false }),
            ]);

            const counts = {
                answers:    ansRes.count  || 0,
                interviews: intRes.count  || 0,
                candidates: canRes.count  || 0,
                questions:  qRes.count    || 0,
                criteria:   criRes.count  || 0,
            };

            // Estimated storage
            const estimatedBytes =
                counts.answers    * BYTES_PER_ANSWER +
                counts.interviews * BYTES_PER_INTERVIEW +
                counts.candidates * BYTES_PER_CANDIDATE +
                counts.questions  * BYTES_PER_QUESTION;

            setStats({ counts, estimatedBytes });

            // Per-drive stats
            const allDrives = driveRes.data || [];
            const drivesWithStats = await Promise.all(
                allDrives.map(async (drive) => {
                    // Interviews for this drive
                    const { data: interviews, count: intCount } = await supabase
                        .from('interviews')
                        .select('id, candidate_id', { count: 'exact' })
                        .eq('scheduled_interview_id', drive.id);

                    const interviewIds  = (interviews || []).map(i => i.id);
                    const candidateIds  = [...new Set((interviews || []).map(i => i.candidate_id).filter(Boolean))];

                    // Answer count for this drive's interviews
                    let answerCount = 0;
                    if (interviewIds.length > 0) {
                        const { count } = await supabase
                            .from('answers')
                            .select('*', { count: 'exact', head: true })
                            .in('interview_id', interviewIds);
                        answerCount = count || 0;
                    }

                    return {
                        ...drive,
                        interview_count: intCount || 0,
                        candidate_count: candidateIds.length,
                        answer_count:    answerCount,
                        interview_ids:   interviewIds,
                        candidate_ids:   candidateIds,
                    };
                })
            );

            setDrives(drivesWithStats);
        } catch (err) {
            console.error('Error fetching stats:', err);
            toast.error('Failed to load storage stats');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    // ── Download Drive as CSV ─────────────────────────────────────────────────
    const handleDownload = async (drive) => {
        setDownloadingDriveId(drive.id);
        const toastId = toast.loading(`Preparing download for "${drive.description}"...`);
        try {
            if (drive.interview_ids.length === 0) {
                toast.error('No data to download for this drive.', { id: toastId });
                return;
            }

            // Fetch full candidate + interview data
            const { data: interviews, error: intErr } = await supabase
                .from('interviews')
                .select(`
                    *,
                    candidates(full_name, email, phone),
                    criteria(name, passing_percentage)
                `)
                .in('id', drive.interview_ids);

            if (intErr) throw intErr;

            // Fetch answers for all interviews
            let allAnswers = [];
            for (let i = 0; i < drive.interview_ids.length; i += 100) {
                const chunk = drive.interview_ids.slice(i, i + 100);
                const { data: ans } = await supabase
                    .from('answers')
                    .select('interview_id, selected_answer, is_correct, questions(question_text, correct_answer)')
                    .in('interview_id', chunk);
                if (ans) allAnswers = [...allAnswers, ...ans];
            }

            // Group answers by interview
            const answersByInterview = {};
            allAnswers.forEach(a => {
                if (!answersByInterview[a.interview_id]) answersByInterview[a.interview_id] = [];
                answersByInterview[a.interview_id].push(a);
            });

            const maxQ = Math.max(0, ...Object.values(answersByInterview).map(a => a.length));

            // Build CSV
            const baseHeaders = ['Name', 'Email', 'Phone', 'Drive', 'Criteria', 'Score', 'Total', 'Percentage', 'Status', 'Date'];
            const qHeaders = [];
            for (let i = 1; i <= maxQ; i++) qHeaders.push(`Q${i} Question`, `Q${i} Selected`, `Q${i} Correct`, `Q${i} Result`);

            const rows = (interviews || []).map(r => {
                const pct = r.total_questions ? ((r.score / r.total_questions) * 100).toFixed(1) : '0';
                const base = [
                    `"${r.candidates?.full_name || ''}"`,
                    `"${r.candidates?.email || ''}"`,
                    `"${r.candidates?.phone || ''}"`,
                    `"${drive.description}"`,
                    `"${r.criteria?.name || ''}"`,
                    r.score || 0,
                    r.total_questions || 0,
                    pct,
                    r.passed ? 'PASSED' : 'FAILED',
                    r.completed_at ? new Date(r.completed_at).toLocaleString('en-IN') : '—',
                ];
                const answers = answersByInterview[r.id] || [];
                const ansData = [];
                for (let i = 0; i < maxQ; i++) {
                    const a = answers[i];
                    if (a) {
                        ansData.push(
                            `"${(a.questions?.question_text || '').replace(/"/g, '""')}"`,
                            `"${(a.selected_answer || '').replace(/"/g, '""')}"`,
                            `"${(a.questions?.correct_answer || '').replace(/"/g, '""')}"`,
                            a.is_correct ? 'CORRECT' : 'WRONG'
                        );
                    } else {
                        ansData.push('', '', '', '');
                    }
                }
                return [...base, ...ansData];
            });

            const csv = [[...baseHeaders, ...qHeaders], ...rows].map(r => r.join(',')).join('\n');
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            const safeName = (drive.description || 'drive').replace(/[^a-z0-9]/gi, '_');
            a.href = url;
            a.download = `${safeName}_${drive.scheduled_date}_results.csv`;
            a.click();
            URL.revokeObjectURL(url);

            toast.success(`✅ Downloaded ${interviews.length} records!`, { id: toastId });
        } catch (err) {
            console.error('Download error:', err);
            toast.error('Download failed: ' + err.message, { id: toastId });
        } finally {
            setDownloadingDriveId(null);
        }
    };

    // ── Delete Drive Data ─────────────────────────────────────────────────────
    const handleDeleteConfirm = async () => {
        const drive = confirmDelete;
        if (!drive) return;
        setDeletingDriveId(drive.id);
        const toastId = toast.loading(`Deleting "${drive.description}" data...`);
        try {
            // 1. Delete answers for this drive's interviews
            if (drive.interview_ids.length > 0) {
                for (let i = 0; i < drive.interview_ids.length; i += 200) {
                    const chunk = drive.interview_ids.slice(i, i + 200);
                    const { error } = await supabase.from('answers').delete().in('interview_id', chunk);
                    if (error) throw error;
                }
            }

            // 2. Delete interviews
            if (drive.interview_ids.length > 0) {
                for (let i = 0; i < drive.interview_ids.length; i += 200) {
                    const chunk = drive.interview_ids.slice(i, i + 200);
                    const { error } = await supabase.from('interviews').delete().in('id', chunk);
                    if (error) throw error;
                }
            }

            // 3. Delete candidates
            if (drive.candidate_ids.length > 0) {
                for (let i = 0; i < drive.candidate_ids.length; i += 200) {
                    const chunk = drive.candidate_ids.slice(i, i + 200);
                    const { error } = await supabase.from('candidates').delete().in('id', chunk);
                    if (error) throw error;
                }
            }

            toast.success(`🗑️ Deleted all data for "${drive.description}"`, { id: toastId });
            setConfirmDelete(null);
            fetchStats(true);
        } catch (err) {
            console.error('Delete error:', err);
            toast.error('Delete failed: ' + err.message, { id: toastId });
        } finally {
            setDeletingDriveId(null);
        }
    };

    // ── Computed ──────────────────────────────────────────────────────────────
    const usedMB = stats ? (stats.estimatedBytes / (1024 * 1024)) : 0;
    const pct    = (usedMB / FREE_TIER_LIMIT_MB) * 100;
    const status = pct >= 90 ? 'critical' : pct >= 70 ? 'warning' : 'safe';

    // Sort drives oldest-first for "delete old ones first" suggestion
    const drivesSorted = [...drives].sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

    return (
        <SimpleLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                            <HardDrive className="text-cyan-400" size={24} />
                            Storage Manager
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Monitor Supabase usage · Download & delete old drives to free space
                        </p>
                    </div>
                    <button
                        onClick={() => fetchStats(true)}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-sm font-bold transition-all"
                    >
                        <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                            <p className="text-slate-500 text-sm">Calculating storage...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Storage Meter Card */}
                        <div className={`bg-white/[0.04] border rounded-2xl p-6 ${
                            status === 'critical' ? 'border-red-500/40 bg-red-500/5' :
                            status === 'warning'  ? 'border-amber-500/30 bg-amber-500/5' :
                            'border-white/10'
                        }`}>
                            <div className="flex items-start justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-xl border ${
                                        status === 'critical' ? 'bg-red-500/10 border-red-500/20' :
                                        status === 'warning'  ? 'bg-amber-500/10 border-amber-500/20' :
                                        'bg-cyan-500/10 border-cyan-500/20'
                                    }`}>
                                        <Database size={20} className={
                                            status === 'critical' ? 'text-red-400' :
                                            status === 'warning'  ? 'text-amber-400' :
                                            'text-cyan-400'
                                        } />
                                    </div>
                                    <div>
                                        <h2 className="text-white font-black text-lg">Supabase Free Tier</h2>
                                        <p className="text-slate-500 text-xs">Estimated database usage</p>
                                    </div>
                                </div>
                                {status === 'critical' && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg">
                                        <AlertTriangle size={14} className="text-red-400" />
                                        <span className="text-red-400 text-xs font-black">CRITICAL</span>
                                    </div>
                                )}
                                {status === 'warning' && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                        <AlertTriangle size={14} className="text-amber-400" />
                                        <span className="text-amber-400 text-xs font-black">WARNING</span>
                                    </div>
                                )}
                                {status === 'safe' && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                                        <CheckCircle2 size={14} className="text-emerald-400" />
                                        <span className="text-emerald-400 text-xs font-black">SAFE</span>
                                    </div>
                                )}
                            </div>

                            <StorageMeter usedMB={usedMB} limitMB={FREE_TIER_LIMIT_MB} />

                            {/* Note */}
                            <p className="text-slate-600 text-xs mt-4 flex items-center gap-1.5">
                                <Shield size={11} />
                                Estimated based on row counts. Actual size viewable in Supabase Dashboard → Settings → Usage.
                            </p>
                        </div>

                        {/* Row Breakdown */}
                        {stats && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                {[
                                    { label: 'Answers',    count: stats.counts.answers,    est: stats.counts.answers * BYTES_PER_ANSWER,    color: 'blue',   icon: FileText },
                                    { label: 'Interviews', count: stats.counts.interviews, est: stats.counts.interviews * BYTES_PER_INTERVIEW, color: 'purple', icon: Calendar },
                                    { label: 'Candidates', count: stats.counts.candidates, est: stats.counts.candidates * BYTES_PER_CANDIDATE, color: 'cyan',   icon: Users },
                                    { label: 'Questions',  count: stats.counts.questions,  est: stats.counts.questions * BYTES_PER_QUESTION,  color: 'amber',  icon: FileText },
                                    { label: 'Criteria',   count: stats.counts.criteria,   est: 0,                                            color: 'emerald',icon: Database },
                                ].map(({ label, count, est, color, icon: Icon }) => (
                                    <div key={label} className={`bg-${color}-500/5 border border-${color}-500/15 rounded-xl p-4 text-center`}>
                                        <Icon size={16} className={`text-${color}-400 mx-auto mb-2`} />
                                        <div className={`text-2xl font-black text-${color}-400`}>{count.toLocaleString()}</div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{label}</div>
                                        {est > 0 && <div className="text-[10px] text-slate-600 mt-1">~{formatBytes(est)}</div>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Drives Section */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-white font-black text-lg flex items-center gap-2">
                                    <Archive size={18} className="text-slate-400" />
                                    Interview Drives
                                </h2>
                                <div className="flex items-center gap-2 text-xs text-slate-500 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-1.5">
                                    <TrendingDown size={12} className="text-amber-400" />
                                    <span>Oldest drives shown first — download &amp; delete to free space</span>
                                </div>
                            </div>

                            {drivesSorted.length === 0 ? (
                                <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
                                    <Calendar size={40} className="text-slate-700 mx-auto mb-3" />
                                    <p className="text-slate-500">No drives found</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {drivesSorted.map((drive) => (
                                        <DriveRow
                                            key={drive.id}
                                            drive={drive}
                                            onDownload={handleDownload}
                                            onDelete={(d) => setConfirmDelete(d)}
                                            isDeleting={deletingDriveId === drive.id}
                                            isDownloading={downloadingDriveId === drive.id}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Tips */}
                        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-5">
                            <h3 className="text-blue-400 font-black text-sm mb-3 flex items-center gap-2">
                                💡 Storage Management Tips
                            </h3>
                            <ul className="space-y-2 text-slate-400 text-xs">
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-400 font-bold flex-shrink-0">1.</span>
                                    When storage crosses <span className="text-amber-400 font-bold mx-1">350 MB</span>, start downloading &amp; deleting oldest drives first.
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-400 font-bold flex-shrink-0">2.</span>
                                    Always <span className="text-cyan-400 font-bold mx-1">Download</span> a drive's data before deleting — it can't be recovered.
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-400 font-bold flex-shrink-0">3.</span>
                                    Questions &amp; Criteria are <span className="text-purple-400 font-bold mx-1">never deleted</span> by this tool — only interview results.
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-400 font-bold flex-shrink-0">4.</span>
                                    After deleting, go to <span className="text-blue-400 font-bold mx-1">Supabase SQL Editor</span> and run: <code className="bg-white/5 px-1.5 py-0.5 rounded font-mono">VACUUM ANALYZE;</code>
                                </li>
                            </ul>
                        </div>
                    </>
                )}
            </div>

            {/* Delete Confirm Modal */}
            <DeleteModal
                drive={confirmDelete}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setConfirmDelete(null)}
                isDeleting={!!deletingDriveId}
            />
        </SimpleLayout>
    );
}

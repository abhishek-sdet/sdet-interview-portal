import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleLayout from '@/components/admin/SimpleLayout';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Save, X, Calendar, Users, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManageDrives() {
    const navigate = useNavigate();
    const [drives, setDrives] = useState([]);
    const [criteria, setCriteria] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        criteria_id: '',
        scheduled_date: new Date().toISOString().split('T')[0],
        time_limit_minutes: 45,
        max_candidates: 100,
        description: '',
        is_active: true
    });

    useEffect(() => {
        fetchData();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('drives-stats-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'interviews' },
                () => {
                    setTimeout(() => fetchData(true), 1000);
                }
            )
            .subscribe();

        // Fallback polling
        const pollInterval = setInterval(() => {
            fetchData(true);
        }, 10000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };
    }, []);

    const fetchData = async (isBackgroundRefresh = false) => {
        if (!isBackgroundRefresh) {
            setLoading(true);
        }
        try {
            // 1. Fetch Drives
            const { data: drivesData, error: drivesError } = await supabase
                .from('scheduled_interviews')
                .select(`
                    *,
                    criteria(name)
                `)
                .order('scheduled_date', { ascending: false });

            if (drivesError) throw drivesError;

            // 2. Fetch ALL interviews linked to these drives to calculate stats
            const driveIds = drivesData.map(d => d.id);
            const { data: interviewsData, error: interviewsError } = await supabase
                .from('interviews')
                .select(`
                    id,
                    scheduled_interview_id,
                    status,
                    score,
                    total_questions,
                    criteria_id,
                    criteria(name, passing_percentage)
                `)
                .in('scheduled_interview_id', driveIds);

            if (interviewsError) throw interviewsError;

            // 3. Aggregate stats per drive
            const drivesWithStats = drivesData.map(drive => {
                const driveInterviews = interviewsData.filter(i => i.scheduled_interview_id === drive.id);

                const fresherInterviews = driveInterviews.filter(i => i.criteria?.name?.toLowerCase().includes('fresher'));
                const expInterviews = driveInterviews.filter(i => i.criteria?.name?.toLowerCase().includes('experienced'));

                const completed = driveInterviews.filter(i => i.status === 'completed');
                const qualified = completed.filter(i => {
                    const passing = i.criteria?.passing_percentage || 70;
                    const percentage = i.total_questions ? (i.score / i.total_questions) * 100 : 0;
                    return percentage >= passing;
                });

                // Status Logic
                const today = new Date().toISOString().split('T')[0];
                let statusLabel = 'INACTIVE';
                if (drive.scheduled_date < today) {
                    statusLabel = 'EXPIRED';
                } else if (drive.is_active) {
                    statusLabel = 'ACTIVE';
                }

                return {
                    ...drive,
                    fresher_count: fresherInterviews.length,
                    fresher_completed: fresherInterviews.filter(i => i.status === 'completed').length,
                    exp_count: expInterviews.length,
                    exp_completed: expInterviews.filter(i => i.status === 'completed').length,
                    total_completed: completed.length,
                    total_attempted: driveInterviews.length,
                    pass_ratio: completed.length > 0 ? Math.round((qualified.length / completed.length) * 100) : 0,
                    status_label: statusLabel
                };
            });

            setDrives(drivesWithStats);

            // Fetch Criteria (for selection)
            const { data: criteriaData, error: criteriaError } = await supabase
                .from('criteria')
                .select('*')
                .eq('is_active', true);

            if (criteriaError) throw criteriaError;
            setCriteria(criteriaData || []);

            if (criteriaData?.length > 0 && !formData.criteria_id) {
                setFormData(prev => ({ ...prev, criteria_id: criteriaData[0].id }));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load drive management data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            if (!formData.criteria_id) {
                toast.error('Please select a criteria');
                return;
            }

            const { error } = await supabase
                .from('scheduled_interviews')
                .insert([
                    {
                        criteria_id: formData.criteria_id,
                        scheduled_date: formData.scheduled_date,
                        time_limit_minutes: parseInt(formData.time_limit_minutes),
                        max_candidates: parseInt(formData.max_candidates),
                        description: formData.description.trim(),
                        is_active: formData.is_active
                    }
                ]);

            if (error) throw error;

            toast.success('Drive created successfully');
            setShowAddForm(false);
            fetchData();
        } catch (error) {
            console.error('Error creating drive:', error);
            toast.error('Failed to create drive');
        }
    };

    const handleToggleActive = async (drive) => {
        try {
            const { error } = await supabase
                .from('scheduled_interviews')
                .update({ is_active: !drive.is_active })
                .eq('id', drive.id);

            if (error) throw error;
            toast.success(`Drive ${!drive.is_active ? 'activated' : 'deactivated'}`);
            fetchData();
        } catch (error) {
            console.error('Error toggling drive status:', error);
            toast.error('Failed to update drive status');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this drive? Interviews linked to it will remain but without drive association.')) return;

        try {
            const { error } = await supabase
                .from('scheduled_interviews')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Drive deleted successfully');
            fetchData();
        } catch (error) {
            console.error('Error deleting drive:', error);
            toast.error('Failed to delete drive');
        }
    };

    return (
        <SimpleLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Drive Management</h1>
                        <p className="text-slate-400 text-sm mt-1">Organize assessments into batches or drives.</p>
                    </div>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                    >
                        {showAddForm ? <X size={18} /> : <Plus size={18} />}
                        {showAddForm ? 'Cancel' : 'New Drive'}
                    </button>
                </div>

                {/* Add Form */}
                {showAddForm && (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 animate-in slide-in-from-top duration-300">
                        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Batch Name / Description</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="e.g. Saturday Fresher Drive - Batch A"
                                    className="w-full bg-[#0b101b] border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-blue transition-colors"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Default Criteria</label>
                                <select
                                    value={formData.criteria_id}
                                    onChange={(e) => setFormData({ ...formData, criteria_id: e.target.value })}
                                    className="w-full bg-[#0b101b] border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-blue transition-colors"
                                    required
                                >
                                    {criteria.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Scheduled Date</label>
                                <input
                                    type="date"
                                    value={formData.scheduled_date}
                                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                                    className="w-full bg-[#0b101b] border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-blue transition-colors"
                                    required
                                />
                            </div>
                            <div className="lg:col-span-3 flex justify-end">
                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-brand-blue text-white rounded-xl font-bold hover:bg-blue-600 transition-all flex items-center gap-2"
                                >
                                    <Plus size={18} /> Create Drive
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Drives List */}
                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {drives.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center opacity-50">
                                <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                                <p>No drives created yet. Start by creating a Batch/Drive.</p>
                            </div>
                        ) : (
                            drives.map((drive) => (
                                <div
                                    key={drive.id}
                                    className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/[0.08] transition-all group relative cursor-pointer"
                                    onClick={() => navigate(`/admin/results?driveId=${drive.id}`)}
                                >
                                    <div className="flex flex-col md:flex-row justify-between gap-6">
                                        <div className="space-y-4 flex-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-brand-blue transition-colors">{drive.description || 'Unnamed Drive'}</h3>
                                                {drive.status_label === 'ACTIVE' && (
                                                    <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded text-[10px] font-black uppercase tracking-widest">Active</span>
                                                )}
                                                {drive.status_label === 'EXPIRED' && (
                                                    <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[10px] font-black uppercase tracking-widest">Expired</span>
                                                )}
                                                {drive.status_label === 'INACTIVE' && (
                                                    <span className="px-2 py-0.5 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded text-[10px] font-black uppercase tracking-widest">Inactive</span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Drive Date</p>
                                                    <p className="text-sm font-bold text-slate-200 flex items-center gap-2">
                                                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                                                        {new Date(drive.scheduled_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fresher (Comp/Total)</p>
                                                    <p className="text-sm font-bold text-blue-400">{drive.fresher_completed} / {drive.fresher_count}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Experienced (Comp/Total)</p>
                                                    <p className="text-sm font-bold text-purple-400">{drive.exp_completed} / {drive.exp_count}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Attempted</p>
                                                    <p className="text-sm font-bold text-slate-200 flex items-center gap-2">
                                                        <Users className="w-3.5 h-3.5" />
                                                        {drive.total_attempted}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pass Ratio</p>
                                                    <p className="text-sm font-bold text-brand-orange">
                                                        {drive.pass_ratio}%
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex md:flex-col items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleToggleActive(drive)}
                                                className={`w-full md:w-32 py-2 rounded-lg text-xs font-bold transition-all ${drive.is_active ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'}`}
                                            >
                                                {drive.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(drive.id)}
                                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="absolute right-6 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-bold text-blue-400">
                                        View Results <CheckCircle2 size={12} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </SimpleLayout>
    );
}

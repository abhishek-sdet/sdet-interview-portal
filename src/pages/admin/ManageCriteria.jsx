import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleLayout from '@/components/admin/SimpleLayout';
import { supabase } from '@/lib/supabase';
import { Edit2, Save, X, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManageCriteria() {
    const navigate = useNavigate();
    const [criteria, setCriteria] = useState([]);
    const [loading, setLoading] = useState(true);
    const [siteStatus, setSiteStatus] = useState(true);
    const [updatingSite, setUpdatingSite] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({
        name: '',
        sub_heading: '',
        description: '',
        timer_duration: '',
        passing_percentage: ''
    });

    // Fetch Criteria
    useEffect(() => {
        fetchCriteria();
        fetchSiteStatus();
    }, []);

    const fetchSiteStatus = async () => {
        try {
            const { data, error } = await supabase
                .from('site_settings')
                .select('is_site_active')
                .single();
            if (error) {
                if (error.code === '42P01') {
                    console.warn('site_settings table not found. Please run scripts/site_settings.sql');
                } else {
                    throw error;
                }
            } else if (data) {
                setSiteStatus(data.is_site_active);
            }
        } catch (error) {
            console.error('Error fetching site status:', error);
        }
    };

    const toggleSiteStatus = async () => {
        setUpdatingSite(true);
        try {
            const newStatus = !siteStatus;
            const { error } = await supabase
                .from('site_settings')
                .update({ is_site_active: newStatus })
                .eq('id', (await supabase.from('site_settings').select('id').single()).data.id);

            if (error) throw error;
            setSiteStatus(newStatus);
            toast.success(`Aspirant site ${newStatus ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Error updating site status:', error);
            toast.error('Failed to update site status. Ensure SQL script was run.');
        } finally {
            setUpdatingSite(false);
        }
    };

    const fetchCriteria = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('criteria')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setCriteria(data || []);
        } catch (error) {
            console.error('Error fetching criteria:', error);
            toast.error('Failed to load criteria');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (c) => {
        setEditingId(c.id);
        setEditForm({
            name: c.name,
            sub_heading: c.sub_heading || '',
            description: c.description || '',
            timer_duration: c.timer_duration || 45,
            passing_percentage: c.passing_percentage || 70
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm({
            name: '',
            sub_heading: '',
            description: '',
            timer_duration: '',
            passing_percentage: ''
        });
    };

    const handleSave = async (id) => {
        try {
            // Validate
            if (!editForm.name.trim()) {
                toast.error('Criteria name is required');
                return;
            }
            const duration = parseInt(editForm.timer_duration);
            if (isNaN(duration) || duration <= 0) {
                toast.error('Timer duration must be a positive number');
                return;
            }
            const passingPct = parseInt(editForm.passing_percentage);
            if (isNaN(passingPct) || passingPct < 0 || passingPct > 100) {
                toast.error('Passing percentage must be between 0 and 100');
                return;
            }

            const { error } = await supabase
                .from('criteria')
                .update({
                    name: editForm.name.trim(),
                    description: editForm.description?.trim(),
                    passing_percentage: passingPct,
                    sub_heading: editForm.sub_heading?.trim(),
                    timer_duration: duration,
                })
                .eq('id', id);

            if (error) throw error;

            toast.success('Criteria updated successfully');
            setEditingId(null);
            fetchCriteria(); // Refresh list
        } catch (error) {
            console.error('Error updating criteria:', error);
            // Check if error is due to missing column (if migration failed/skipped)
            if (error.message?.includes('timer_duration')) {
                toast.error('Database schema out of sync: "timer_duration" column missing. Please run migration in Supabase.');
            } else {
                toast.error('Failed to update criteria');
            }
        }
    };

    return (
        <SimpleLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Exam Configuration</h1>
                        <p className="text-slate-400 text-sm mt-1">Manage criteria, time limits, and rules.</p>
                    </div>

                    <div className="bg-[#0f172a]/80 backdrop-blur-md border border-slate-700/50 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-xl">
                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Aspirant Site Status</div>
                            <div className={`text-sm font-bold ${siteStatus ? 'text-green-400' : 'text-red-400'}`}>
                                {siteStatus ? 'ACTIVE & ONLINE' : 'OFFLINE / DISABLED'}
                            </div>
                        </div>
                        <button
                            onClick={toggleSiteStatus}
                            disabled={updatingSite}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${siteStatus ? 'bg-brand-blue' : 'bg-slate-700'}`}
                        >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${siteStatus ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {criteria.map((c) => (
                            <div key={c.id} className="bg-[#0f172a]/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 hover:border-brand-blue/30 transition-all">
                                {editingId === c.id ? (
                                    // Edit Mode
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1 block">Criteria Name</label>
                                            <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-blue"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1 block">Sub-Heading</label>
                                            <input
                                                type="text"
                                                value={editForm.sub_heading}
                                                onChange={(e) => setEditForm({ ...editForm, sub_heading: e.target.value })}
                                                className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-blue"
                                                placeholder="e.g. 0-2 years, No Testing"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1 block">Description</label>
                                            <textarea
                                                value={editForm.description}
                                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-blue h-20 resize-none"
                                                placeholder="Brief description of this level..."
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1 block">Timer Duration (Minutes)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={editForm.timer_duration}
                                                    onChange={(e) => setEditForm({ ...editForm, timer_duration: e.target.value })}
                                                    className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-blue pl-9"
                                                />
                                                <Clock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1">Set to 0 or leave empty for no limit (if supported)</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1 block">Passing Percentage (%)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={editForm.passing_percentage}
                                                    onChange={(e) => setEditForm({ ...editForm, passing_percentage: e.target.value })}
                                                    className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-blue pl-9"
                                                />
                                                <CheckCircle className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1">Minimum percentage required to pass</p>
                                        </div>
                                        <div className="flex gap-2 justify-end pt-2">
                                            <button
                                                onClick={handleCancel}
                                                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
                                            >
                                                <X size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleSave(c.id)}
                                                className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                                            >
                                                <Save size={16} /> Save
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // View Mode
                                    <>
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="font-semibold text-lg text-white pr-8 line-clamp-2">{c.name}</h3>
                                            <button
                                                onClick={() => handleEdit(c)}
                                                className="text-slate-400 hover:text-brand-blue p-1 rounded-lg hover:bg-brand-blue/10 transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </div>

                                        {(c.sub_heading || c.description) && (
                                            <div className="mb-4 space-y-2">
                                                {c.sub_heading && (
                                                    <div className="text-sm font-medium text-brand-blue">
                                                        {c.sub_heading}
                                                    </div>
                                                )}
                                                {c.description && (
                                                    <p className="text-xs text-slate-400 line-clamp-2">
                                                        {c.description}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-slate-300 bg-slate-800/50 rounded-lg px-3 py-2 w-fit">
                                                <Clock size={16} className="text-brand-blue" />
                                                <span className="text-sm font-medium">
                                                    {c.timer_duration ? `${c.timer_duration} mins` : 'Default (45m)'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-300 bg-green-900/30 rounded-lg px-3 py-2 w-fit">
                                                <CheckCircle size={16} className="text-green-400" />
                                                <span className="text-sm font-medium">
                                                    Pass at {c.passing_percentage || 70}%
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center text-xs text-slate-500">
                                            <span>ID: {c.id.slice(0, 8)}...</span>
                                            {c.created_at && (
                                                <span>{new Date(c.created_at).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </SimpleLayout>
    );
}

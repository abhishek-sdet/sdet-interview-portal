import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleLayout from '@/components/admin/SimpleLayout';
import ConfirmModal from '@/components/ConfirmModal';
import { supabase } from '@/lib/supabase';
import { Edit2, Save, X, Clock, AlertCircle, CheckCircle, Plus as PlusIcon, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManageCriteria() {
    const navigate = useNavigate();
    const [criteria, setCriteria] = useState([]);
    const [loading, setLoading] = useState(true);
    const [siteStatus, setSiteStatus] = useState(true);
    const [allowScreenshots, setAllowScreenshots] = useState(false);
    const [updatingSite, setUpdatingSite] = useState(false);
    const [updatingScreenshots, setUpdatingScreenshots] = useState(false);
    const [proctoringAutoSubmit, setProctoringAutoSubmit] = useState(true);
    const [updatingProctoring, setUpdatingProctoring] = useState(false);
    const [enforceFullScreen, setEnforceFullScreen] = useState(false);
    const [updatingFullScreen, setUpdatingFullScreen] = useState(false);
    const [shuffleQuestions, setShuffleQuestions] = useState(false);
    const [updatingShuffle, setUpdatingShuffle] = useState(false);
    const [allowInspect, setAllowInspect] = useState(false);
    const [updatingInspect, setUpdatingInspect] = useState(false);
    const [siteSettingsId, setSiteSettingsId] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // { id, name }
    const [editForm, setEditForm] = useState({
        name: '',
        sub_heading: '',
        description: '',
        timer_duration: '',
        passing_percentage: '',
        allow_multiple_attempts: false,
        module_counts: {
            testing: 10,
            api: 4,
            logical: 3,
            agile: 2,
            cs_basics: 2,
            grammar: 2,
            javascript: 2,
            elective: 7
        }
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
                .select('id, is_site_active, allow_screenshots, proctoring_auto_submit, enforce_full_screen, shuffle_questions, allow_inspect')
                .maybeSingle();

            if (error) {
                if (error.code === '42P01') {
                    console.warn('site_settings table not found. Please run scripts/site_settings.sql');
                } else {
                    throw error;
                }
            } else if (data) {
                setSiteSettingsId(data.id);
                setSiteStatus(data.is_site_active);
                setAllowScreenshots(data.allow_screenshots || false);
                setProctoringAutoSubmit(data.proctoring_auto_submit !== false);
                setEnforceFullScreen(data.enforce_full_screen || false);
                setShuffleQuestions(data.shuffle_questions || false);
                setAllowInspect(data.allow_inspect || false);
            } else {
                // No row exists - create one
                console.log('No site settings found. Creating default row...');
                const { data: newData, error: insertError } = await supabase
                    .from('site_settings')
                    .insert({ is_site_active: true, enforce_full_screen: false })
                    .select()
                    .single();
                
                if (insertError) throw insertError;
                if (newData) {
                    setSiteSettingsId(newData.id);
                    setSiteStatus(newData.is_site_active);
                }
            }
        } catch (error) {
            console.error('Error fetching site status:', error);
        }
    };

    const toggleScreenshotStatus = async () => {
        setUpdatingScreenshots(true);
        try {
            const newStatus = !allowScreenshots;
            const { error } = await supabase
                .from('site_settings')
                .update({ allow_screenshots: newStatus })
                .eq('id', siteSettingsId);

            if (error) throw error;
            setAllowScreenshots(newStatus);
            toast.success(`Screenshots ${newStatus ? 'Allowed' : 'Blocked'}`);
        } catch (error) {
            console.error('Error updating screenshot status:', error);
            // Ignore missing column errors gracefully for legacy compatibility
            if (error.message?.includes('allow_screenshots')) {
                toast.error('Database schema out of sync: "allow_screenshots" column missing.');
            } else {
                toast.error('Failed to update screenshot status.');
            }
        } finally {
            setUpdatingScreenshots(false);
        }
    };
 
    const toggleProctoringStatus = async () => {
        setUpdatingProctoring(true);
        try {
            const newStatus = !proctoringAutoSubmit;
            const { error } = await supabase
                .from('site_settings')
                .update({ proctoring_auto_submit: newStatus })
                .eq('id', siteSettingsId);
 
            if (error) throw error;
            setProctoringAutoSubmit(newStatus);
            toast.success(`Security Auto-Submit ${newStatus ? 'Enabled' : 'Disabled'}`);
        } catch (error) {
            console.error('Error updating proctoring status:', error);
            if (error.message?.includes('proctoring_auto_submit')) {
                toast.error('Database schema out of sync: "proctoring_auto_submit" column missing.');
            } else {
                toast.error('Failed to update proctoring status.');
            }
        } finally {
            setUpdatingProctoring(false);
        }
    };

    const toggleFullScreenStatus = async () => {
        setUpdatingFullScreen(true);
        try {
            const newStatus = !enforceFullScreen;
            const { error } = await supabase
                .from('site_settings')
                .update({ enforce_full_screen: newStatus })
                .eq('id', siteSettingsId);

            if (error) throw error;
            setEnforceFullScreen(newStatus);
            toast.success(`Full Screen mode ${newStatus ? 'Enforced' : 'Optional'}`);
        } catch (error) {
            console.error('Error updating full screen status:', error);
            if (error.message?.includes('enforce_full_screen')) {
                toast.error('Database schema out of sync: "enforce_full_screen" column missing. Run the script scripts/add_fullscreen_setting.sql');
            } else {
                toast.error('Failed to update full screen status.');
            }
        } finally {
            setUpdatingFullScreen(false);
        }
    };

    const toggleShuffleStatus = async () => {
        setUpdatingShuffle(true);
        try {
            const newStatus = !shuffleQuestions;
            const { error } = await supabase
                .from('site_settings')
                .update({ shuffle_questions: newStatus })
                .eq('id', siteSettingsId);

            if (error) throw error;
            setShuffleQuestions(newStatus);
            toast.success(`Question shuffling ${newStatus ? 'Enabled' : 'Disabled'}`);
        } catch (error) {
            console.error('Error updating shuffle status:', error);
            if (error.message?.includes('shuffle_questions')) {
                toast.error('Database schema out of sync: "shuffle_questions" column missing. Run the script scripts/add_shuffle_setting.sql');
            } else {
                toast.error('Failed to update shuffle status.');
            }
        } finally {
            setUpdatingShuffle(false);
        }
    };

    const toggleInspectStatus = async () => {
        setUpdatingInspect(true);
        try {
            const newStatus = !allowInspect;
            const { error } = await supabase
                .from('site_settings')
                .update({ allow_inspect: newStatus })
                .eq('id', siteSettingsId);

            if (error) throw error;
            setAllowInspect(newStatus);
            toast.success(`Developer Tools ${newStatus ? 'Allowed' : 'Blocked'}`);
        } catch (error) {
            console.error('Error updating inspect status:', error);
            toast.error('Failed to update developer tools status.');
        } finally {
            setUpdatingInspect(false);
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
                .neq('name', 'Both') // Hide 'Both' from configuration page as it's only for drive routing
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

    const normalizeModuleCounts = (counts) => {
        if (!counts) return { testing: 10, api: 4, logical: 3, agile: 2, cs_basics: 2, grammar: 2, javascript: 2, elective: 7 };
        if (Array.isArray(counts)) {
            const obj = {};
            counts.forEach(mod => {
                obj[mod.id] = mod.count || 0;
            });
            return obj;
        }
        return counts;
    };

    const handleEdit = (c) => {
        setIsAdding(false);
        setEditingId(c.id);
        setEditForm({
            name: c.name,
            sub_heading: c.sub_heading || '',
            description: c.description || '',
            timer_duration: c.timer_duration || 45,
            passing_percentage: c.passing_percentage || 70,
            allow_multiple_attempts: c.allow_multiple_attempts || false,
            module_counts: normalizeModuleCounts(c.metadata?.module_counts)
        });
    };

    const handleAddNew = () => {
        setEditingId(null);
        setIsAdding(true);
        setEditForm({
            name: '',
            sub_heading: '',
            description: '',
            timer_duration: 30,
            passing_percentage: 50,
            allow_multiple_attempts: false,
            module_counts: {
                testing: 10,
                api: 4,
                logical: 3,
                agile: 2,
                cs_basics: 2,
                grammar: 2,
                javascript: 2,
                elective: 7
            }
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setIsAdding(false);
        setEditForm({
            name: '',
            sub_heading: '',
            description: '',
            timer_duration: '',
            passing_percentage: '',
            allow_multiple_attempts: false,
            module_counts: normalizeModuleCounts(criteria.metadata?.module_counts)
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

            if (isAdding) {
                const { error } = await supabase
                    .from('criteria')
                    .insert({
                        name: editForm.name.trim(),
                        description: editForm.description?.trim(),
                        passing_percentage: passingPct,
                        sub_heading: editForm.sub_heading?.trim(),
                        timer_duration: duration,
                        allow_multiple_attempts: editForm.allow_multiple_attempts,
                        metadata: { module_counts: editForm.module_counts },
                        is_active: true
                    });

                if (error) throw error;
                toast.success('New Assessment created successfully');
            } else {
                const { error } = await supabase
                    .from('criteria')
                    .update({
                        name: editForm.name.trim(),
                        description: editForm.description?.trim(),
                        passing_percentage: passingPct,
                        sub_heading: editForm.sub_heading?.trim(),
                        timer_duration: duration,
                        allow_multiple_attempts: editForm.allow_multiple_attempts,
                        metadata: { module_counts: editForm.module_counts }
                    })
                    .eq('id', id);

                if (error) throw error;
                toast.success('Criteria updated successfully');
            }

            setEditingId(null);
            setIsAdding(false);
            fetchCriteria(); // Refresh list
        } catch (error) {
            console.error('Error saving criteria:', error);
            toast.error('Failed to save criteria');
        }
    };

    const handleDelete = async (id, name) => {
        setShowDeleteConfirm({ id, name });
    };

    const confirmDelete = async () => {
        if (!showDeleteConfirm) return;
        const { id, name } = showDeleteConfirm;
        
        try {
            const { error } = await supabase
                .from('criteria')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success(`Assessment "${name}" deleted successfully`);
            fetchCriteria();
        } catch (error) {
            console.error('Error deleting criteria:', error);
            toast.error('Failed to delete assessment');
        } finally {
            setShowDeleteConfirm(null);
        }
    };

    return (
        <SimpleLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Exam Configuration</h1>
                        <p className="text-slate-500 text-sm mt-1">Manage exam formats, cutoffs, and time limits</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 lg:grid-cols-3 gap-3 mt-4">
                        {/* Screenshots Toggle */}
                        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-xl group hover:bg-white/[0.08] transition-all min-h-[110px]">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed mb-3">Screenshot Block</div>
                            <div className="flex justify-between mt-auto gap-1 items-end">
                                <div className={`text-[9px] font-bold leading-tight ${!allowScreenshots ? 'text-amber-400' : 'text-slate-400'}`}>
                                    {!allowScreenshots ? 'ENABLED (SECURE)' : 'DISABLED (ALLOW)'}
                                </div>
                                <button
                                    onClick={toggleScreenshotStatus}
                                    disabled={updatingScreenshots}
                                    className={`relative inline-flex h-3.5 w-6 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${!allowScreenshots ? 'bg-amber-500' : 'bg-slate-700'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${!allowScreenshots ? 'translate-x-2.5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>

                        {/* Proctoring Toggle */}
                        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-xl group hover:bg-white/[0.08] transition-all min-h-[110px]">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed mb-3">Strict Proctoring</div>
                            <div className="flex justify-between mt-auto gap-1 items-end">
                                <div className={`text-[9px] font-bold leading-tight ${proctoringAutoSubmit ? 'text-red-400' : 'text-slate-400'}`}>
                                    {proctoringAutoSubmit ? 'ENABLED (STRICT)' : 'DISABLED (OPEN)'}
                                </div>
                                <button
                                    onClick={toggleProctoringStatus}
                                    disabled={updatingProctoring}
                                    className={`relative inline-flex h-3.5 w-6 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${proctoringAutoSubmit ? 'bg-red-500' : 'bg-slate-700'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${proctoringAutoSubmit ? 'translate-x-2.5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>

                        {/* Full Screen Mode Toggle */}
                        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-xl group hover:bg-white/[0.08] transition-all min-h-[110px]">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed mb-3">Full Screen Mode</div>
                            <div className="flex justify-between mt-auto gap-1 items-end">
                                <div className={`text-[9px] font-bold leading-tight ${enforceFullScreen ? 'text-purple-400' : 'text-slate-400'}`}>
                                    {enforceFullScreen ? 'STRICT (ENFORCED)' : 'OPTIONAL (RELAXED)'}
                                </div>
                                <button
                                    onClick={toggleFullScreenStatus}
                                    disabled={updatingFullScreen}
                                    className={`relative inline-flex h-3.5 w-6 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enforceFullScreen ? 'bg-purple-500' : 'bg-slate-700'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enforceFullScreen ? 'translate-x-2.5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>

                        {/* Shuffle Toggle */}
                        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-xl group hover:bg-white/[0.08] transition-all min-h-[110px]">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed mb-3">Shuffle Questions</div>
                            <div className="flex justify-between mt-auto gap-1 items-end">
                                <div className={`text-[9px] font-bold leading-tight ${shuffleQuestions ? 'text-indigo-400' : 'text-slate-400'}`}>
                                    {shuffleQuestions ? 'ENABLED (RANDOM)' : 'DISABLED (ORDERED)'}
                                </div>
                                <button
                                    onClick={toggleShuffleStatus}
                                    disabled={updatingShuffle}
                                    className={`relative inline-flex h-3.5 w-6 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${shuffleQuestions ? 'bg-indigo-500' : 'bg-slate-700'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${shuffleQuestions ? 'translate-x-2.5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>

                        {/* Developer Mode Toggle */}
                        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-xl group hover:bg-white/[0.08] transition-all min-h-[110px]">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed mb-3">Dev Tools Block</div>
                            <div className="flex justify-between mt-auto gap-1 items-end">
                                <div className={`text-[9px] font-bold leading-tight ${!allowInspect ? 'text-pink-400' : 'text-slate-400'}`}>
                                    {!allowInspect ? 'ENABLED (SECURE)' : 'DISABLED (ALLOW)'}
                                </div>
                                <button
                                    onClick={toggleInspectStatus}
                                    disabled={updatingInspect}
                                    className={`relative inline-flex h-3.5 w-6 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${!allowInspect ? 'bg-pink-500' : 'bg-slate-700'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${!allowInspect ? 'translate-x-2.5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-xl group hover:bg-white/[0.08] transition-all min-h-[110px]">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed mb-3">Aspirant Site Status</div>
                            <div className="flex justify-between mt-auto gap-1 items-end">
                                <div className={`text-[9px] font-bold leading-tight ${siteStatus ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {siteStatus ? 'ACTIVE & ONLINE' : 'OFFLINE / DISABLED'}
                                </div>
                                <button
                                    onClick={toggleSiteStatus}
                                    disabled={updatingSite}
                                    className={`relative inline-flex h-3.5 w-6 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${siteStatus ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${siteStatus ? 'translate-x-2.5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Add New Assessment Button Card */}
                        <button 
                            onClick={handleAddNew}
                            disabled={isAdding}
                            className="bg-brand-blue/5 border-2 border-dashed border-brand-blue/30 rounded-xl p-8 flex flex-col items-center justify-center gap-4 hover:bg-brand-blue/10 hover:border-brand-blue/50 transition-all group min-h-[250px]"
                        >
                            <div className="w-12 h-12 rounded-full bg-brand-blue/20 flex items-center justify-center text-brand-blue group-hover:scale-110 transition-transform">
                                <PlusIcon size={24} />
                            </div>
                            <div className="text-center">
                                <h3 className="font-bold text-white tracking-tight">Add New Assessment</h3>
                                <p className="text-xs text-slate-400 mt-2">Create new criteria like Fresher / Experienced</p>
                            </div>
                        </button>

                        {/* Add Form (Visible when isAdding is true) */}
                        {isAdding && (
                            <div className="bg-brand-blue/10 border-2 border-brand-blue/50 rounded-xl p-5 shadow-2xl shadow-brand-blue/10 ring-2 ring-brand-blue/20">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-white uppercase text-xs tracking-widest text-brand-blue">Create Assessment</h3>
                                        <span className="px-2 py-0.5 bg-brand-blue/20 text-brand-blue text-[10px] rounded-full font-bold uppercase animate-pulse">New Draft</span>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Criteria Name</label>
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-blue"
                                            placeholder="e.g. SDET II"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Sub-Heading</label>
                                        <input
                                            type="text"
                                            value={editForm.sub_heading}
                                            onChange={(e) => setEditForm({ ...editForm, sub_heading: e.target.value })}
                                            className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-blue"
                                            placeholder="e.g. Experienced in QA Automation"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Description</label>
                                        <textarea
                                            value={editForm.description}
                                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                            className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-blue h-20 resize-none text-[12px]"
                                            placeholder="What skills are tested here?"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1 block">Time (Mins)</label>
                                            <input
                                                type="number"
                                                value={editForm.timer_duration}
                                                onChange={(e) => setEditForm({ ...editForm, timer_duration: e.target.value })}
                                                className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-blue"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1 block">Pass (%)</label>
                                            <input
                                                type="number"
                                                value={editForm.passing_percentage}
                                                onChange={(e) => setEditForm({ ...editForm, passing_percentage: e.target.value })}
                                                className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-blue"
                                            />
                                        </div>
                                    </div>
                                    <div className="border border-slate-700/50 rounded-lg p-3 space-y-3 bg-black/20">
                                        <div className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-widest">Question Counts</div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-[10px] text-slate-400 mb-1 block">Testing</label>
                                                <input type="number" value={editForm.module_counts.testing} onChange={(e) => setEditForm({ ...editForm, module_counts: { ...editForm.module_counts, testing: parseInt(e.target.value) || 0 } })} className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-brand-blue" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 mb-1 block">API</label>
                                                <input type="number" value={editForm.module_counts.api} onChange={(e) => setEditForm({ ...editForm, module_counts: { ...editForm.module_counts, api: parseInt(e.target.value) || 0 } })} className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-brand-blue" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 mb-1 block">Logical</label>
                                                <input type="number" value={editForm.module_counts.logical} onChange={(e) => setEditForm({ ...editForm, module_counts: { ...editForm.module_counts, logical: parseInt(e.target.value) || 0 } })} className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-brand-blue" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 mb-1 block">Agile</label>
                                                <input type="number" value={editForm.module_counts.agile} onChange={(e) => setEditForm({ ...editForm, module_counts: { ...editForm.module_counts, agile: parseInt(e.target.value) || 0 } })} className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-brand-blue" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 mb-1 block">CS Basics</label>
                                                <input type="number" value={editForm.module_counts.cs_basics} onChange={(e) => setEditForm({ ...editForm, module_counts: { ...editForm.module_counts, cs_basics: parseInt(e.target.value) || 0 } })} className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-brand-blue" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 mb-1 block">Grammar</label>
                                                <input type="number" value={editForm.module_counts.grammar} onChange={(e) => setEditForm({ ...editForm, module_counts: { ...editForm.module_counts, grammar: parseInt(e.target.value) || 0 } })} className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-brand-blue" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 mb-1 block">JavaScript (JS)</label>
                                                <input type="number" value={editForm.module_counts.javascript || 0} onChange={(e) => setEditForm({ ...editForm, module_counts: { ...editForm.module_counts, javascript: parseInt(e.target.value) || 0 } })} className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-brand-blue" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 mb-1 block">Elective</label>
                                                <input type="number" value={editForm.module_counts.elective} onChange={(e) => setEditForm({ ...editForm, module_counts: { ...editForm.module_counts, elective: parseInt(e.target.value) || 0 } })} className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-brand-blue" />
                                            </div>
                                            <div className="flex items-end justify-center pb-1">
                                                <div className="text-xs text-brand-blue font-bold">Total: {Object.values(editForm.module_counts).reduce((a,b) => a+b, 0)}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 flex items-center justify-between">
                                        <div>
                                            <div className="text-xs font-bold text-amber-500 tracking-wider flex items-center gap-2">
                                                <AlertCircle size={12} /> OFFICE MODE
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-1">Allow same email/device multiple times</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setEditForm(prev => ({ ...prev, allow_multiple_attempts: !prev.allow_multiple_attempts }))}
                                            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${editForm.allow_multiple_attempts ? 'bg-amber-500' : 'bg-slate-700'}`}
                                        >
                                            <span className={`pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${editForm.allow_multiple_attempts ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                    <div className="flex gap-2 justify-end pt-2">
                                        <button
                                            onClick={handleCancel}
                                            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
                                        >
                                            <X size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleSave()}
                                            className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg text-sm font-bold hover:bg-blue-600 shadow-lg shadow-brand-blue/20"
                                        >
                                            <Save size={16} /> Create
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                        <div className="border border-slate-700/50 rounded-lg p-3 space-y-3 bg-black/20">
                                            <div className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-widest">Question Counts</div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] text-slate-400 mb-1 block">Testing</label>
                                                    <input type="number" value={editForm.module_counts.testing} onChange={(e) => setEditForm({ ...editForm, module_counts: { ...editForm.module_counts, testing: parseInt(e.target.value) || 0 } })} className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-brand-blue" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-400 mb-1 block">API</label>
                                                    <input type="number" value={editForm.module_counts.api} onChange={(e) => setEditForm({ ...editForm, module_counts: { ...editForm.module_counts, api: parseInt(e.target.value) || 0 } })} className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-brand-blue" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-400 mb-1 block">Logical</label>
                                                    <input type="number" value={editForm.module_counts.logical} onChange={(e) => setEditForm({ ...editForm, module_counts: { ...editForm.module_counts, logical: parseInt(e.target.value) || 0 } })} className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-brand-blue" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-400 mb-1 block">Agile</label>
                                                    <input type="number" value={editForm.module_counts.agile} onChange={(e) => setEditForm({ ...editForm, module_counts: { ...editForm.module_counts, agile: parseInt(e.target.value) || 0 } })} className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-brand-blue" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-400 mb-1 block">CS Basics</label>
                                                    <input type="number" value={editForm.module_counts.cs_basics} onChange={(e) => setEditForm({ ...editForm, module_counts: { ...editForm.module_counts, cs_basics: parseInt(e.target.value) || 0 } })} className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-brand-blue" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-400 mb-1 block">Grammar</label>
                                                    <input type="number" value={editForm.module_counts.grammar} onChange={(e) => setEditForm({ ...editForm, module_counts: { ...editForm.module_counts, grammar: parseInt(e.target.value) || 0 } })} className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-brand-blue" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-400 mb-1 block">JavaScript (JS)</label>
                                                    <input type="number" value={editForm.module_counts.javascript || 0} onChange={(e) => setEditForm({ ...editForm, module_counts: { ...editForm.module_counts, javascript: parseInt(e.target.value) || 0 } })} className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-brand-blue" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-400 mb-1 block">Elective</label>
                                                    <input type="number" value={editForm.module_counts.elective} onChange={(e) => setEditForm({ ...editForm, module_counts: { ...editForm.module_counts, elective: parseInt(e.target.value) || 0 } })} className="w-full bg-[#0b101b] border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-brand-blue" />
                                                </div>
                                                <div className="flex items-end justify-start pb-1">
                                                    <div className="text-xs text-brand-blue font-bold">Total: {Object.values(editForm.module_counts).reduce((a,b) => a+b, 0)}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 flex items-center justify-between">
                                            <div>
                                                <div className="text-xs font-bold text-amber-500 tracking-wider flex items-center gap-2">
                                                    <AlertCircle size={12} /> OFFICE MODE
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-1">Allow same email/device multiple times</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setEditForm(prev => ({ ...prev, allow_multiple_attempts: !prev.allow_multiple_attempts }))}
                                                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${editForm.allow_multiple_attempts ? 'bg-amber-500' : 'bg-slate-700'}`}
                                            >
                                                <span className={`pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${editForm.allow_multiple_attempts ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </button>
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
                                            <div className="flex gap-2 shrink-0">
                                                <button
                                                    onClick={() => handleEdit(c)}
                                                    className="text-slate-400 hover:text-brand-blue p-1 rounded-lg hover:bg-brand-blue/10 transition-colors"
                                                    title="Edit Criteria"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(c.id, c.name)}
                                                    className="text-slate-400 hover:text-red-400 p-1 rounded-lg hover:bg-red-400/10 transition-colors"
                                                    title="Delete Criteria"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {c.allow_multiple_attempts && (
                                            <div className="mb-3">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-widest rounded">
                                                    <AlertCircle size={10} /> Office Mode Active
                                                </span>
                                            </div>
                                        )}

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
                                            {c.metadata?.module_counts && (
                                                <div className="flex items-center gap-2 text-slate-300 bg-brand-blue/10 rounded-lg px-3 py-2 w-fit">
                                                    <span className="text-sm font-medium text-brand-blue">
                                                        Total Qs: {Object.values(normalizeModuleCounts(c.metadata.module_counts)).reduce((a,b) => a+b, 0)}
                                                    </span>
                                                </div>
                                            )}
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

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <ConfirmModal
                    isOpen={!!showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(null)}
                    onConfirm={confirmDelete}
                    title="Delete Assessment"
                    message={`Are you sure you want to delete the "${showDeleteConfirm.name}" assessment? This will permanently remove all associated settings and history. This action cannot be undone.`}
                    confirmText="Delete Assessment"
                    type="danger"
                />
            )}
        </SimpleLayout>
    );
}

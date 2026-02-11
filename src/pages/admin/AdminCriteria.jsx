import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2, Save, X, CheckCircle, XCircle, Power, FileText } from 'lucide-react';
import { showToast } from '@/components/Toast';

export default function AdminCriteria() {
    const [criteria, setCriteria] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        passing_percentage: 70,
        timer_duration: null,
        is_active: true,
        is_enabled: true
    });
    // Removed error and success states - using toast notifications instead

    useEffect(() => {
        fetchCriteria();
    }, []);

    const fetchCriteria = async () => {
        try {
            setLoading(true);

            // Fetch criteria
            const { data, error } = await supabase
                .from('criteria')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch today's scheduled interviews to get time limits
            const today = new Date().toISOString().split('T')[0];
            const { data: scheduledData, error: schedError } = await supabase
                .from('scheduled_interviews')
                .select('criteria_id, time_limit_minutes')
                .eq('scheduled_date', today)
                .eq('is_active', true);

            if (schedError) console.error('Error fetching schedules:', schedError);

            // Create a map of criteria_id to time_limit_minutes
            const scheduledMap = {};
            if (scheduledData) {
                scheduledData.forEach(sched => {
                    scheduledMap[sched.criteria_id] = sched.time_limit_minutes;
                });
            }

            // Merge scheduled time limits with criteria
            const enrichedCriteria = (data || []).map(criterion => ({
                ...criterion,
                scheduled_time_limit: scheduledMap[criterion.id] || null
            }));

            setCriteria(enrichedCriteria);
        } catch (err) {
            showToast.error('Failed to load criteria');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingId) {
                // Update existing criteria
                const { error } = await supabase
                    .from('criteria')
                    .update(formData)
                    .eq('id', editingId);

                if (error) throw error;
                showToast.success('Criteria updated successfully!');
            } else {
                // Create new criteria
                const { error } = await supabase
                    .from('criteria')
                    .insert([formData]);

                if (error) throw error;
                showToast.success('Criteria created successfully!');
            }

            // Reset form and refresh list
            resetForm();
            fetchCriteria();
        } catch (err) {
            showToast.error(err.message || 'Failed to save criteria');
            console.error(err);
        }
    };

    const handleEdit = (item) => {
        setFormData({
            name: item.name,
            description: item.description,
            passing_percentage: item.passing_percentage,
            timer_duration: item.timer_duration,
            is_active: item.is_active,
            is_enabled: item.is_enabled ?? true
        });
        setEditingId(item.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this criteria?')) return;

        try {
            const { error } = await supabase
                .from('criteria')
                .update({ is_active: false })
                .eq('id', id);

            if (error) throw error;
            showToast.success('Criteria deactivated successfully!');
            fetchCriteria();
        } catch (err) {
            showToast.error('Failed to delete criteria');
            console.error(err);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            passing_percentage: 70,
            timer_duration: null,
            is_active: true,
            is_enabled: true
        });
        setEditingId(null);
        setShowForm(false);
    };

    // Toggle criteria enabled/disabled status
    const handleToggleEnabled = async (id, currentStatus) => {
        try {
            const { error } = await supabase
                .from('criteria')
                .update({ is_enabled: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            showToast.success(`Criteria ${!currentStatus ? 'enabled' : 'disabled'} successfully!`);
            fetchCriteria();
        } catch (err) {
            showToast.error('Failed to toggle criteria status');
            console.error(err);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Criteria Management</h2>
                    <p className="text-slate-400">Manage interview criteria and passing requirements</p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="glass-button-primary flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Add New Criteria
                    </button>
                )}
            </div>

            {/* Create/Edit Form */}
            {showForm && (
                <div className="glass-panel rounded-2xl p-8 animate-fade-in-up">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <div className="p-2 bg-cyan-500/20 rounded-lg">
                                {editingId ? <Edit2 size={20} className="text-cyan-400" /> : <Plus size={20} className="text-cyan-400" />}
                            </div>
                            {editingId ? 'Edit Criteria' : 'Create New Criteria'}
                        </h3>
                        <button
                            onClick={resetForm}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2 uppercase tracking-wide">
                                    Criteria Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="glass-input px-4"
                                    placeholder="e.g., Fresher (0-2 years)"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2 uppercase tracking-wide">
                                    Passing Percentage <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={formData.passing_percentage}
                                        onChange={(e) => setFormData({ ...formData, passing_percentage: parseInt(e.target.value) })}
                                        className="glass-input px-4 font-mono"
                                        required
                                    />
                                    <span className="absolute right-4 top-3.5 text-slate-500">%</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2 uppercase tracking-wide">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="glass-input px-4 min-h-[100px]"
                                placeholder="Describe the criteria..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2 uppercase tracking-wide">
                                Interview Duration (minutes)
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.timer_duration || ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    timer_duration: e.target.value ? parseInt(e.target.value) : null
                                })}
                                className="glass-input px-4 font-mono"
                                placeholder="Leave empty for no time limit"
                            />
                            <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Set interview time limit in minutes. Leave empty for unlimited time.
                            </p>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6 p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                                    <span className="ml-3 text-sm font-medium text-slate-300">Active (internal)</span>
                                </label>
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_enabled}
                                        onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                                    <span className="ml-3 text-sm font-medium text-slate-300">Enabled (Aspirant App)</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-white/10">
                            <button
                                type="submit"
                                className="glass-button-primary flex items-center gap-2"
                            >
                                <Save size={18} />
                                {editingId ? 'Update Criteria' : 'Create Criteria'}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="glass-button"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Criteria List */}
            <div className="glass-panel rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400 mx-auto"></div>
                        <p className="text-slate-400 mt-4">Loading criteria...</p>
                    </div>
                ) : criteria.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText size={40} className="text-slate-600" />
                        </div>
                        <p className="text-white text-xl font-bold mb-2">No criteria found</p>
                        <p className="text-slate-400 text-sm mb-6">Create your first criteria to get started</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="glass-button-primary inline-flex items-center gap-2"
                        >
                            <Plus size={18} />
                            Create Criteria
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/10">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Description
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Passing %
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Duration
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Visibility
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {criteria.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="text-white font-medium group-hover:text-cyan-400 transition-colors">{item.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-400 text-sm max-w-xs truncate">
                                                {item.description || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-cyan-400 font-mono font-bold">
                                                {item.passing_percentage}%
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-300 text-sm flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
                                                {item.scheduled_time_limit
                                                    ? `${item.scheduled_time_limit} min`
                                                    : (item.timer_duration ? `${item.timer_duration} min` : 'No limit')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.is_active ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleEnabled(item.id, item.is_enabled ?? true)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-transparent ${(item.is_enabled ?? true) ? 'bg-cyan-500' : 'bg-slate-700'
                                                    }`}
                                                title={(item.is_enabled ?? true) ? 'Visible in aspirant app' : 'Hidden from aspirant app'}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(item.is_enabled ?? true) ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-all"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

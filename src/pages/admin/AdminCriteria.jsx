import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2, Save, X, CheckCircle, XCircle, Power } from 'lucide-react';
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
            const { data, error } = await supabase
                .from('criteria')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCriteria(data || []);
        } catch (err) {
            showToast.error('Failed to load criteria');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-cyan-400 mb-2">Criteria Management</h2>
                    <p className="text-slate-400">Manage interview criteria and passing requirements</p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-all"
                    >
                        <Plus size={20} />
                        Add New Criteria
                    </button>
                )}
            </div>



            {/* Create/Edit Form */}
            {showForm && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-white">
                            {editingId ? 'Edit Criteria' : 'Create New Criteria'}
                        </h3>
                        <button
                            onClick={resetForm}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Criteria Name <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                placeholder="e.g., Fresher (0-2 years)"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 min-h-[80px]"
                                placeholder="Describe the criteria..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Passing Percentage <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={formData.passing_percentage}
                                onChange={(e) => setFormData({ ...formData, passing_percentage: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
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
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                placeholder="Leave empty for no time limit"
                            />
                            <p className="mt-1 text-xs text-slate-400">
                                Set interview time limit in minutes. Leave empty for unlimited time.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="w-4 h-4 rounded border-white/10 bg-white/5 text-cyan-500 focus:ring-cyan-400"
                            />
                            <label htmlFor="is_active" className="text-sm text-slate-300">
                                Active (visible to candidates)
                            </label>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_enabled"
                                checked={formData.is_enabled}
                                onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                                className="w-4 h-4 rounded border-white/10 bg-white/5 text-cyan-500 focus:ring-cyan-400"
                            />
                            <label htmlFor="is_enabled" className="text-sm text-slate-300">
                                Enabled (show in aspirant app)
                            </label>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                className="flex items-center gap-2 px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-all"
                            >
                                <Save size={18} />
                                {editingId ? 'Update' : 'Create'}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Criteria List */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400 mx-auto"></div>
                        <p className="text-slate-400 mt-4">Loading criteria...</p>
                    </div>
                ) : criteria.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-slate-400 text-lg">No criteria found</p>
                        <p className="text-slate-500 text-sm mt-2">Click "Add New Criteria" to create one</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                        Description
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                        Passing %
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                        Duration
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                        Visibility
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {criteria.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-white font-medium">{item.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-400 text-sm max-w-md truncate">
                                                {item.description || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-cyan-400 font-semibold">
                                                {item.passing_percentage}%
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-300 text-sm">
                                                {item.timer_duration ? `${item.timer_duration} min` : 'No limit'}
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
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(item.is_enabled ?? true) ? 'bg-cyan-500' : 'bg-slate-600'
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
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="p-2 text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-all"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
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

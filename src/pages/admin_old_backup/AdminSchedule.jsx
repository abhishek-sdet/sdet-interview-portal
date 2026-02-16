import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, Users, Plus, Edit2, Trash2, X, Save, Filter } from 'lucide-react';
import { showToast } from '@/components/Toast';

export default function AdminSchedule() {
    const [schedules, setSchedules] = useState([]);
    const [criteria, setCriteria] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [formData, setFormData] = useState({
        criteria_id: '',
        scheduled_date: '',
        time_limit_minutes: 30,
        max_candidates: null,
        description: '',
        is_active: true
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch criteria
            const { data: criteriaData, error: criteriaError } = await supabase
                .from('criteria')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (criteriaError) throw criteriaError;
            setCriteria(criteriaData || []);

            // Fetch scheduled interviews
            const { data: schedulesData, error: schedulesError } = await supabase
                .from('scheduled_interviews_view')
                .select('*')
                .order('scheduled_date', { ascending: false });

            if (schedulesError) throw schedulesError;
            setSchedules(schedulesData || []);
        } catch (err) {
            console.error('Error fetching data:', err);
            showToast.error('Failed to load schedules');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const payload = {
                criteria_id: formData.criteria_id,
                scheduled_date: formData.scheduled_date,
                time_limit_minutes: parseInt(formData.time_limit_minutes),
                max_candidates: formData.max_candidates ? parseInt(formData.max_candidates) : null,
                description: formData.description,
                is_active: formData.is_active
            };

            if (editingId) {
                const { error } = await supabase
                    .from('scheduled_interviews')
                    .update(payload)
                    .eq('id', editingId);

                if (error) throw error;
                showToast.success('Schedule updated successfully');
            } else {
                const { error } = await supabase
                    .from('scheduled_interviews')
                    .insert([payload]);

                if (error) throw error;
                showToast.success('Schedule created successfully');
            }

            resetForm();
            fetchData();
        } catch (err) {
            console.error('Error saving schedule:', err);
            showToast.error('Failed to save schedule');
        }
    };

    const handleEdit = (schedule) => {
        setFormData({
            criteria_id: schedule.criteria_id,
            scheduled_date: schedule.scheduled_date,
            time_limit_minutes: schedule.time_limit_minutes,
            max_candidates: schedule.max_candidates,
            description: schedule.description || '',
            is_active: schedule.is_active
        });
        setEditingId(schedule.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this schedule?')) return;

        try {
            const { error } = await supabase
                .from('scheduled_interviews')
                .delete()
                .eq('id', id);

            if (error) throw error;
            showToast.success('Schedule deleted successfully');
            fetchData();
        } catch (err) {
            console.error('Error deleting schedule:', err);
            showToast.error('Failed to delete schedule');
        }
    };

    const resetForm = () => {
        setFormData({
            criteria_id: '',
            scheduled_date: '',
            time_limit_minutes: 30,
            max_candidates: null,
            description: '',
            is_active: true
        });
        setEditingId(null);
        setShowForm(false);
    };

    const timeLimitOptions = [15, 30, 45, 60, 90, 120];

    const groupSchedulesByDate = () => {
        const grouped = {};
        schedules.forEach(schedule => {
            const date = schedule.scheduled_date;
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(schedule);
        });
        return grouped;
    };

    const filteredSchedules = selectedDate
        ? schedules.filter(s => s.scheduled_date === selectedDate)
        : schedules;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 min-h-[60vh]">
                <div className="relative">
                    <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 animate-pulse"></div>
                    <div className="relative animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Interview Schedules</h2>
                    <p className="text-slate-400">Manage scheduled interviews and time limits</p>
                </div>
                <div className="flex gap-3">
                    {selectedDate && (
                        <button
                            onClick={() => setSelectedDate(null)}
                            className="glass-button flex items-center gap-2"
                        >
                            <X size={18} />
                            Clear Filter
                        </button>
                    )}
                    <button
                        onClick={() => setShowForm(true)}
                        className="glass-button-primary flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Schedule Interview
                    </button>
                </div>
            </div>

            {/* Create/Edit Form */}
            {showForm && (
                <div className="glass-panel rounded-2xl p-8 animate-fade-in-up">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <div className="p-2 bg-cyan-500/20 rounded-lg">
                                {editingId ? <Edit2 size={20} className="text-cyan-400" /> : <Plus size={20} className="text-cyan-400" />}
                            </div>
                            {editingId ? 'Edit Schedule' : 'Create New Schedule'}
                        </h3>
                        <button onClick={resetForm} className="text-slate-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Criteria Selection */}
                            <div className="group">
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider ml-1">
                                    Criteria *
                                </label>
                                <select
                                    value={formData.criteria_id}
                                    onChange={(e) => setFormData({ ...formData, criteria_id: e.target.value })}
                                    className="glass-input px-4"
                                    required
                                >
                                    <option value="">Select Criteria</option>
                                    {criteria.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Scheduled Date */}
                            <div className="group">
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider ml-1">
                                    Scheduled Date *
                                </label>
                                <input
                                    type="date"
                                    value={formData.scheduled_date}
                                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                                    className="glass-input px-4"
                                    required
                                />
                            </div>

                            {/* Time Limit */}
                            <div className="group">
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider ml-1">
                                    Time Limit (Minutes) *
                                </label>
                                <select
                                    value={formData.time_limit_minutes}
                                    onChange={(e) => setFormData({ ...formData, time_limit_minutes: e.target.value })}
                                    className="glass-input px-4"
                                    required
                                >
                                    {timeLimitOptions.map(minutes => (
                                        <option key={minutes} value={minutes}>
                                            {minutes} minutes ({Math.floor(minutes / 60)}h {minutes % 60}m)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Max Candidates */}
                            <div className="group">
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider ml-1">
                                    Max Candidates (Optional)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.max_candidates || ''}
                                    onChange={(e) => setFormData({ ...formData, max_candidates: e.target.value })}
                                    className="glass-input px-4"
                                    placeholder="Unlimited"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider ml-1">
                                Description (Optional)
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="glass-input px-4 min-h-[100px]"
                                placeholder="Add notes about this interview schedule..."
                            />
                        </div>

                        {/* Active Status */}
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="w-4 h-4 rounded border-white/10 bg-white/5 text-cyan-500 focus:ring-2 focus:ring-cyan-400/50"
                            />
                            <label htmlFor="is_active" className="text-sm text-slate-300">
                                Active (candidates can register for this schedule)
                            </label>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-white/10">
                            <button type="submit" className="glass-button-primary flex items-center gap-2">
                                <Save size={18} />
                                {editingId ? 'Update Schedule' : 'Create Schedule'}
                            </button>
                            <button type="button" onClick={resetForm} className="glass-button">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Schedules List */}
            <div className="glass-panel rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">
                        {selectedDate ? `Schedules for ${new Date(selectedDate).toLocaleDateString()}` : 'All Schedules'}
                    </h3>
                    <div className="text-sm text-slate-400">
                        {filteredSchedules.length} schedule{filteredSchedules.length !== 1 ? 's' : ''}
                    </div>
                </div>

                {filteredSchedules.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No schedules found</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="mt-4 glass-button-primary inline-flex items-center gap-2"
                        >
                            <Plus size={18} />
                            Create First Schedule
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredSchedules.map((schedule) => (
                            <div
                                key={schedule.id}
                                className="glass-panel p-6 rounded-xl hover:bg-white/10 transition-all group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 bg-cyan-500/20 rounded-lg">
                                                <Calendar size={20} className="text-cyan-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-white">{schedule.criteria_name}</h4>
                                                <p className="text-sm text-slate-400">
                                                    {new Date(schedule.scheduled_date).toLocaleDateString('en-US', {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Clock size={16} className="text-cyan-400" />
                                                <span className="text-slate-300">{schedule.time_limit_minutes} min</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Users size={16} className="text-cyan-400" />
                                                <span className="text-slate-300">
                                                    {schedule.total_interviews} / {schedule.max_candidates || '∞'} candidates
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${schedule.is_active
                                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                    }`}>
                                                    {schedule.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-slate-400">
                                                    {schedule.completed_interviews} completed
                                                </span>
                                            </div>
                                        </div>

                                        {schedule.description && (
                                            <p className="text-sm text-slate-400 mt-2">{schedule.description}</p>
                                        )}
                                    </div>

                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(schedule)}
                                            className="p-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(schedule.id)}
                                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

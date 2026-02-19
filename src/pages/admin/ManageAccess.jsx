import React, { useState, useEffect } from 'react';
import SimpleLayout from '@/components/admin/SimpleLayout';
import { supabase } from '@/lib/supabase';
import { accessControl } from '@/lib/accessControl';
import { Globe, Monitor, Trash2, Plus, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManageAccess() {
    const [allowedItems, setAllowedItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentInfo, setCurrentInfo] = useState({ ip: null, deviceId: null });
    const [newItem, setNewItem] = useState({ type: 'ip', value: '', name: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Get current session info
            const ip = await accessControl.getPublicIp();
            const deviceId = accessControl.getDeviceId();
            setCurrentInfo({ ip, deviceId });

            // Fetch allowed list
            const { data, error } = await supabase
                .from('admin_access_control')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAllowedItems(data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load access control list');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCurrent = (type) => {
        const value = type === 'ip' ? currentInfo.ip : currentInfo.deviceId;
        setNewItem({
            type,
            value,
            name: type === 'ip' ? 'Office/My IP' : 'My Work Laptop'
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (!newItem.value || !newItem.name) {
                toast.error('Please fill in all fields');
                return;
            }

            const { error } = await supabase
                .from('admin_access_control')
                .insert([newItem]);

            if (error) {
                if (error.code === '23505') {
                    toast.error('This entry already exists');
                } else {
                    throw error;
                }
                return;
            }

            toast.success('Access granted successfully');
            setNewItem({ type: 'ip', value: '', name: '' });
            fetchData();
        } catch (error) {
            console.error('Error saving access:', error);
            toast.error('Failed to grant access');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to revoke this access?')) return;

        try {
            const { error } = await supabase
                .from('admin_access_control')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Access revoked');
            fetchData();
        } catch (error) {
            console.error('Error deleting access:', error);
            toast.error('Failed to revoke access');
        }
    };

    return (
        <SimpleLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Access Control</h1>
                        <p className="text-slate-400">Manage authorized IPs and devices for the Interview Portal (Aspirant App).</p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 transition-all"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>

                {/* Current Status Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#0b101b]/50 border border-brand-blue/20 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue">
                                <Globe size={20} />
                            </div>
                            <h2 className="font-bold text-white">Current Network</h2>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-mono text-xl text-white">{currentInfo.ip || 'Detecting...'}</span>
                            <button
                                onClick={() => handleAddCurrent('ip')}
                                className="px-3 py-1 bg-brand-blue/20 hover:bg-brand-blue text-brand-blue hover:text-white rounded text-xs font-bold transition-all"
                            >
                                Use This IP
                            </button>
                        </div>
                    </div>

                    <div className="bg-[#0b101b]/50 border border-purple-500/20 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                <Monitor size={20} />
                            </div>
                            <h2 className="font-bold text-white">Current Device</h2>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-mono text-sm text-slate-300">ID: {currentInfo.deviceId?.substring(0, 16)}...</span>
                            <button
                                onClick={() => handleAddCurrent('device')}
                                className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500 text-purple-400 hover:text-white rounded text-xs font-bold transition-all"
                            >
                                Use This Device
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Add New Entry Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6 sticky top-24">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Plus size={20} className="text-brand-blue" />
                                Grant New Access
                            </h2>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Type</label>
                                    <select
                                        value={newItem.type}
                                        onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                                        className="w-full bg-[#0b101b] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-blue"
                                    >
                                        <option value="ip">Public IP Address</option>
                                        <option value="device">Device Identifier</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Address/ID</label>
                                    <input
                                        type="text"
                                        placeholder={newItem.type === 'ip' ? '123.45.67.89' : 'uuid...'}
                                        value={newItem.value}
                                        onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
                                        className="w-full bg-[#0b101b] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-blue"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Friendly Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Office Router, HR-Laptop"
                                        value={newItem.name}
                                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                        className="w-full bg-[#0b101b] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-blue"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-3 bg-brand-blue hover:bg-blue-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 mt-4"
                                >
                                    <ShieldCheck size={20} />
                                    Authorize Access
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Allowed List Table */}
                    <div className="lg:col-span-2">
                        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                            <div className="p-6 border-b border-white/10">
                                <h2 className="text-xl font-bold text-white">Authorized Sources</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-[#0f172a] border-b border-white/10 text-xs font-bold text-slate-400 uppercase">
                                        <tr>
                                            <th className="px-6 py-4">Type</th>
                                            <th className="px-6 py-4">Identity / Name</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="3" className="px-6 py-12 text-center text-slate-500 italic">Loading access list...</td>
                                            </tr>
                                        ) : allowedItems.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" className="px-6 py-12 text-center">
                                                    <div className="flex flex-col items-center gap-3 text-slate-500">
                                                        <ShieldCheck size={40} className="text-red-500/50" />
                                                        <p className="text-red-400">Strict mode active. Everyone is currently blocked.</p>
                                                        <p className="text-xs">Add an entry to authorize a specific IP or Device for the Interview Portal.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            allowedItems.map((item) => (
                                                <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${item.type === 'ip'
                                                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                                            : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                                                            }`}>
                                                            {item.type === 'ip' ? <Globe size={12} /> : <Monitor size={12} />}
                                                            {item.type.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-white">{item.name}</div>
                                                        <div className="text-xs font-mono text-slate-400 truncate max-w-xs">{item.value}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(item.id)}
                                                            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-brand-orange/10 border border-brand-orange/20 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-brand-orange shrink-0 mt-0.5" />
                            <div className="text-sm text-slate-300">
                                <span className="font-bold text-brand-orange block mb-1">Warning: Be Careful!</span>
                                Revoking access for your current IP and Device will lock you out immediately.
                                Always ensure at least one of your current identifiers remains in the list.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SimpleLayout>
    );
}

import React from 'react';
import { ShieldAlert, Globe, Monitor, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function AccessDenied({ ip, deviceId }) {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin/login');
    };

    return (
        <div className="h-full w-full bg-universe flex items-center justify-center p-4 font-sans relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="orb orb-1 opacity-20"></div>
                <div className="orb orb-2 opacity-20"></div>
                <div className="grid-texture opacity-10"></div>
            </div>

            <div className="relative z-10 w-full max-w-lg">
                <div className="bg-[#0b101b]/90 backdrop-blur-3xl border border-red-500/20 rounded-2xl p-8 shadow-2xl text-center">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20">
                            <ShieldAlert className="w-12 h-12 text-red-500" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-2">Access Denied</h1>
                    <p className="text-slate-400 mb-8">
                        This environment is restricted to authorized IP addresses and devices only.
                        Please contact your administrator to grant access.
                    </p>

                    <div className="space-y-4 mb-8">
                        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Globe className="w-5 h-5 text-brand-blue" />
                                <span className="text-sm font-medium text-slate-300">Your Public IP</span>
                            </div>
                            <span className="text-sm font-mono text-white bg-slate-800 px-3 py-1 rounded">{ip || 'Detecting...'}</span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Monitor className="w-5 h-5 text-purple-400" />
                                <span className="text-sm font-medium text-slate-300">Device Identifier</span>
                            </div>
                            <span className="text-sm font-mono text-white bg-slate-800 px-3 py-1 rounded">
                                {deviceId ? `${deviceId.substring(0, 8)}...` : 'Detecting...'}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleLogout}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl font-bold transition-all"
                        >
                            <LogOut size={18} />
                            Sign Out
                        </button>
                    </div>
                </div>

                <p className="text-center text-slate-500 text-sm mt-8 italic">
                    Refer these identifiers to your administrator to enable access.
                </p>
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { accessControl } from '@/lib/accessControl';
import AccessDenied from '@/components/admin/AccessDenied';
import { Loader2 } from 'lucide-react';

/**
 * AccessGuard wraps candidate-facing routes to ensure 
 * the current user is accessing from an authorized IP or Device.
 */
export default function AccessGuard() {
    const location = useLocation();
    const [accessState, setAccessState] = useState({
        loading: true,
        allowed: true,
        ip: null,
        deviceId: null
    });

    useEffect(() => {
        checkAccess();
    }, [location.pathname]);

    const checkAccess = async () => {
        try {
            setAccessState(prev => ({ ...prev, loading: true }));
            const result = await accessControl.verifyAccess();
            setAccessState({
                loading: false,
                allowed: result.allowed,
                ip: result.ip,
                deviceId: result.deviceId
            });
        } catch (error) {
            console.error('[ACCESS_GUARD] Verification failed:', error);
            // Default to denied on critical error to be safe
            setAccessState({
                loading: false,
                allowed: false,
                ip: 'Error',
                deviceId: 'Error'
            });
        }
    };

    if (accessState.loading) {
        return (
            <div className="h-screen w-full bg-[#0b101b] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 text-sm font-medium">Verifying Secure Access...</p>
                </div>
            </div>
        );
    }

    if (!accessState.allowed) {
        return (
            <AccessDenied
                ip={accessState.ip}
                deviceId={accessState.deviceId}
                showLogout={false}
            />
        );
    }

    return <Outlet />;
}

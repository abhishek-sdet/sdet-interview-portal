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

    // Auto-scaling Hook removed in favor of pure CSS responsive design.

    // 2. Anti-Screenshot Hook
    useEffect(() => {
        const preventScreenshots = (e) => {
            // Check for PrintScreen key or common screenshot shortcuts
            // Note: e.key === 'PrintScreen' covers the PrtScn key.
            // Mac shortcuts (Cmd+Shift+3/4) are harder to block at JS level, 
            // but we can try to catch the key combinations.
            if (
                e.key === 'PrintScreen' ||
                (e.ctrlKey && e.key === 'p') || // Ctrl+P (Print)
                (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) || // Mac screenshot shortcuts
                (e.metaKey && e.key === 'p') // Mac Print
            ) {
                e.preventDefault();
                // Clear clipboard to corrupt snips if they rely on it
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText("Screenshots are disabled during the assessment.");
                }
                console.warn("[SECURITY] Screenshot attempt detected and blocked.");
            }
        };

        window.addEventListener('keydown', preventScreenshots, true);
        window.addEventListener('keyup', preventScreenshots, true);

        return () => {
            window.removeEventListener('keydown', preventScreenshots, true);
            window.removeEventListener('keyup', preventScreenshots, true);
        };
    }, []);

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

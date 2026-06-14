import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { accessControl } from '@/lib/accessControl';
import AccessDenied from '@/components/admin/AccessDenied';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

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

    const [securitySettings, setSecuritySettings] = useState({ allowScreenshots: false, allowInspect: false });

    // Fetch Security Settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await supabase.from('site_settings').select('allow_screenshots, allow_inspect').single();
                if (data) {
                    setSecuritySettings({
                        allowScreenshots: data.allow_screenshots,
                        allowInspect: data.allow_inspect
                    });
                }
            } catch (err) {
                console.error("Failed to load security settings in AccessGuard", err);
            }
        };
        fetchSettings();
    }, []);

    // Global Anti-Cheat Hook
    useEffect(() => {
        const handleKeyDown = async (e) => {
            // Block Inspect tools (F12, Ctrl+Shift+I/J/C, Ctrl+U)
            if (!securitySettings.allowInspect) {
                if (
                    e.key === 'F12' ||
                    (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
                    (e.metaKey && e.altKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
                    (e.ctrlKey && e.key.toLowerCase() === 'u') ||
                    (e.metaKey && e.key.toLowerCase() === 'u')
                ) {
                    e.preventDefault();
                    toast.error("Developer tools are disabled.");
                }
            }

            // Block Screenshots on macOS (Cmd+Shift+3/4/5)
            if (!securitySettings.allowScreenshots) {
                if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
                    e.preventDefault();
                    try {
                        await navigator.clipboard.writeText("Screenshots are strictly prohibited.");
                        toast.error("Screenshots are not allowed!");
                    } catch (err) {}
                }
            }
        };

        const handleKeyUp = async (e) => {
            if (!securitySettings.allowScreenshots && (e.key === 'PrintScreen' || e.key === 'Meta')) {
                try {
                    await navigator.clipboard.writeText("Screenshots are strictly prohibited.");
                    toast.error("Screenshots are not allowed!");
                } catch (err) {}
            }
        };

        const disableContextMenu = (e) => {
            if (!securitySettings.allowInspect) {
                e.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        document.addEventListener('contextmenu', disableContextMenu);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            document.removeEventListener('contextmenu', disableContextMenu);
        };
    }, [securitySettings]);

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

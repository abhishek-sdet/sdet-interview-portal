import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

/**
 * AdminGuard wraps every admin-only route (including the HR results
 * dashboard) so they can no longer be reached without a logged-in
 * Supabase session, regardless of whether the individual page remembers
 * to check auth itself.
 */
export default function AdminGuard() {
    const navigate = useNavigate();
    const location = useLocation();
    const [checking, setChecking] = useState(true);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        let active = true;

        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!active) return;
            if (!session) {
                setAllowed(false);
                setChecking(false);
                navigate('/admin/login', { replace: true, state: { from: location.pathname } });
                return;
            }
            setAllowed(true);
            setChecking(false);
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!session) navigate('/admin/login', { replace: true });
        });

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, [location.pathname]);

    if (checking) {
        return (
            <div className="h-screen w-full bg-[#080c14] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
                    <p className="text-slate-500 text-sm">Verifying session...</p>
                </div>
            </div>
        );
    }

    return allowed ? <Outlet /> : null;
}

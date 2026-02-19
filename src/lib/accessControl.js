import { supabase } from './supabase';

/**
 * Utility to manage and verify admin access based on IP and Device ID.
 */
export const accessControl = {
    /**
     * Get or generate a unique device ID for this browser.
     */
    /**
     * Get or generate a unique device ID for this browser.
     * Uses both localStorage and Cookies for cross-persistence.
     */
    getDeviceId: () => {
        const STORAGE_KEY = 'sdet_admin_device_id';
        const COOKIE_NAME = 'sdet_device_id';

        // 1. Try to get from localStorage
        let deviceId = localStorage.getItem(STORAGE_KEY);

        // 2. Try to get from Cookie if localStorage is empty
        if (!deviceId) {
            const cookies = document.cookie.split('; ');
            const deviceCookie = cookies.find(row => row.startsWith(`${COOKIE_NAME}=`));
            if (deviceCookie) {
                deviceId = deviceCookie.split('=')[1];
                // Sync back to localStorage
                localStorage.setItem(STORAGE_KEY, deviceId);
            }
        }

        // 3. Generate new if both are missing
        if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem(STORAGE_KEY, deviceId);
        }

        // 4. Ensure Cookie is always set/refreshed (expires in 1 year)
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
        document.cookie = `${COOKIE_NAME}=${deviceId}; expires=${expiry.toUTCString()}; path=/; SameSite=Strict`;

        return deviceId;
    },

    /**
     * Fetch the user's current public IP address.
     */
    getPublicIp: async () => {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.error('Error fetching public IP:', error);
            return null;
        }
    },

    /**
     * Verify if the current session matches allowed IP or Device ID.
     * Returns { allowed: boolean, reason: string | null }
     */
    verifyAccess: async () => {
        try {
            const deviceId = accessControl.getDeviceId();
            const publicIp = await accessControl.getPublicIp();

            // Fetch allowed list
            const { data: allowedList, error } = await supabase
                .from('admin_access_control')
                .select('*');

            if (error) throw error;

            // If no restrictions are set, block access for security (Strict Mode)
            if (!allowedList || allowedList.length === 0) {
                return {
                    allowed: false,
                    reason: 'No authorized sources configured for the Interview Portal.',
                    ip: publicIp,
                    deviceId
                };
            }

            // Check IP
            const isIpAllowed = allowedList.some(item => item.type === 'ip' && item.value === publicIp);

            // Check Device
            const isDeviceAllowed = allowedList.some(item => item.type === 'device' && item.value === deviceId);

            if (isIpAllowed || isDeviceAllowed) {
                return { allowed: true, reason: null, ip: publicIp, deviceId };
            }

            return {
                allowed: false,
                reason: 'Access restricted for this IP and Device.',
                ip: publicIp,
                deviceId
            };
        } catch (error) {
            console.error('Access verification failed:', error);

            // If it's an AuthApiError (401/Invalid Refresh Token), we should NOT allow access
            if (error.status === 401 || error.message?.includes('Refresh Token')) {
                return { allowed: false, reason: 'Authentication required. Please log in.', error: error.message };
            }

            // Default to allowed for temporary network/API errors to prevent locking everyone out 
            // but log the error. In a strict system, this would be 'false'.
            return { allowed: true, reason: 'Error during verification', error: error.message };
        }
    }
};

import { supabase } from './supabase';

/**
 * Utility to manage and verify admin access based on IP and Device ID.
 */
export const accessControl = {
    /**
     * Get or generate a unique device ID for this browser.
     */
    getDeviceId: () => {
        let deviceId = localStorage.getItem('sdet_admin_device_id');
        if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem('sdet_admin_device_id', deviceId);
        }
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

            // If no restrictions are set yet, allow access (first time setup)
            if (!allowedList || allowedList.length === 0) {
                return { allowed: true, reason: 'No restrictions configured', ip: publicIp, deviceId };
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
            // Default to allowed if there's an error to prevent locking everyone out 
            // but log the error. In a strict system, this would be 'false'.
            return { allowed: true, reason: 'Error during verification', error: error.message };
        }
    }
};

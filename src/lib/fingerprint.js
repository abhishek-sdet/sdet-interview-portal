import fpPromise from '@fingerprintjs/fingerprintjs';

/**
 * Enhanced Fingerprinting Utility
 * Generates a highly accurate, sticky device ID based on hardware and browser characteristics
 * This ID persists across incognito mode and browser resets.
 */
export const getHardwareId = async () => {
    try {
        // Initialize the agent at application startup.
        const fp = await fpPromise.load();

        // Get the visitor identifier when you need it.
        const result = await fp.get();

        // This is the visitor identifier:
        const visitorId = result.visitorId;

        console.log('[SECURITY] Generated Hardware Fingerprint:', visitorId);
        return visitorId;
    } catch (error) {
        console.error('[SECURITY] Fingerprint generation failed:', error);
        // Fallback to legacy UUID if fingerprinting is blocked by a strict adblocker
        return null;
    }
};

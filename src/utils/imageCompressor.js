/**
 * imageCompressor.js
 * Browser-side image compression using Canvas API.
 * No external dependencies needed.
 */

/**
 * Compress a base64 image dataURL using canvas.
 * @param {string} dataUrl - Original image as base64 data URL (e.g., from camera capture)
 * @param {object} options
 * @param {number} options.maxWidth  - Max width in pixels (default: 480)
 * @param {number} options.maxHeight - Max height in pixels (default: 360)
 * @param {number} options.quality  - JPEG quality 0.0–1.0 (default: 0.35 → ~65% size reduction)
 * @param {string} options.format   - Output format: 'image/jpeg' | 'image/webp' (default: 'image/jpeg')
 * @returns {Promise<string>} Compressed image as base64 data URL
 */
export function compressImage(dataUrl, options = {}) {
    const {
        maxWidth  = 480,
        maxHeight = 360,
        quality   = 0.35,
        format    = 'image/jpeg',
    } = options;

    return new Promise((resolve, reject) => {
        if (!dataUrl || !dataUrl.startsWith('data:image')) {
            reject(new Error('Invalid image dataUrl'));
            return;
        }

        const img = new Image();
        img.onload = () => {
            // Calculate scaled dimensions preserving aspect ratio
            let { width, height } = img;
            const aspectRatio = width / height;

            if (width > maxWidth) {
                width  = maxWidth;
                height = Math.round(maxWidth / aspectRatio);
            }
            if (height > maxHeight) {
                height = maxHeight;
                width  = Math.round(maxHeight * aspectRatio);
            }

            // Draw onto canvas at new dimensions
            const canvas = document.createElement('canvas');
            canvas.width  = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressed = canvas.toDataURL(format, quality);

            // Safety check: if compression made it bigger somehow, return original
            if (compressed.length > dataUrl.length) {
                console.warn('[Compressor] Compression increased size, returning original');
                resolve(dataUrl);
            } else {
                const reduction = (((dataUrl.length - compressed.length) / dataUrl.length) * 100).toFixed(1);
                console.log(`[Compressor] ${reduction}% size reduction (${dataUrl.length} → ${compressed.length} bytes)`);
                resolve(compressed);
            }
        };
        img.onerror = () => reject(new Error('Failed to load image for compression'));
        img.src = dataUrl;
    });
}

/**
 * Compress image and return both compressed version and size stats.
 * @param {string} dataUrl - Original image
 * @param {object} options - Same as compressImage
 * @returns {Promise<{compressed: string, originalKB: number, compressedKB: number, reductionPct: number}>}
 */
export async function compressImageWithStats(dataUrl, options = {}) {
    const compressed = await compressImage(dataUrl, options);
    const originalKB   = Math.round(dataUrl.length * 0.75 / 1024);  // base64 to bytes estimate
    const compressedKB = Math.round(compressed.length * 0.75 / 1024);
    const reductionPct = Math.round(((originalKB - compressedKB) / originalKB) * 100);
    return { compressed, originalKB, compressedKB, reductionPct };
}

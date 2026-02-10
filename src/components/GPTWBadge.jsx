import React from 'react';

export default function GPTWBadge({ className = '', size = 'md' }) {
    // Sizes: sm (h-8), md (h-12), lg (h-16)
    const sizes = {
        sm: 'h-8',
        md: 'h-12',
        lg: 'h-16'
    };

    return (
        <div className={`relative inline-block ${className}`}>
            <img
                src="/gptw-logo.png"
                alt="Great Place To Work Certified"
                className={`${sizes[size]} w-auto object-contain drop-shadow-md`}
            />
        </div>
    );
}

import React from 'react';

export default function AppSignature() {
    return (
        <div
            className="fixed bottom-3 left-4 z-[10000] pointer-events-none select-none"
            style={{
                fontFamily: "'Dancing Script', cursive",
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.2)',
            }}
        >
            AJ
        </div>
    );
}

import React from 'react';

export default function AppSignature() {
    return (
        <div
            className="fixed bottom-3 right-8 z-[99999] pointer-events-none select-none"
            style={{
                fontFamily: "'Dancing Script', cursive",
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.45)', // Increased visibility from 0.2
            }}
        >
            AJ
        </div>
    );
}

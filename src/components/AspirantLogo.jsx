// Logo component for SDET Aspirant (Interview Portal)
export default function AspirantLogo({ size = 120 }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width={size} height={size}>
            <defs>
                <linearGradient id="bgGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#0054a5', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#00ffe5', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="checkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#ff6b35', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#ffb800', stopOpacity: 1 }} />
                </linearGradient>
            </defs>
            <circle cx="200" cy="200" r="150" fill="url(#bgGrad1)" />
            <g transform="translate(130, 120)">
                <path d="M 0,0 L 80,0 L 100,20 L 100,140 L 0,140 Z" fill="white" opacity="0.95" />
                <path d="M 80,0 L 80,20 L 100,20 Z" fill="#e0e0e0" />
                <line x1="15" y1="40" x2="85" y2="40" stroke="#0054a5" strokeWidth="3" opacity="0.3" />
                <line x1="15" y1="55" x2="85" y2="55" stroke="#0054a5" strokeWidth="3" opacity="0.3" />
                <line x1="15" y1="70" x2="70" y2="70" stroke="#0054a5" strokeWidth="3" opacity="0.3" />
                <circle cx="20" cy="90" r="8" fill="none" stroke="#0054a5" strokeWidth="2" />
                <circle cx="45" cy="90" r="8" fill="none" stroke="#0054a5" strokeWidth="2" />
                <circle cx="70" cy="90" r="8" fill="none" stroke="#0054a5" strokeWidth="2" />
                <circle cx="20" cy="110" r="8" fill="none" stroke="#0054a5" strokeWidth="2" />
                <circle cx="45" cy="110" r="8" fill="url(#checkGrad)" stroke="#ff6b35" strokeWidth="2" />
                <circle cx="70" cy="110" r="8" fill="none" stroke="#0054a5" strokeWidth="2" />
                <path d="M 40,110 L 44,114 L 50,106" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <g transform="translate(260, 100) rotate(-30)">
                <rect x="0" y="0" width="12" height="60" rx="2" fill="#ff6b35" />
                <polygon points="0,60 12,60 6,75" fill="#ffb800" />
            </g>
        </svg>
    );
}

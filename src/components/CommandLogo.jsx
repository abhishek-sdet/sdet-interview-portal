// Logo component for SDET Command (Admin Portal)
export default function CommandLogo({ size = 120 }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width={size} height={size}>
            <defs>
                <linearGradient id="bgGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#1a1a2e', stopOpacity: 1 }} />
                    <stop offset="50%" style={{ stopColor: '#0054a5', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#00ffe5', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#00ffe5', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#0054a5', stopOpacity: 1 }} />
                </linearGradient>
            </defs>
            <circle cx="200" cy="200" r="150" fill="url(#bgGrad2)" />
            <g transform="translate(200, 130)">
                <path d="M 0,-20 L -60,0 L -60,60 Q -60,100 0,120 Q 60,100 60,60 L 60,0 Z" fill="url(#shieldGrad)" stroke="#00ffe5" strokeWidth="3" />
                <g transform="translate(0, -5)">
                    <polygon points="-25,0 -15,-15 -5,0 5,-15 15,0 25,-15 35,0 35,8 -35,8 -35,0" fill="#ffb800" stroke="#ff6b35" strokeWidth="2" />
                    <circle cx="-15" cy="-15" r="3" fill="#ff6b35" />
                    <circle cx="5" cy="-15" r="3" fill="#ff6b35" />
                    <circle cx="25" cy="-15" r="3" fill="#ff6b35" />
                </g>
                <g transform="translate(0, 45)">
                    <circle cx="0" cy="0" r="20" fill="#1a1a2e" />
                    <path d="M -5,-22 L 5,-22 L 5,-18 L -5,-18 Z M -5,22 L 5,22 L 5,18 L -5,18 Z M -22,-5 L -18,-5 L -18,5 L -22,5 Z M 22,-5 L 18,-5 L 18,5 L 22,5 Z" fill="#00ffe5" />
                    <circle cx="0" cy="0" r="8" fill="#1a1a2e" stroke="#00ffe5" strokeWidth="2" />
                </g>
            </g>
        </svg>
    );
}

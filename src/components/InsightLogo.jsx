// Logo component for SDET Insight (Results Dashboard)
export default function InsightLogo({ size = 120 }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width={size} height={size}>
            <defs>
                <linearGradient id="bgGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#00ff88', stopOpacity: 1 }} />
                    <stop offset="50%" style={{ stopColor: '#0054a5', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#9b59b6', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="chartGrad1" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#00ff88', stopOpacity: 0.8 }} />
                    <stop offset="100%" style={{ stopColor: '#00ffe5', stopOpacity: 0.8 }} />
                </linearGradient>
            </defs>
            <circle cx="200" cy="200" r="150" fill="url(#bgGrad3)" />
            <g transform="translate(90, 110)">
                <rect x="0" y="0" width="220" height="150" rx="10" fill="white" opacity="0.95" />
                <rect x="0" y="0" width="220" height="30" rx="10" fill="#0054a5" opacity="0.2" />
                <circle cx="15" cy="15" r="4" fill="#ff6b35" />
                <circle cx="27" cy="15" r="4" fill="#ffb800" />
                <circle cx="39" cy="15" r="4" fill="#00ff88" />
                <g transform="translate(20, 50)">
                    <rect x="0" y="60" width="25" height="30" rx="3" fill="url(#chartGrad1)" />
                    <rect x="35" y="40" width="25" height="50" rx="3" fill="url(#chartGrad1)" />
                    <rect x="70" y="50" width="25" height="40" rx="3" fill="url(#chartGrad1)" />
                    <rect x="105" y="30" width="25" height="60" rx="3" fill="url(#chartGrad1)" />
                    <rect x="140" y="45" width="25" height="45" rx="3" fill="url(#chartGrad1)" />
                </g>
            </g>
            <g transform="translate(290, 230)">
                <circle cx="0" cy="0" r="25" fill="none" stroke="#00ffe5" strokeWidth="4" />
                <line x1="18" y1="18" x2="35" y2="35" stroke="#00ffe5" strokeWidth="6" strokeLinecap="round" />
            </g>
        </svg>
    );
}

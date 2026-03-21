const PuntLogo = ({ size = 32, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Bold P letter */}
    <path
      d="M18 8h18c8.837 0 16 7.163 16 16s-7.163 16-16 16H26v16h-8V8z"
      fill="hsl(var(--primary))"
    />
    <path
      d="M26 16h10c4.418 0 8 3.582 8 8s-3.582 8-8 8H26V16z"
      fill="hsl(var(--background))"
    />
    {/* Two horizontal strike-through lines on the vertical stem */}
    <rect x="10" y="20" width="28" height="3" rx="1.5" fill="hsl(var(--primary))" />
    <rect x="10" y="28" width="28" height="3" rx="1.5" fill="hsl(var(--primary))" />
  </svg>
);

export default PuntLogo;

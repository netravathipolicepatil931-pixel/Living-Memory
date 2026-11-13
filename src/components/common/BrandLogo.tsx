import React from 'react';

interface BrandLogoProps {
  compact?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ compact = false, className = '' }) => {
  return (
    <div className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${className}`}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x="1"
          y="1"
          width="26"
          height="26"
          rx="8"
          fill="var(--bg-card)"
          stroke="var(--border-subtle)"
          strokeWidth="1"
        />
        <path
          d="M8.5 9.5L14 14L19.5 8.5M14 14L9 19.5M14 14L19.5 18.5"
          stroke="#1A73E8"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="8.5" cy="9.5" r="2.3" fill="#5E35B1" />
        <circle cx="19.5" cy="8.5" r="2.3" fill="#1A73E8" />
        <circle cx="14" cy="14" r="2.6" fill="#202124" />
        <circle cx="9" cy="19.5" r="2.1" fill="#137333" />
        <circle cx="19.5" cy="18.5" r="2.1" fill="#007B83" />
      </svg>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0">
          LIVING MEMORY
        </span>
      )}
    </div>
  );
};

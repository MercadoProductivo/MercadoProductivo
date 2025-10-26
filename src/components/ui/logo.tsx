import Image from "next/image";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  showText?: boolean;
}

export function Logo({ className = "", width = 32, height = 32, showText = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 128 128"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="mp-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f06d04"/>
            <stop offset="100%" stop-color="#ff8c42"/>
          </linearGradient>
        </defs>
        <rect width="128" height="128" rx="20" fill="url(#mp-gradient)"/>
        <g fill="#fff" font-family="Arial, sans-serif" font-weight="bold">
          <text x="64" y="60" text-anchor="middle" font-size="32">MP</text>
          <text x="64" y="90" text-anchor="middle" font-size="10">MERCADO</text>
          <text x="64" y="105" text-anchor="middle" font-size="10">PRODUCTIVO</text>
        </g>
      </svg>
      {showText && (
        <span className="font-semibold text-foreground transition-colors hover:text-primary">
          Mercado Productivo
        </span>
      )}
    </div>
  );
}

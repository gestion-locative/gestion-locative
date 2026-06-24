import { useId } from "react";

/* ------------------------------------------------------------------
   <LoyaIcon />  — l'icône seule (carré arrondi, soleil + maison)
   <LoyaLogo />  — icône + wordmark « Loya »
   Couleurs : encre #1A1208 · soleil #FFD166 → #F4801F · crème #FBF1E3
------------------------------------------------------------------- */

export function LoyaIcon({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  // identifiants uniques -> on peut afficher plusieurs logos sur la même page
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Loya"
    >
      <defs>
        <linearGradient id={`sun-${uid}`} x1="50" y1="20" x2="50" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD166" />
          <stop offset="1" stopColor="#F4801F" />
        </linearGradient>
        <clipPath id={`tile-${uid}`}>
          <rect width="100" height="100" rx="24" />
        </clipPath>
      </defs>
      <g clipPath={`url(#tile-${uid})`}>
        <rect width="100" height="100" fill="#1A1208" />
        <circle cx="50" cy="42" r="17" fill={`url(#sun-${uid})`} />
        <path d="M50 30 L74 50 V52 H68 V72 H32 V52 H26 V50 Z" fill="#FBF1E3" />
        <rect x="44" y="58" width="12" height="14" rx="1.5" fill="#1A1208" />
      </g>
    </svg>
  );
}

export function LoyaLogo({
  size = 40,
  className = "",
  wordmarkClassName = "",
}: {
  size?: number;
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <LoyaIcon size={size} />
      <span
        className={`font-[family-name:var(--font-bricolage)] font-extrabold tracking-tight text-[#1a1208] ${wordmarkClassName}`}
        style={{ fontSize: size * 0.78, lineHeight: 1 }}
      >
        Loya
      </span>
    </span>
  );
}

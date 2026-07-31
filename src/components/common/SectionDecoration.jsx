/**
 * Decorative accent for a single section.
 *
 * Each section gets its own motif rather than everything sharing one page-wide
 * background. Absolutely positioned, non-interactive, and built from currentColor
 * so it inherits whatever the theme resolves `text-primary` / `text-accent` to —
 * no separate dark-mode artwork.
 *
 * Wrap the section in `relative overflow-hidden` and drop this in.
 */

const variants = {
  /** Grid of dots, drifting. Good behind card rows. */
  dots: (
    <svg className="w-full h-full" aria-hidden="true">
      <defs>
        <pattern id="deco-dots" width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="2" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#deco-dots)" />
    </svg>
  ),

  /** Concentric arcs, like ripples from the corner. */
  arcs: (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" aria-hidden="true">
      {[40, 70, 100, 130, 160].map((r) => (
        <circle key={r} cx="0" cy="200" r={r} stroke="currentColor" strokeWidth="2" />
      ))}
    </svg>
  ),

  /** Soft vapour curl — the shop's own subject. */
  vapour: (
    <svg viewBox="0 0 200 240" className="w-full h-full" fill="none" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          className="deco-float"
          style={{ animationDelay: `${i * 1.7}s`, animationDuration: `${8 + i * 2}s` }}
          d={`M${40 + i * 55} 240 C ${10 + i * 55} 170, ${80 + i * 55} 140, ${45 + i * 55} 80
              S ${10 + i * 55} 25, ${60 + i * 55} 0`}
          stroke="currentColor"
          strokeWidth="16"
          strokeLinecap="round"
        />
      ))}
    </svg>
  ),

  /** Diagonal hatching. */
  hatch: (
    <svg className="w-full h-full" aria-hidden="true">
      <defs>
        <pattern id="deco-hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="14" stroke="currentColor" strokeWidth="3" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#deco-hatch)" />
    </svg>
  ),

  /** Loose ring cluster. */
  rings: (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" aria-hidden="true">
      <circle cx="130" cy="70" r="55" stroke="currentColor" strokeWidth="3" />
      <circle cx="80" cy="120" r="38" stroke="currentColor" strokeWidth="3" />
      <circle cx="150" cy="150" r="22" stroke="currentColor" strokeWidth="3" />
    </svg>
  ),

  /** Price tag, for offer-flavoured sections. */
  tag: (
    <svg viewBox="0 0 140 140" className="w-full h-full" fill="none" aria-hidden="true">
      <g className="deco-float">
        <path
          d="M12 30 A18 18 0 0 1 30 12 L86 12 L130 56 L74 112 L30 68 A18 18 0 0 1 12 50 Z"
          stroke="currentColor"
          strokeWidth="5"
        />
        <circle cx="40" cy="40" r="9" fill="currentColor" />
      </g>
    </svg>
  ),
};

const positions = {
  "top-start": "top-0 start-0",
  "top-end": "top-0 end-0",
  "bottom-start": "bottom-0 start-0",
  "bottom-end": "bottom-0 end-0",
  center: "top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2",
};

const SectionDecoration = ({
  variant = "dots",
  position = "top-end",
  size = "w-64 h-64",
  tone = "text-primary",
  className = "",
  animate = true,
}) => (
  <div
    aria-hidden="true"
    className={`pointer-events-none select-none absolute -z-0 ${positions[position]} ${size} ${tone}
                opacity-[0.07] dark:opacity-[0.12] ${animate ? "deco-drift" : ""} ${className}`}
  >
    {variants[variant] ?? variants.dots}
  </div>
);

export default SectionDecoration;

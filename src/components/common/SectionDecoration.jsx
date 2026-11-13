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

  /** Rising vapour plume — denser than `vapour`, for hero-adjacent bands. */
  plume: (
    <svg viewBox="0 0 200 260" className="w-full h-full" fill="none" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <ellipse
          key={i}
          className="deco-rise"
          style={{ animationDelay: `${i * 3.4}s`, animationDuration: `${13 + i * 2}s` }}
          cx={50 + i * 34}
          cy={200 - i * 24}
          rx={26 + i * 5}
          ry={34 + i * 6}
          fill="currentColor"
          opacity={0.55 - i * 0.09}
        />
      ))}
    </svg>
  ),

  /** Liquid droplets rising through a pod — for e-liquid sections. */
  bubbles: (
    <svg viewBox="0 0 160 220" className="w-full h-full" fill="none" aria-hidden="true">
      {[
        { x: 40, r: 9, d: 0 },
        { x: 78, r: 6, d: 2.4 },
        { x: 112, r: 11, d: 1.2 },
        { x: 58, r: 5, d: 3.6 },
        { x: 96, r: 8, d: 4.8 },
      ].map((b, i) => (
        <circle
          key={i}
          className="deco-bubble"
          style={{ animationDelay: `${b.d}s`, animationDuration: `${8 + i}s` }}
          cx={b.x}
          cy={200}
          r={b.r}
          fill="currentColor"
        />
      ))}
    </svg>
  ),

  /** Coil spiral — the hardware side of the shop. */
  coil: (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" aria-hidden="true">
      <g className="deco-spin">
        <path
          d="M100 20 C150 20 180 55 180 100 C180 140 148 170 110 170 C78 170 54 147 54 118 C54 94 72 76 95 76 C114 76 129 90 129 108 C129 122 118 133 105 133"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </g>
    </svg>
  ),

  /** Long horizontal waves, good as a full-width band under a heading. */
  waves: (
    <svg viewBox="0 0 400 120" className="w-full h-full" fill="none" preserveAspectRatio="none" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          className="deco-sway"
          style={{ animationDelay: `${i * 1.9}s`, animationDuration: `${10 + i * 3}s` }}
          d={`M0 ${40 + i * 26} C 70 ${16 + i * 26}, 130 ${64 + i * 26}, 200 ${40 + i * 26}
              S 330 ${16 + i * 26}, 400 ${40 + i * 26}`}
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      ))}
    </svg>
  ),

  /** Hex mesh — a technical, "engineered" texture. */
  hex: (
    <svg className="w-full h-full" aria-hidden="true">
      <defs>
        <pattern id="deco-hex" width="34" height="59" patternUnits="userSpaceOnUse">
          <path
            d="M17 0 L34 10 L34 30 L17 40 L0 30 L0 10 Z M17 40 L34 50 M17 40 L0 50"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#deco-hex)" />
    </svg>
  ),

  /** A traced outline that draws itself, for quieter informational blocks. */
  trace: (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" aria-hidden="true">
      <circle
        className="deco-trace"
        cx="100"
        cy="100"
        r="78"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="14 10"
      />
      <circle
        className="deco-trace"
        style={{ animationDirection: "reverse", animationDuration: "24s" }}
        cx="100"
        cy="100"
        r="52"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="8 12"
      />
    </svg>
  ),

  /** Scattered sparks, for "new arrival" and highlight strips. */
  sparks: (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" aria-hidden="true">
      {[
        { x: 40, y: 50, s: 1 },
        { x: 140, y: 40, s: 0.7 },
        { x: 90, y: 120, s: 1.2 },
        { x: 165, y: 145, s: 0.6 },
        { x: 25, y: 155, s: 0.85 },
      ].map((p, i) => (
        <g
          key={i}
          className="deco-float"
          style={{ animationDelay: `${i * 1.3}s`, animationDuration: `${7 + i}s` }}
          transform={`translate(${p.x} ${p.y}) scale(${p.s})`}
        >
          <path
            d="M0 -16 C3 -5 5 -3 16 0 C5 3 3 5 0 16 C-3 5 -5 3 -16 0 C-5 -3 -3 -5 0 -16 Z"
            fill="currentColor"
          />
        </g>
      ))}
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
  "mid-start": "top-1/3 start-0",
  "mid-end": "top-1/3 end-0",
  "bottom-start": "bottom-0 start-0",
  "bottom-end": "bottom-0 end-0",
  center: "top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2",
};

/**
 * Outer motion. Variants that animate their own internals (plume, bubbles,
 * coil, waves, trace, sparks) pass `motion="none"` so the whole group is not
 * also drifting — two compounded animations read as wobble rather than calm.
 */
const motions = {
  drift: "deco-drift",
  float: "deco-float",
  sway: "deco-sway",
  pulse: "deco-pulse",
  none: "",
};

const SectionDecoration = ({
  variant = "dots",
  position = "top-end",
  size = "w-64 h-64",
  tone = "text-primary",
  className = "",
  motion = "drift",
  /** Deprecated alias kept so existing call sites keep working. */
  animate = true,
}) => (
  <div
    aria-hidden="true"
    className={`pointer-events-none select-none absolute -z-0 ${positions[position] ?? positions["top-end"]}
                ${size} ${tone} opacity-[0.07] dark:opacity-[0.12]
                ${animate ? motions[motion] ?? motions.drift : ""} ${className}`}
  >
    {variants[variant] ?? variants.dots}
  </div>
);

export default SectionDecoration;

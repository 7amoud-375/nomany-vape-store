import { useLocation } from "react-router-dom";

/**
 * Ambient background decoration, themed per page.
 *
 * Sits behind everything, never intercepts clicks, and uses the theme's own
 * colour variables so it works in light and dark without a second palette.
 * Shapes are picked to suit each page — vapour curls on the storefront, price
 * tags on offers, a receipt outline on checkout.
 */

const Blob = ({ className, style }) => (
  <div className={`absolute rounded-full deco-drift ${className}`} style={style} aria-hidden="true" />
);

/** Soft curling vapour trails — the shop's own subject matter. */
const VapourTrails = () => (
  <svg
    className="absolute inset-x-0 top-0 w-full h-[520px] opacity-[0.07] dark:opacity-[0.10] text-primary"
    viewBox="0 0 1200 520"
    fill="none"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    {[0, 1, 2].map((i) => (
      <path
        key={i}
        className="deco-float"
        style={{ animationDelay: `${i * 2.2}s`, animationDuration: `${9 + i * 2}s` }}
        d={`M${120 + i * 380} 520 C ${60 + i * 380} 380, ${220 + i * 380} 330, ${150 + i * 380} 190
            S ${60 + i * 380} 60, ${170 + i * 380} 0`}
        stroke="currentColor"
        strokeWidth="34"
        strokeLinecap="round"
      />
    ))}
  </svg>
);

/** Scattered price tags for the offers page. */
const PriceTags = () => (
  <svg
    className="absolute inset-0 w-full h-full opacity-[0.06] dark:opacity-[0.09] text-accent"
    viewBox="0 0 800 600"
    fill="none"
    aria-hidden="true"
  >
    {[
      { x: 90, y: 110, r: -18, s: 1.1 },
      { x: 640, y: 90, r: 14, s: 0.85 },
      { x: 380, y: 430, r: -8, s: 1 },
      { x: 720, y: 470, r: 22, s: 0.7 },
    ].map((tag, i) => (
      <g
        key={i}
        className="deco-float"
        style={{ animationDelay: `${i * 1.6}s` }}
        transform={`translate(${tag.x} ${tag.y}) rotate(${tag.r}) scale(${tag.s})`}
      >
        <path
          d="M0 18 A18 18 0 0 1 18 0 L74 0 L118 44 L62 100 L18 56 A18 18 0 0 1 0 38 Z"
          fill="currentColor"
        />
        <circle cx="28" cy="28" r="9" className="fill-white dark:fill-slate-950" />
      </g>
    ))}
  </svg>
);

/** A long receipt outline behind cart and checkout. */
const Receipt = () => (
  <svg
    className="absolute end-0 top-24 w-[420px] h-[560px] opacity-[0.05] dark:opacity-[0.08] text-primary deco-float"
    viewBox="0 0 300 400"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M40 10 H260 V370 L235 355 L210 370 L185 355 L160 370 L135 355 L110 370 L85 355 L60 370 L40 355 Z"
      stroke="currentColor"
      strokeWidth="6"
    />
    {[70, 110, 150, 190, 230, 270].map((y) => (
      <line key={y} x1="70" y1={y} x2={y % 80 === 0 ? 200 : 230} y2={y} stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    ))}
  </svg>
);

/**
 * Flavour-toned ambient shapes for category and product browsing.
 *
 * Three overlapping washes in the brand's own hues rather than literal fruit or
 * flavour imagery, which would date badly and fight the product photography.
 */
const FlavourFields = () => (
  <>
    <div
      aria-hidden="true"
      className="absolute top-[12%] start-[8%] w-[30rem] h-[30rem] rounded-full blur-3xl
                 bg-primary/10 dark:bg-primary/15 deco-drift"
      style={{ animationDuration: "34s" }}
    />
    <div
      aria-hidden="true"
      className="absolute top-[42%] end-[4%] w-[24rem] h-[24rem] rounded-full blur-3xl
                 bg-accent/10 dark:bg-accent/15 deco-drift"
      style={{ animationDuration: "42s", animationDelay: "6s" }}
    />
    <svg
      className="absolute bottom-0 inset-x-0 w-full h-[220px] opacity-[0.05] dark:opacity-[0.09] text-primary"
      viewBox="0 0 400 120"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          className="deco-sway"
          style={{ animationDelay: `${i * 2.1}s`, animationDuration: `${12 + i * 3}s` }}
          d={`M0 ${44 + i * 24} C 70 ${20 + i * 24}, 130 ${68 + i * 24}, 200 ${44 + i * 24}
              S 330 ${20 + i * 24}, 400 ${44 + i * 24}`}
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      ))}
    </svg>
  </>
);

/** Concentric rings for informational pages. */
const Rings = () => (
  <svg
    className="absolute -end-32 top-10 w-[560px] h-[560px] opacity-[0.06] dark:opacity-[0.09] text-primary deco-drift"
    viewBox="0 0 400 400"
    fill="none"
    aria-hidden="true"
  >
    {[60, 110, 160, 195].map((r) => (
      <circle key={r} cx="200" cy="200" r={r} stroke="currentColor" strokeWidth="3" />
    ))}
  </svg>
);

const PageDecorations = () => {
  const { pathname } = useLocation();

  // The dashboard is a work surface — decoration there is just noise.
  if (pathname.startsWith("/dashboard")) return null;

  const isHome = pathname === "/";
  const isOffers = pathname.startsWith("/offers");
  const isCart = pathname.startsWith("/cart") || pathname.startsWith("/checkout");
  const isBrowse =
    pathname.startsWith("/categories") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/wishlist");
  const isInfo =
    pathname.startsWith("/about") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/return-policy");

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* Always-present ambient wash, so no page looks flat. Kept to two
          shapes and a smaller blur radius — blur is the expensive part. */}
      <Blob
        className="w-[26rem] h-[26rem] -top-32 -start-32 bg-primary/10 dark:bg-primary/20 blur-2xl"
        style={{ animationDuration: "30s" }}
      />
      <Blob
        className="w-[20rem] h-[20rem] bottom-[-8rem] end-[-6rem] bg-accent/10 dark:bg-accent/15 blur-2xl"
        style={{ animationDuration: "38s", animationDelay: "4s" }}
      />

      {isHome && <VapourTrails />}
      {isOffers && <PriceTags />}
      {isCart && <Receipt />}
      {isBrowse && <FlavourFields />}
      {isInfo && <Rings />}

      {/*
        Fades the decoration out behind the content column so text keeps its
        contrast regardless of what is drifting underneath.

        The stops are the surface token itself rather than a named colour, so
        the scrim resolves to exactly the page background in both themes — a
        near-match leaves a faint band where the gradient ends.
      */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--color-surface) 60%, transparent) 55%, var(--color-surface) 100%)",
        }}
      />
    </div>
  );
};

export default PageDecorations;

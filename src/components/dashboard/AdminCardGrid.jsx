import { motion } from "framer-motion";

/**
 * Card layout for the dashboard lists.
 *
 * Replaces the wide DataTable, which forced horizontal scrolling on anything
 * narrower than a laptop — the columns could not shrink, so on a phone you were
 * dragging sideways to reach the action buttons.
 */

const PLACEHOLDER = "https://placehold.co/300x300/004741/FFFFFF?text=%20";

export const CardGrid = ({ children, empty, isEmpty }) => {
  if (isEmpty) {
    return (
      <div className="card p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">{empty}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {children}
    </div>
  );
};

export const AdminCard = ({
  image,
  title,
  subtitle,
  meta,
  badges = [],
  actions = [],
  index = 0,
  onClick,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    // Cap the stagger so a 60-product page does not spend three seconds
    // animating in.
    transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
    className="card overflow-hidden flex flex-col group"
  >
    {image !== undefined && (
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className="relative aspect-[4/3] bg-gray-100 dark:bg-slate-800 overflow-hidden disabled:cursor-default"
      >
        <img
          src={image || PLACEHOLDER}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = PLACEHOLDER;
          }}
        />
        {badges.length > 0 && (
          <div className="absolute top-2 start-2 flex flex-wrap gap-1 max-w-[calc(100%-1rem)]">
            {badges.map((badge) => (
              <span
                key={badge.label}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-medium backdrop-blur-sm ${badge.className}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}
      </button>
    )}

    <div className="p-4 flex-1 flex flex-col">
      <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 mb-1">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">{subtitle}</p>
      )}
      {meta && <div className="mt-auto pt-2">{meta}</div>}
    </div>

    {actions.length > 0 && (
      <div className="flex items-center border-t border-gray-100 dark:border-slate-800 divide-x divide-gray-100 dark:divide-slate-800 rtl:divide-x-reverse">
        {actions.map(({ icon: Icon, onClick: handler, label, tone = "default" }) => (
          <button
            key={label}
            onClick={handler}
            title={label}
            aria-label={label}
            className={`flex-1 py-2.5 flex items-center justify-center transition-colors ${
              tone === "danger"
                ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                : tone === "primary"
                ? "text-primary hover:bg-primary/5"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>
    )}
  </motion.div>
);

export default AdminCard;

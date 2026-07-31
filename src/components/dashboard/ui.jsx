import { AnimatePresence, motion } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";

/**
 * Dashboard design system.
 *
 * Structure and component vocabulary follow the patchi-cafe admin console —
 * eyebrow + serif title headers, greige cards on a cream page, an accent-gold
 * primary button, one shared modal shell — but every colour comes from this
 * project's own brand tokens rather than the café's palette. The roles line up:
 *
 *   forest-800 → primary        (deep teal, sidebar and headings)
 *   brass-500  → accent         (gold, primary actions and prices)
 *   cream-100  → secondary-light (page background)
 *   greige-200 → secondary      (card surfaces)
 *
 * Components reference tokens only; there are no one-off hex values here.
 */

export function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-wider text-accent">{eyebrow}</p>
        )}
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-primary dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export function Card({ className = "", children, ...props }) {
  return (
    <div
      {...props}
      className={`rounded-2xl border border-secondary-dark/40 bg-secondary/60 dark:border-slate-800 dark:bg-slate-900 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({ className = "", ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium
                  text-primary-dark shadow transition-all hover:bg-accent-dark hover:text-white
                  active:scale-95 disabled:opacity-60 disabled:active:scale-100 ${className}`}
    />
  );
}

export function SecondaryButton({ className = "", ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-secondary-dark
                  px-4 py-2.5 text-sm text-primary transition-colors hover:bg-secondary-light
                  dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800 ${className}`}
    />
  );
}

export function DangerButton({ className = "", ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm
                  font-medium text-white shadow transition-all hover:bg-red-600 active:scale-95
                  disabled:opacity-60 ${className}`}
    />
  );
}

export function EmptyState({ message, icon: Icon, action }) {
  return (
    <div className="p-10 text-center">
      {Icon && (
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Icon size={22} />
        </span>
      )}
      <p className="font-medium text-gray-600 dark:text-gray-400">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function NoAccess({ message }) {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
        <AlertTriangle size={22} />
      </div>
      <h2 className="font-display text-xl font-bold text-primary dark:text-white">
        You do not have access to this page
      </h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
}

/**
 * A number that animates whenever it changes — the new value slides up past the
 * old one rather than snapping, so a live count reads as "updating".
 *
 * `mode="popLayout"` pulls the outgoing digit out of layout flow so the incoming
 * one moves straight into its place with no gap or jump.
 */
export function AnimatedCount({ value, className = "" }) {
  return (
    <span className={`relative inline-grid overflow-hidden ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="col-start-1 row-start-1"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Pill carrying an AnimatedCount, for live tallies beside a label. */
export function CountBadge({ value, active = false, className = "" }) {
  return (
    <span
      className={`inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
        active
          ? "bg-white/25 text-white"
          : "bg-primary/10 text-primary dark:bg-primary/20 dark:text-white"
      } ${className}`}
    >
      <AnimatedCount value={value} />
    </span>
  );
}

/** Headline figure with a label and an icon chip. */
export function MetricCard({ label, value, icon: Icon, iconClass = "", children }) {
  return (
    <Card className="flex items-center justify-between gap-4 p-5 sm:p-6">
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p className="truncate text-2xl sm:text-3xl font-bold text-primary dark:text-white">
          {value}
        </p>
        {children}
      </div>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon size={20} />
      </div>
    </Card>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative flex h-7 w-14 shrink-0 items-center rounded-full border px-1 shadow-inner transition-all duration-300 ${
        checked
          ? "border-primary bg-primary"
          : "border-secondary-dark/70 bg-secondary-light dark:border-slate-700 dark:bg-slate-800"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full shadow-md transition-transform duration-300 rtl:-scale-x-100 ${
          checked ? "translate-x-7 bg-accent" : "translate-x-0 bg-gray-400"
        }`}
      />
    </button>
  );
}

/**
 * Shared chrome for add/edit modals: backdrop, sticky header with an optional
 * icon, a scrolling body, and a sticky footer for actions.
 *
 * The panel is a <form>, so callers keep using native onSubmit and this owns
 * only the frame.
 */
export function ModalShell({
  open,
  onClose,
  onSubmit,
  icon: Icon,
  title,
  subtitle,
  maxWidth = "max-w-xl",
  footer,
  children,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-primary-dark/60 p-4 backdrop-blur-sm"
        >
          <motion.form
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={onSubmit}
            className={`flex max-h-[90dvh] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl
                        border border-accent/20 bg-secondary/80 dark:bg-slate-900 dark:border-slate-800 shadow-2xl`}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-secondary-dark/60 dark:border-slate-800 bg-secondary-light/60 dark:bg-slate-800/40 px-5 sm:px-6 py-4">
              <div className="flex min-w-0 items-center gap-3">
                {Icon && (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-accent">
                    <Icon size={18} />
                  </span>
                )}
                <div className="min-w-0">
                  <h3 className="truncate font-display text-lg font-bold text-primary dark:text-white">
                    {title}
                  </h3>
                  {subtitle && (
                    <p className="truncate text-xs text-gray-600 dark:text-gray-400">{subtitle}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 text-gray-400 transition-colors hover:text-primary dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>

            {footer && (
              <div className="flex shrink-0 gap-3 border-t border-secondary-dark/60 dark:border-slate-800 bg-secondary/60 dark:bg-slate-900 px-5 sm:px-6 py-4">
                {footer}
              </div>
            )}
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Label + control row used across the admin forms. */
export function Field({ label, hint, children, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

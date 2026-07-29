const Badge = ({ children, variant = "default", size = "sm", className = "" }) => {
  const variants = {
    default: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300",
    primary: "bg-primary/10 text-primary dark:bg-primary/20",
    success: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
    warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200",
    danger: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
    offer: "bg-accent/20 text-accent-dark dark:bg-accent/30",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-lg ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;

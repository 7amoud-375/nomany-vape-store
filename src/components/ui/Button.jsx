import { forwardRef } from "react";

const Button = forwardRef((
  {
    children,
    variant = "primary",
    size = "md",
    className = "",
    isLoading = false,
    disabled = false,
    ...props
  },
  ref
) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-primary text-white hover:bg-primary-light active:bg-primary-dark shadow-sm hover:shadow-md",
    secondary: "bg-secondary text-primary hover:bg-secondary-dark border border-primary/10",
    ghost: "text-primary hover:bg-primary/5 active:bg-primary/10",
    outline: "border-2 border-primary text-primary hover:bg-primary hover:text-white",
    danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
    icon: "p-2",
  };

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        children
      )}
    </button>
  );
});

Button.displayName = "Button";
export default Button;

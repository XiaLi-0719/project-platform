import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

const variantStyles = {
  primary:
    "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
  secondary:
    "border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline:
    "border border-border bg-transparent hover:bg-muted text-foreground",
  ghost: "text-foreground hover:bg-muted",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
  link: "text-primary underline-offset-4 hover:underline",
} as const;

const sizeStyles = {
  sm: "h-8 gap-1.5 rounded-md px-3 text-xs",
  md: "h-10 gap-2 rounded-lg px-4 text-sm",
  lg: "h-11 gap-2 rounded-lg px-5 text-base",
  icon: "h-10 w-10 rounded-lg p-0",
} as const;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  loading?: boolean;
  asChild?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden
            />
            <span className="sr-only">加载中</span>
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

export type ButtonLinkProps = Omit<
  React.ComponentProps<typeof Link>,
  "className"
> & {
  className?: string;
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
};

export function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  );
}

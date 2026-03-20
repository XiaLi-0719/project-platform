import * as React from "react";
import { cn } from "@/lib/cn";

const variants = {
  default: "border-border bg-muted/50 text-foreground",
  destructive:
    "border-destructive/30 bg-destructive/10 text-destructive dark:text-red-200",
  success:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
} as const;

export function Alert({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof variants }) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

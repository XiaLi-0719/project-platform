import { cn } from "@/lib/cn";

export function FieldError({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("mt-1.5 text-sm text-destructive", className)}
      {...props}
    />
  );
}

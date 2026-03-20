import { cn } from "@/lib/cn";

export function Spinner({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const s =
    size === "sm" ? "h-4 w-4 border-2" : size === "lg" ? "h-8 w-8 border-[3px]" : "h-5 w-5 border-2";
  return (
    <span
      className={cn(
        "inline-block animate-spin rounded-full border-primary border-t-transparent",
        s,
        className
      )}
      role="status"
      aria-label="加载中"
    />
  );
}

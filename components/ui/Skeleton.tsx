import { cn } from "@/lib/cn";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      {...props}
    />
  );
}

/** 列表行骨架 */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 py-4", className)}>
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-3/5 max-w-xs" />
        <Skeleton className="h-3 w-2/5 max-w-[200px]" />
      </div>
    </div>
  );
}

/** 页面标题区骨架 */
export function SkeletonPageHeader() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-64 max-w-full" />
      <Skeleton className="h-4 w-full max-w-lg" />
    </div>
  );
}

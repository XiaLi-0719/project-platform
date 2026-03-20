import { Skeleton, SkeletonPageHeader, SkeletonRow } from "@/components/ui/Skeleton";

/** 路由切换时的全局骨架屏 */
export default function Loading() {
  return (
    <div className="container-page animate-fade-in py-8 sm:py-10">
      <SkeletonPageHeader />
      <div className="mt-10 space-y-0 divide-y divide-border rounded-xl border border-border bg-card p-4 shadow-card">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl hidden lg:block" />
      </div>
    </div>
  );
}

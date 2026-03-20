type Props = {
  overdueCount: number;
  dueSoonCount: number;
  openWithDeadline: number;
};

export function OverdueTaskStats({
  overdueCount,
  dueSoonCount,
  openWithDeadline,
}: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-red-300/80">
          延期任务
        </p>
        <p className="mt-2 text-3xl font-bold text-red-400">{overdueCount}</p>
        <p className="mt-1 text-xs text-zinc-500">
          已设截止日期且未完成、已超过结束时间
        </p>
      </div>
      <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-200/80">
          3 日内到期
        </p>
        <p className="mt-2 text-3xl font-bold text-amber-300">{dueSoonCount}</p>
        <p className="mt-1 text-xs text-zinc-500">指派给您且尚未完成</p>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          有截止日的进行中任务
        </p>
        <p className="mt-2 text-3xl font-bold text-zinc-100">{openWithDeadline}</p>
        <p className="mt-1 text-xs text-zinc-500">未完成且填写了结束时间</p>
      </div>
    </div>
  );
}

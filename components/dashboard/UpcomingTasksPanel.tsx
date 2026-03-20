import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

export type UpcomingTaskItem = {
  id: string;
  title: string;
  endDate: string;
  status: string;
  project: { id: string; name: string };
};

const statusLabel: Record<string, string> = {
  PENDING: "待处理",
  IN_PROGRESS: "进行中",
  BLOCKED: "阻塞",
};

export function UpcomingTasksPanel({ tasks }: { tasks: UpcomingTaskItem[] }) {
  if (tasks.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">
        未来 3 天内没有即将到期的任务。
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-800">
      {tasks.map((t) => (
        <li key={t.id} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0">
          <div className="min-w-0 flex-1">
            <Link
              href={`/projects/${t.project.id}`}
              className="font-medium text-white hover:text-sky-400"
            >
              {t.title}
            </Link>
            <p className="mt-0.5 text-xs text-zinc-500">{t.project.name}</p>
            <span className="mt-1 inline-block rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
              {statusLabel[t.status] ?? t.status}
            </span>
          </div>
          <div className="text-right text-xs text-zinc-400">
            <p className="font-mono text-amber-200/90">
              {format(new Date(t.endDate), "MM-dd HH:mm", { locale: zhCN })}
            </p>
            <p className="mt-0.5 text-zinc-500">
              {formatDistanceToNow(new Date(t.endDate), {
                addSuffix: true,
                locale: zhCN,
              })}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

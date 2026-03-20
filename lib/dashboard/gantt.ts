const DAY_MS = 86_400_000;

export type ProjectForGantt = {
  id: string;
  name: string;
  number: string;
  createdAt: Date;
  updatedAt: Date;
  tasks: {
    status: string;
    startDate: Date | null;
    endDate: Date | null;
  }[];
};

export type GanttChartRow = {
  projectId: string;
  name: string;
  number: string;
  /** Y 轴短标签 */
  label: string;
  /** 距锚点的天数 */
  offsetDays: number;
  /** 跨度天数（至少 1） */
  durationDays: number;
  progress: number;
  startAt: string;
  endAt: string;
};

function clampRange(start: Date, end: Date): { start: Date; end: Date } {
  if (end.getTime() <= start.getTime()) {
    return { start, end: new Date(start.getTime() + DAY_MS) };
  }
  return { start, end };
}

/** 根据项目与任务推算甘特条的起止时间与进度 */
export function buildGanttRows(projects: ProjectForGantt[]): {
  rows: GanttChartRow[];
  anchor: Date;
  xMaxDays: number;
} {
  const now = Date.now();
  const rows: GanttChartRow[] = [];

  for (const p of projects) {
    const tasks = p.tasks;
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "COMPLETED").length;
    const progress = total === 0 ? 0 : Math.round((done / total) * 100);

    const starts = tasks
      .map((t) => t.startDate?.getTime())
      .filter((t): t is number => t != null);
    const ends = tasks
      .map((t) => t.endDate?.getTime())
      .filter((t): t is number => t != null);

    let start = p.createdAt;
    let end = p.updatedAt;

    if (starts.length && ends.length) {
      start = new Date(Math.min(...starts, p.createdAt.getTime()));
      end = new Date(Math.max(...ends));
    } else if (ends.length) {
      end = new Date(Math.max(...ends));
      start = new Date(
        Math.min(
          p.createdAt.getTime(),
          end.getTime() - 14 * DAY_MS
        )
      );
    } else if (starts.length) {
      start = new Date(Math.min(...starts));
      end = new Date(Math.max(start.getTime() + 14 * DAY_MS, p.updatedAt.getTime()));
    } else {
      end = new Date(
        Math.max(p.updatedAt.getTime(), p.createdAt.getTime() + 7 * DAY_MS)
      );
    }

    const r = clampRange(start, end);
    start = r.start;
    end = r.end;

    // 若已结束且进度未满，略微延长展示末端
    if (progress < 100 && end.getTime() < now) {
      end = new Date(Math.max(end.getTime(), now + 3 * DAY_MS));
    }

    const label =
      p.name.length > 14 ? `${p.name.slice(0, 12)}…` : p.name;

    rows.push({
      projectId: p.id,
      name: p.name,
      number: p.number,
      label,
      offsetDays: 0,
      durationDays: 1,
      progress,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    });
  }

  if (rows.length === 0) {
    const anchor = new Date(now - 30 * DAY_MS);
    return { rows: [], anchor, xMaxDays: 60 };
  }

  const minStart = Math.min(
    ...rows.map((r) => new Date(r.startAt).getTime())
  );
  const maxEnd = Math.max(...rows.map((r) => new Date(r.endAt).getTime()));

  const anchor = new Date(minStart - 3 * DAY_MS);
  const anchorMs = anchor.getTime();

  for (const row of rows) {
    const s = new Date(row.startAt).getTime();
    const e = new Date(row.endAt).getTime();
    row.offsetDays = (s - anchorMs) / DAY_MS;
    row.durationDays = Math.max(1, (e - s) / DAY_MS);
  }

  const xMaxDays =
    (maxEnd - anchorMs) / DAY_MS + 5;

  return { rows, anchor, xMaxDays };
}

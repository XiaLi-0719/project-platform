"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { GanttChartRow } from "@/lib/dashboard/gantt";

type Props = {
  rows: GanttChartRow[];
  xMaxDays: number;
  anchorIso: string;
};

function barColor(progress: number) {
  if (progress >= 100) return "#22c55e";
  if (progress >= 60) return "#0ea5e9";
  if (progress >= 30) return "#eab308";
  return "#f97316";
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: GanttChartRow; dataKey?: string }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[payload.length - 1].payload;
  return (
    <div className="rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-white">{row.name}</p>
      <p className="mt-1 font-mono text-zinc-400">{row.number}</p>
      <p className="mt-2 text-zinc-300">
        {format(new Date(row.startAt), "yyyy-MM-dd", { locale: zhCN })} →{" "}
        {format(new Date(row.endAt), "yyyy-MM-dd", { locale: zhCN })}
      </p>
      <p className="mt-1 text-sky-300">进度：约 {row.progress}%（按任务完成数）</p>
      <Link
        href={`/projects/${row.projectId}`}
        className="mt-2 inline-block text-sky-400 hover:text-sky-300"
      >
        打开项目 →
      </Link>
    </div>
  );
}

export function ProjectGanttChart({ rows, xMaxDays, anchorIso }: Props) {
  if (rows.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40 text-sm text-zinc-500">
        暂无参与的项目，或项目下无任务时间数据。加入项目后将显示进度甘特条。
      </div>
    );
  }

  const anchor = new Date(anchorIso);

  return (
    <div className="w-full">
      <p className="mb-2 text-xs text-zinc-500">
        横轴为相对时间（天），条带表示根据任务起止日聚合后的计划区间；颜色表示任务完成占比。
        <span className="ml-2 text-zinc-600">
          起点锚点：{format(anchor, "yyyy-MM-dd", { locale: zhCN })}
        </span>
      </p>
      <div className="h-[360px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={rows}
            margin={{ top: 8, right: 24, left: 4, bottom: 8 }}
            barCategoryGap={12}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, Math.max(xMaxDays, 7)]}
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              stroke="#52525b"
              tickFormatter={(v) => `+${Math.round(Number(v))}d`}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={108}
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              stroke="#52525b"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(39,39,42,0.35)" }} />
            <Bar dataKey="offsetDays" stackId="gantt" fill="transparent" isAnimationActive={false} />
            <Bar dataKey="durationDays" stackId="gantt" name="计划区间" isAnimationActive={false}>
              {rows.map((row, i) => (
                <Cell key={row.projectId + i} fill={barColor(row.progress)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

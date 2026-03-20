"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
  createMeetingSchema,
  type CreateMeetingInput,
} from "@/lib/validations/meeting";

type MemberOption = { id: string; name: string; email: string };

export function MeetingForm({
  projectId,
  members,
}: {
  projectId: string;
  members: MemberOption[];
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateMeetingInput>({
    resolver: zodResolver(createMeetingSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      attendeeIds: [],
    },
  });

  const selected = watch("attendeeIds") ?? [];

  const toggleAttendee = (userId: string) => {
    const next = selected.includes(userId)
      ? selected.filter((id) => id !== userId)
      : [...selected, userId];
    setValue("attendeeIds", next, { shouldValidate: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    const res = await fetch(`/api/projects/${projectId}/meetings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      meeting?: { id: string };
    };
    if (!res.ok) {
      toast.error(data.error || "创建失败");
      return;
    }
    toast.success("会议已创建");
    if (data.meeting?.id) {
      router.push(`/projects/${projectId}/meetings/${data.meeting.id}`);
    } else {
      router.push(`/projects/${projectId}/meetings`);
    }
    router.refresh();
  });

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto max-w-xl space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6"
    >
      <div>
        <label className="text-sm text-zinc-400">标题 *</label>
        <input
          {...register("title")}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600"
        />
        {errors.title && (
          <p className="mt-1 text-xs text-rose-400">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm text-zinc-400">说明</label>
        <textarea
          {...register("description")}
          rows={3}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm text-zinc-400">开始时间 *</label>
          <input
            type="datetime-local"
            {...register("startTime")}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600"
          />
          {errors.startTime && (
            <p className="mt-1 text-xs text-rose-400">
              {errors.startTime.message}
            </p>
          )}
        </div>
        <div>
          <label className="text-sm text-zinc-400">结束时间 *</label>
          <input
            type="datetime-local"
            {...register("endTime")}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600"
          />
          {errors.endTime && (
            <p className="mt-1 text-xs text-rose-400">
              {errors.endTime.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm text-zinc-400">与会人员（项目成员）</p>
        <p className="mt-1 text-xs text-zinc-500">
          可多选；纪要转发将通知所选成员及创建人。
        </p>
        <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-zinc-800 p-3">
          {members.length === 0 ? (
            <li className="text-sm text-zinc-500">暂无项目成员可邀请</li>
          ) : (
            members.map((m) => (
              <li key={m.id}>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    checked={selected.includes(m.id)}
                    onChange={() => toggleAttendee(m.id)}
                    className="rounded border-zinc-600 bg-zinc-900 text-sky-600"
                  />
                  <span>{m.name}</span>
                  <span className="text-xs text-zinc-500">{m.email}</span>
                </label>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {isSubmitting ? "提交中…" : "创建会议"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          取消
        </button>
      </div>
    </form>
  );
}

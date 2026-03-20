import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthApi } from "@/lib/api/session";

export async function requireProjectAccess(projectId: string) {
  const auth = await requireAuthApi();
  if (!auth.ok) return { ok: false as const, response: auth.response };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  if (!project) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "项目不存在" }, { status: 404 }),
    };
  }

  return { ok: true as const, session: auth.session, projectId: project.id };
}

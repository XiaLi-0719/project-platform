import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApprovalFlowSettings } from "@/components/approvals/ApprovalFlowSettings";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await prisma.project.findUnique({
    where: { id: params.id },
    select: { name: true },
  });
  return { title: p?.name ? `${p.name} · 审批流` : "审批流配置" };
}

export default async function ProjectApprovalsPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/login?callbackUrl=/projects/${params.id}/approvals`);
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <ApprovalFlowSettings projectId={project.id} projectName={project.name} />
    </main>
  );
}

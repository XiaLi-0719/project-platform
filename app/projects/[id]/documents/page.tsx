import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentsManager } from "@/components/documents/DocumentsManager";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { name: true },
  });
  return {
    title: project?.name ? `${project.name} · 文档` : "项目文档",
  };
}

export default async function ProjectDocumentsPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/login?callbackUrl=/projects/${params.id}/documents`);
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true },
  });

  if (!project) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <DocumentsManager projectId={project.id} projectName={project.name} />
    </main>
  );
}

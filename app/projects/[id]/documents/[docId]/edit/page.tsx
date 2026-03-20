import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentEditorClient } from "@/components/documents/DocumentEditorClient";

type Props = { params: { id: string; docId: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = await prisma.document.findFirst({
    where: { id: params.docId, projectId: params.id },
    select: { title: true },
  });
  return { title: doc?.title ? `编辑 · ${doc.title}` : "编辑文档" };
}

export default async function DocumentEditPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(
      `/login?callbackUrl=/projects/${params.id}/documents/${params.docId}/edit`
    );
  }

  const [doc, project] = await Promise.all([
    prisma.document.findFirst({
      where: { id: params.docId, projectId: params.id },
      select: {
        id: true,
        title: true,
        number: true,
        content: true,
        version: true,
        status: true,
        updatedAt: true,
      },
    }),
    prisma.project.findUnique({
      where: { id: params.id },
      select: { name: true },
    }),
  ]);

  if (!doc || !project) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <DocumentEditorClient
        projectId={params.id}
        projectName={project.name}
        docId={doc.id}
        initialTitle={doc.title}
        initialNumber={doc.number}
        initialContent={doc.content ?? ""}
        initialVersion={doc.version}
        initialStatus={doc.status}
        initialUpdatedAt={doc.updatedAt.toISOString()}
      />
    </main>
  );
}

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TemplateEditorClient } from "@/components/templates/TemplateEditorClient";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await prisma.template.findUnique({
    where: { id: params.id },
    select: { name: true },
  });
  return { title: t?.name ? `编辑 · ${t.name}` : "编辑模板" };
}

export default async function TemplateEditPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/templates/${params.id}/edit`);
  }

  const template = await prisma.template.findUnique({
    where: { id: params.id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!template) notFound();

  const canEdit = template.createdById === session.user.id;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <TemplateEditorClient
        templateId={template.id}
        initialName={template.name}
        initialType={template.type}
        initialVersion={template.version}
        initialContent={template.content}
        initialUpdatedAt={template.updatedAt.toISOString()}
        createdByName={template.createdBy.name}
        canEdit={canEdit}
      />
    </main>
  );
}

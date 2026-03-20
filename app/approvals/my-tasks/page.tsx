import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MyApprovalTasks } from "@/components/approvals/MyApprovalTasks";

export const metadata: Metadata = {
  title: "我的审批待办",
};

export default async function MyApprovalTasksPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login?callbackUrl=/approvals/my-tasks");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <MyApprovalTasks />
    </main>
  );
}

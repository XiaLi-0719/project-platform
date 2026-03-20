import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NotificationsListClient } from "@/components/notifications/NotificationsListClient";

export const metadata: Metadata = {
  title: "通知中心",
};

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login?callbackUrl=/notifications");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <NotificationsListClient />
    </main>
  );
}

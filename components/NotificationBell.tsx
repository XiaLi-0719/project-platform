"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, Transition } from "@headlessui/react";
import { BellIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { notificationTypeLabel } from "@/lib/notifications/types";

type NotificationItem = {
  id: string;
  title: string;
  content: string;
  type: string;
  read: boolean;
  createdAt: string;
};

const POLL_MS = 20_000;

function classNames(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const cursorRef = useRef<string | null>(null);
  const bootstrapped = useRef(false);

  const showToast = useCallback((n: NotificationItem) => {
    const typeLabel = notificationTypeLabel[n.type] ?? n.type;
    toast.custom(
      () => (
        <div className="max-w-sm rounded-lg border border-border bg-card px-4 py-3 shadow-card-lg">
          <p className="text-xs font-medium text-primary">{typeLabel}</p>
          <p className="mt-1 text-sm font-semibold text-card-foreground">{n.title}</p>
          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{n.content}</p>
          <Link
            href="/notifications"
            className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
          >
            查看全部
          </Link>
        </div>
      ),
      { duration: 8000, id: `notif-${n.id}` }
    );
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=25");
      const data = await res.json();
      if (!res.ok) return;
      setItems(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
      const list = data.notifications as NotificationItem[];
      if (list.length > 0) {
        cursorRef.current = list[0].createdAt;
      } else {
        cursorRef.current = new Date().toISOString();
      }
      bootstrapped.current = true;
    } catch {
      /* ignore */
    }
  }, []);

  const poll = useCallback(async () => {
    if (!bootstrapped.current || !cursorRef.current) return;
    try {
      const since = encodeURIComponent(cursorRef.current);
      const res = await fetch(`/api/notifications?since=${since}&limit=50`);
      const data = await res.json();
      if (!res.ok) return;

      const incoming = (data.notifications ?? []) as NotificationItem[];
      for (const n of incoming) {
        showToast(n);
        if (
          !cursorRef.current ||
          n.createdAt.localeCompare(cursorRef.current) > 0
        ) {
          cursorRef.current = n.createdAt;
        }
      }

      const r2 = await fetch("/api/notifications?limit=1");
      const d2 = await r2.json();
      if (r2.ok) setUnreadCount(d2.unreadCount ?? 0);

      if (incoming.length > 0) {
        const newestFirst = [...incoming].reverse();
        setItems((prev) => {
          const ids = new Set(newestFirst.map((x) => x.id));
          const rest = prev.filter((p) => !ids.has(p.id));
          return [...newestFirst, ...rest].slice(0, 25);
        });
      }
    } catch {
      /* ignore */
    }
  }, [showToast]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, [poll]);

  async function markRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      setItems((prev) =>
        prev.map((x) => (x.id === id ? { ...x, read: true } : x))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  }

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
        <BellIcon className="h-6 w-6" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        <span className="sr-only">通知</span>
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-[60] mt-2 w-[min(calc(100vw-2rem),22rem)] origin-top-right rounded-xl border border-border bg-card shadow-card-lg focus:outline-none">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">通知</h3>
            <Menu.Item>
              {({ active }) => (
                <Link
                  href="/notifications"
                  className={classNames(
                    active ? "text-primary" : "",
                    "text-xs font-medium text-primary hover:underline"
                  )}
                >
                  全部
                </Link>
              )}
            </Menu.Item>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                暂无通知
              </p>
            ) : (
              items.map((n) => (
                <Menu.Item key={n.id}>
                  {({ active }) => (
                    <button
                      type="button"
                      onClick={() => {
                        if (!n.read) markRead(n.id);
                      }}
                      className={classNames(
                        "w-full border-b border-border px-4 py-3 text-left last:border-0",
                        !n.read ? "bg-primary/5" : "",
                        active ? "bg-muted" : ""
                      )}
                    >
                      <p className="text-xs text-primary">
                        {notificationTypeLabel[n.type] ?? n.type}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {n.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {n.content}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground/80">
                        {formatDistanceToNow(new Date(n.createdAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </p>
                    </button>
                  )}
                </Menu.Item>
              ))
            )}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

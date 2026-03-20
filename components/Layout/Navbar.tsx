"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Dialog,
  DialogBackdrop,
  DialogPanel,
} from "@headlessui/react";
import {
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Squares2X2Icon,
  ChevronDownIcon,
  FolderIcon,
  ClipboardDocumentCheckIcon,
  AcademicCapIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

const navLinks: { href: string; label: string; requireAuth?: boolean }[] = [
  { href: "/", label: "首页" },
  { href: "/dashboard", label: "仪表盘", requireAuth: true },
  { href: "/projects", label: "项目", requireAuth: true },
  { href: "/notifications", label: "通知", requireAuth: true },
  { href: "/certificates", label: "证书", requireAuth: true },
  { href: "/templates", label: "DHF模板", requireAuth: true },
];

function NavLink({
  href,
  children,
  onNavigate,
  mobile,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "rounded-lg text-sm font-medium transition-colors",
        mobile
          ? "block px-3 py-3 text-base"
          : "px-2 py-1.5",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}

export function Navbar() {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userLinks = [
    { href: "/dashboard", label: "仪表盘", Icon: Squares2X2Icon },
    { href: "/projects", label: "项目", Icon: FolderIcon },
    { href: "/approvals/my-tasks", label: "审批待办", Icon: ClipboardDocumentCheckIcon },
    { href: "/notifications", label: "通知中心", Icon: Squares2X2Icon },
    { href: "/certificates", label: "GCP 证书", Icon: AcademicCapIcon },
    { href: "/templates", label: "DHF 模板", Icon: FolderIcon },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/70">
      <div className="container-page flex h-14 max-w-6xl items-center justify-between lg:h-16">
        <div className="flex items-center gap-3 lg:gap-10">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
          >
            App
          </Link>

          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="主导航"
          >
            {navLinks.map((item) => {
              if (item.requireAuth && !session) return null;
              return (
                <NavLink key={item.href} href={item.href}>
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          {status === "loading" ? (
            <div className="flex items-center gap-2">
              <Skeleton className="hidden h-9 w-[5.5rem] sm:block" />
              <Skeleton className="h-9 w-9 rounded-lg sm:hidden" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          ) : session?.user ? (
            <>
              <div className="hidden sm:block">
                <NotificationBell />
              </div>
              <Menu as="div" className="relative hidden md:block">
                <MenuButton className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-card-foreground shadow-sm transition-colors hover:bg-muted">
                  <UserCircleIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="max-w-[100px] truncate text-left sm:max-w-[160px]">
                    {session.user.name || session.user.email}
                  </span>
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                </MenuButton>
                <MenuItems
                  transition
                  anchor="bottom end"
                  className="z-[60] mt-2 w-56 origin-top-right rounded-xl border border-border bg-card py-1 shadow-card-lg outline-none [--anchor-gap:8px] data-[closed]:scale-95 data-[closed]:opacity-0"
                >
                  <div className="border-b border-border px-3 py-2">
                    <p className="truncate text-xs text-muted-foreground">已登录</p>
                    <p className="truncate text-sm font-medium text-foreground">
                      {session.user.email}
                    </p>
                    {session.user.role && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        角色：{session.user.role}
                      </p>
                    )}
                  </div>
                  {userLinks.map(({ href, label, Icon }) => (
                    <MenuItem key={href}>
                      {({ focus }) => (
                        <Link
                          href={href}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm text-card-foreground",
                            focus && "bg-muted"
                          )}
                        >
                          <Icon className="h-4 w-5 text-muted-foreground" />
                          {label}
                        </Link>
                      )}
                    </MenuItem>
                  ))}
                  <MenuItem>
                    {({ focus }) => (
                      <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive",
                          focus && "bg-destructive/10"
                        )}
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-5" />
                        退出登录
                      </button>
                    )}
                  </MenuItem>
                </MenuItems>
              </Menu>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="打开菜单"
                onClick={() => setMobileOpen(true)}
              >
                <Bars3Icon className="h-6 w-6" />
              </Button>
            </>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                登录
              </ButtonLink>
              <ButtonLink href="/register" variant="primary" size="sm">
                注册
              </ButtonLink>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="打开菜单"
                onClick={() => setMobileOpen(true)}
              >
                <Bars3Icon className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>
      </div>

      <Dialog open={mobileOpen} onClose={setMobileOpen} className="relative z-[70] md:hidden">
        <DialogBackdrop className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
        <div className="fixed inset-0 flex justify-end">
          <DialogPanel
            transition
            className="flex h-full w-[min(100%,20rem)] flex-col border-l border-border bg-card shadow-card-lg data-[closed]:translate-x-4 data-[closed]:opacity-0"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="font-semibold text-foreground">菜单</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="关闭"
                onClick={() => setMobileOpen(false)}
              >
                <XMarkIcon className="h-6 w-6" />
              </Button>
            </div>
            <div className="border-b border-border px-4 py-3">
              <p className="mb-2 text-xs text-muted-foreground">主题</p>
              <ThemeToggle className="w-full justify-center" />
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              {navLinks.map((item) => {
                if (item.requireAuth && !session) return null;
                return (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    mobile
                    onNavigate={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                );
              })}
              {session?.user ? (
                <>
                  <div className="my-2 border-t border-border pt-2">
                    <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      账户
                    </p>
                    <div className="mb-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {session.user.name || session.user.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                    {userLinks.map(({ href, label, Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-3 text-base text-foreground hover:bg-muted"
                      >
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        {label}
                      </Link>
                    ))}
                    <div className="mt-2 px-2">
                      <NotificationBell />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        void signOut({ callbackUrl: "/login" });
                      }}
                      className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-3 text-base text-destructive hover:bg-destructive/10"
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5" />
                      退出登录
                    </button>
                  </div>
                </>
              ) : null}
            </nav>
          </DialogPanel>
        </div>
      </Dialog>
    </header>
  );
}

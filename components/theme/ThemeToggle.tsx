"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/cn";

const options = [
  { value: "light", label: "浅色", Icon: SunIcon },
  { value: "dark", label: "深色", Icon: MoonIcon },
  { value: "system", label: "系统", Icon: ComputerDesktopIcon },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={cn("h-9 w-[5.5rem] animate-pulse rounded-lg bg-muted", className)}
        aria-hidden
      />
    );
  }

  const active = theme ?? "system";

  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-border bg-card p-0.5 shadow-sm",
        className
      )}
      role="group"
      aria-label="主题"
    >
      {options.map(({ value, label, Icon }) => {
        const isOn = active === value;
        return (
          <button
            key={value}
            type="button"
            title={label}
            aria-pressed={isOn}
            onClick={() => setTheme(value)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
              isOn
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

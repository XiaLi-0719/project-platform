import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 Tailwind 类名并解决冲突 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

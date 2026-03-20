"use client";

import { Toaster } from "react-hot-toast";

/** 根布局挂载的全局 Toast（需在客户端渲染） */
export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 4000,
        className:
          "!bg-card !text-card-foreground !border !border-border !shadow-card-lg",
      }}
    />
  );
}

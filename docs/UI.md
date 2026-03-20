# UI 设计系统

## 主题

- 使用 **next-themes**，在 `<html>` 上切换 `class="dark"`。
- 语义色定义在 `app/globals.css` 的 CSS 变量中，**浅色 / 深色** 两套。
- Tailwind 映射见 `tailwind.config.ts`（`background`、`foreground`、`primary`、`card`、`muted`、`border` 等）。

## 可复用组件 (`components/ui/`)

| 组件 | 用途 |
|------|------|
| `Button` / `ButtonLink` | 主按钮、描边、幽灵、危险等变体；`loading` 显示旋转指示 |
| `Card` + `CardHeader` / `CardContent` / … | 统一卡片与分区 |
| `Input` / `Textarea` | 表单控件 |
| `Label` / `FieldError` | 标签与校验文案 |
| `Alert` | 提示条（`destructive` / `success`） |
| `Skeleton` / `Spinner` | 骨架屏与加载动画 |

合并类名请使用 `import { cn } from "@/lib/cn"`。

## 布局

- **页面水平留白**：`container-page`（宽屏 `max-w-6xl`）或 `container-page-narrow`（`max-w-3xl`）。
- **导航**：`components/Layout/Navbar.tsx` — 桌面顶栏 + **移动端抽屉**（含主题切换）。
- **路由加载**：`app/loading.tsx` 为全局骨架屏。

## 新页面建议

1. 外层 `main` 使用 `container-page py-8 sm:py-10`。
2. 标题 `text-foreground`，说明 `text-muted-foreground`。
3. 区块使用 `Card` 或 `rounded-xl border border-border bg-card shadow-card`。
4. 链接强调色：`text-primary` + `hover:underline`。

Markdown 编辑器可继续用 `data-color-mode="dark"`；若需随系统主题切换，可在客户端用 `useTheme().resolvedTheme` 包一层。

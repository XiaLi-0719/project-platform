# Fullstack Next.js 14 模板

技术栈：**Next.js 14（App Router）**、**TypeScript**、**Prisma**、**SQLite**、**Tailwind CSS**。

## 目录结构

```
.
├── app/                    # App Router
│   ├── api/                # Route Handlers（后端 API）
│   │   └── health/
│   ├── globals.css         # 全局样式 + Tailwind 入口
│   ├── layout.tsx          # 根布局
│   └── page.tsx            # 首页（服务端组件 + Prisma 示例）
├── components/             # 可复用 UI 组件
├── lib/
│   └── prisma.ts           # Prisma 单例（避免开发环境连接数爆炸）
├── prisma/
│   └── schema.prisma       # 数据模型
├── public/                 # 静态资源
├── .env.example
├── next.config.mjs
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

## 快速开始

1. 安装依赖：

   ```bash
   npm install
   ```

2. 环境变量（可复制示例文件）：

   ```bash
   copy .env.example .env
   ```

3. 生成客户端并创建数据库表：

   ```bash
   npx prisma db push
   ```

4. 启动开发服务：

   ```bash
   npm run dev
   ```

5. 浏览器打开：**http://localhost:3000**

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式 |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产服务 |
| `npm run lint` | ESLint |
| `npm run db:push` | 将 schema 同步到 SQLite |
| `npm run db:studio` | 打开 Prisma Studio 管理数据 |

## API 示例

- `GET /api/health` — 返回 JSON，用于健康检查。

## 说明

- 旧演示项目已替换为本模板；若本地仍有旧的 `node_modules`，建议删除后重新执行 `npm install`。
- 生产环境请改用托管数据库并调整 `datasource`（不仅限于 SQLite）。

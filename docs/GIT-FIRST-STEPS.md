# Git：从 0 到第一次提交

项目根目录：**`c:\Users\andon\Desktop\cusor`**

---

## 0. 安装 Git（若终端里输入 `git` 提示找不到命令）

1. 打开：https://git-scm.com/download/win  
2. 安装时勾选 **“Git from the command line and also from 3rd-party software”**  
3. 安装完成后**重新打开** PowerShell 或终端，再执行下面步骤。

---

## 1. 配置你的名字和邮箱（每台电脑只需一次）

```powershell
git config --global user.name "你的名字"
git config --global user.email "你的邮箱@example.com"
```

---

## 2. 进入项目根目录

```powershell
cd c:\Users\andon\Desktop\cusor
```

---

## 3. 判断是否已有仓库

```powershell
git status
```

- **若提示 `not a git repository`**：继续下面「4a 新建仓库」。  
- **若能正常显示分支/文件状态**：跳过 `git init`，直接从「5」开始。

---

## 4a. 还没有仓库时：初始化并首次提交

```powershell
cd c:\Users\andon\Desktop\cusor

git init
git add .
git commit -m "初始化项目：完整的研发项目协作平台"
```

---

## 4b. 已有仓库时：只提交当前改动

```powershell
cd c:\Users\andon\Desktop\cusor

git status
git add .
git commit -m "说明本次改了什么"
```

---

## 6. 可选：关联远程仓库（GitHub / Gitee 等）

在远程网站新建**空仓库**（不要勾选自动添加 README，避免冲突），然后：

```powershell
cd c:\Users\andon\Desktop\cusor

git remote add origin https://github.com/XiaLi-0719/project-platform.git
git branch -M main
git push -u origin main
```

**若提示 `remote origin already exists`：**

```powershell
git remote set-url origin https://github.com/XiaLi-0719/project-platform.git
git push -u origin main
```

**若 GitHub 上创建仓库时勾选了 README / .gitignore**，推送前需要先拉再推：

```powershell
git pull origin main --allow-unrelated-histories
# 如有冲突，解决后 git add . && git commit
git push -u origin main
```

推送时浏览器或 Git 会提示登录 GitHub（Personal Access Token 或 Git Credential Manager）。

---

## 说明

- 根目录已有 **`.gitignore`**，会忽略 `node_modules`、`.env`、`dev.db` 等，一般无需改。  
- **不要把** `.env`（含密钥）**提交到公开仓库**。

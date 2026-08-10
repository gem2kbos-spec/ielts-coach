# G2Band

本地运行，数据只存在本机 `data/` 目录下（SQLite + JSON 题库）。

## 开发模式

```bash
npm install
npm run dev
```

- 前端（Vite，热更新）：http://localhost:5173
- 后端 API：http://localhost:3000

## 生产模式（构建后单端口运行）

```bash
npm run build
npm run start
```

打开 http://localhost:3000 （前端静态资源由后端一并托管）。

## 目录说明

- `server/` — Express 后端：路由、SQLite 数据层、Claude CLI / whisper.cpp / macOS `say` 的服务封装
- `client/` — React + Vite + Tailwind v4 + shadcn/ui 前端
- `data/` — SQLite 数据库、题库 JSON、用户导入文件、录音文件（均不进版本控制，见 `.gitignore`）
- `skills/` — 供 Claude Code 在对话里直接调用的 8 个 Skill（自然语言入口，详见各自目录下 README）
- `tools/` — whisper.cpp 源码与编译产物、ggml 模型文件

详细架构设计见 `~/.claude/plans/floofy-baking-treasure.md`。

## Claude Code Skill 入口

`skills/` 下的 8 个目录已经软链接到 `~/.claude/skills/`，所以在任意目录跟 Claude Code 聊天，说"练口语 part2""看本周数据""诊断我哪里弱"之类的话都能触发对应模块——**前提是开一个新的 Claude Code 会话**（当前会话在这些 skill 文件创建之前就已经加载了可用技能列表，不会实时刷新）。

如果某个 skill 改了内容，重新跑一下链接即可生效（不需要重新创建）：

```bash
for s in ielts-nav ielts-writing ielts-speaking ielts-diagnosis ielts-dashboard ielts-reading ielts-listening ielts-vocab; do
  ln -sfn ~/ielts-coach/skills/$s ~/.claude/skills/$s
done
```

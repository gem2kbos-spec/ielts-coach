---
name: ielts-nav
description: General entry point for the local IELTS practice app (~/ielts-coach) when the user's request doesn't clearly map to one specific module, or mixes several (e.g. "我想练习一下", "今天练点什么", "帮我安排今天的复习", "生成一篇困难的环境类阅读", "练听力S3"). For requests that clearly name a specific module/skill (写作/口语/阅读/听力/词汇/诊断/数据), prefer the more specific ielts-writing / ielts-speaking / ielts-reading / ielts-listening / ielts-vocab / ielts-diagnosis / ielts-dashboard skill instead — this skill is the fallback router and system overview.
user-invocable: true
allowed-tools:
  - Bash
  - Read
---

# IELTS 练习系统 · 导航

本地应用根目录：`~/ielts-coach`。写作/口语/阅读/听力/词汇/仪表板均已实现。

## 模块路由表

| 用户说的话（示例） | 对应 skill | 浏览器路由 |
|---|---|---|
| 练写作(没说哪个task) | ielts-writing | `/writing` (选择页) |
| 写作task1 / 图表/柱状图/表格描述 | ielts-writing | `/writing/task1` |
| 写作task2 / 写一篇议论文 | ielts-writing | `/writing/task2` |
| 练口语完整流程 / 像真实考试一样练口语 | ielts-speaking | `/speaking/full` |
| 口语part1 / 热身问答 | ielts-speaking | `/speaking/part1` |
| 练口语 / part2 / 抽题说一段 | ielts-speaking | `/speaking/part2` |
| 影子跟读 / 跟读 | ielts-speaking | `/speaking/shadow` |
| 考官模式 / part3 / 真人对话 | ielts-speaking | `/speaking/examiner` |
| 练阅读 / 做阅读题 | ielts-reading | `/reading` |
| 导入PDF阅读真题 | ielts-reading | `/reading/import` |
| **生成一篇XX难度/XX主题的阅读** | ielts-reading | 不开浏览器，直接调生成接口（见下） |
| 练听力 / 做听力题 | ielts-listening | `/listening` |
| 导入听力题(音频+题目) | ielts-listening | `/listening/import` |
| 听力全真模拟 / 4个section | ielts-listening | `/listening/mock` |
| **练听力SX(具体某个section)** | ielts-listening | 不开浏览器选择页，直接定位+打开对应exam(见下) |
| 背单词 / 词汇库 / 标为待巩固 | ielts-vocab | `/vocab` |
| 诊断 / 我哪里弱 / 训练计划 / 听力哪个section最差 | ielts-diagnosis | 不开浏览器，直接在对话里分析 |
| 看数据 / 本周练了多少 / 进度 | ielts-dashboard | 可选打开 `/dashboard`，或直接在对话里给文字摘要 |
| 题库导入 / 拖个文件进去 | （直接打开） | `/import` |

## 处理流程

1. 判断意图属于哪个模块。如果一句话里有明确关键词（写作/口语/阅读/听力/词汇/诊断/数据/导入/生成），直接路由；如果完全无法判断，用一句话反问用户想练什么，不要瞎猜。
2. 如果目标模块需要打开浏览器（写作/口语/阅读/听力/导入/仪表板可视化）：
   - 先跑 `bash ~/ielts-coach/skills/_shared/ensure-server.sh`，它会自动检测/启动本地服务，输出 `READY <base_url>`。
   - 用 `open <base_url><路由>` 打开对应页面（比如 `open http://localhost:5173/writing/task2`）。
   - 告诉用户已经打开，简单说一句接下来要做什么（比如"浏览器已经打开口语练习页，1分钟准备后会自动开始录音"）。
3. 如果目标模块是纯对话型（诊断、数据摘要、AI生成阅读文章），不需要开浏览器，直接调用对应 skill 的脚本/接口拿数据，在对话里给出结论。
4. "生成一篇困难的环境类阅读"这类意图：识别出难度(简单/中等/困难)和主题关键词，参考 `ielts-reading` skill 里"AI 生成新文章"那一段的具体调用步骤（调 `/api/reading/generate/preview`，结果先讲给用户看，用户确认了再入库，不要自动入库）。
5. "练听力S3"这类指定具体section的意图：直接 `curl -s http://localhost:3000/api/listening/sections` 挑一个`section`字段匹配、`completed:false`优先的条目，`open <base_url>/listening/exam/<id>` 直接进去，不用先打开选题菜单让用户自己找。

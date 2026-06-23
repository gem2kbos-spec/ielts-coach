---
name: ielts-writing
description: Open or explain the IELTS Writing practice modules in the local app (~/ielts-coach) — Task 1 (chart/graph/table description, 20min, 150 words) and Task 2 (argumentative essay, 40min, 250 words). Use when the user wants to practice writing, asks about Task 1/Task 2, timing, band scores, Chinglish detection, or band 7/9 rewrites.
user-invocable: true
allowed-tools:
  - Bash
---

# 写作

雅思写作由 Task1(图表/表格描述，权重1) + Task2(议论文，权重2) 组成。

1. 跑 `bash ~/ielts-coach/skills/_shared/ensure-server.sh` 确保服务在跑，拿到 `READY <base_url>`。
2. `open <base_url>/writing` 打开选择页(Task1/Task2两个入口)，或者直接 `open <base_url>/writing/task1` / `open <base_url>/writing/task2` 跳过选择。
3. Task1流程：审题2分→大纲3分→写作13分→检查2分(共20分钟)，题目是柱状图/折线图/饼图/表格(纯前端用recharts渲染结构化数据，没有真实图片)，写完点"提交评分"，得到TA(对Task1来说是"数据描述准确性"而不是"观点")/CC/LR/GRA四项评分+中式英语检测+Band7/Band9对照重写。
4. Task2流程：审题3分→大纲5分→写作30分→检查2分(共40分钟)，跟之前一样。

如果用户问"评一下我这篇作文"并直接把作文文字贴在对话里：可以告诉他们也可以这样做，但更准确的方式是引导他们去网页里走完整流程（因为打分prompt需要原题/原图表数据，网页里题目和作答是绑定的）。如果用户坚持要在对话里直接评，需要先问清楚题目是什么(Task1还是Task2、具体哪道题)，再用curl调用对应接口：

```bash
# Task1
curl -s -X POST http://localhost:3000/api/writing/task1/grade \
  -H "Content-Type: application/json" \
  -d '{"itemId": "<先用 curl http://localhost:3000/api/writing/task1/random 抽一个>", "essayText": "...", "durationSec": 1200}'
# Task2
curl -s -X POST http://localhost:3000/api/writing/task2/grade \
  -H "Content-Type: application/json" \
  -d '{"itemId": "<先用 curl http://localhost:3000/api/writing/task2/random 抽一个>", "essayText": "...", "durationSec": 2400}'
```

数据存在本机 SQLite（`~/ielts-coach/data/ielts.db`），不会上传到任何地方。

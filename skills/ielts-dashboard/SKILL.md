---
name: ielts-dashboard
description: Show a quick text summary of recent IELTS practice data (or AI usage cost), or open the visual dashboard in the browser. Use when the user asks "看本周数据", "这周练了多少", "进度怎么样", "打开仪表板", "这周AI花了多少钱".
user-invocable: true
allowed-tools:
  - Bash
---

# 仪表板

两种情况：

**用户想要快速文字摘要**（比如"这周练了多少次"/"这周AI花了多少钱"）：
跑 `node ~/ielts-coach/skills/ielts-dashboard/scripts/report.js [days]`（默认7天），拿到JSON后，直接在对话里用1-2句话总结：总次数、各模块平均band、最高频的弱项标签。返回结果里还有个`aiUsage`字段(总花费+按功能拆分)，用户问花费相关问题时用这个，不用打开浏览器。

**用户想要可视化图表**（比如"打开仪表板", "给我看看趋势图"）：
1. 跑 `bash ~/ielts-coach/skills/_shared/ensure-server.sh` 拿到 `READY <base_url>`。
2. `open <base_url>/dashboard`。
3. 告诉用户已经打开，页面里有 Band 趋势线图和弱项标签分布，可以切换近7天/近30天。

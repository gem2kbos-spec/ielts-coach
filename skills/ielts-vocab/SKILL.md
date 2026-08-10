---
name: ielts-vocab
description: Open the vocabulary library in the local IELTS app (~/ielts-coach), or look up/add a word directly. Words get an AI-generated Chinese gloss + detailed explanation + example sentences, and can be exported as Markdown or Anki-importable text. Spaced repetition / review scheduling is NOT implemented yet (P1) — this is a static library with add/lookup/export/delete only.
user-invocable: true
allowed-tools:
  - Bash
---

# 词汇库

**已实现**：单词增删查、AI生成中文释义+详解+例句+搭配、导出 Markdown / Anki 可导入的 txt、手动标记"待巩固"（`needs_reinforcement`字段，在`/vocab`页面每个词卡片上有个开关）。生词主要来自阅读模块划词标记，也可以手动添加。标了"待巩固"的词会被阅读模块的AI生成功能自动读取，尝试自然植入到新生成的文章里（最多8个）。
**没实现（P1）**：真正的间隔复习(SRS)排期算法、复习提醒——"待巩固"只是手动标记，不会自动安排复习时间或推送提醒。

打开页面：
```bash
bash ~/ielts-coach/skills/_shared/ensure-server.sh   # 输出的TOKEN行是下面$TOKEN的值
open <base_url>/vocab
```

如果用户想在对话里直接查一个词（不开浏览器），可以调接口：
```bash
curl -s -X POST http://localhost:3000/api/vocab -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"word": "ubiquitous", "contextSentence": "可选，给个例句上下文释义更准"}'
```

如果用户问"什么时候该复习这些词"——如实说间隔复习功能还没做，目前词汇库只是个带AI释义的生词本，不会主动提醒复习。

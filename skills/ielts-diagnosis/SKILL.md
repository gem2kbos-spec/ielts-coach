---
name: ielts-diagnosis
description: Diagnose the user's IELTS weaknesses based on their practice history in the local app (~/ielts-coach), and suggest a training plan — including generating a personalised AI reading passage targeting weak areas (e.g. "帮我生成一篇针对我弱项的阅读") or finding listening practice for a weak section (e.g. "我听力S3最差，帮我找S3练习"). Use when the user asks things like "诊断我哪里弱", "我应该练什么", "给我下周计划", "我最近写作怎么样".
user-invocable: true
allowed-tools:
  - Bash
---

# 诊断

1. 跑 `node ~/ielts-coach/skills/ielts-diagnosis/scripts/analyze.js [days]`（默认 30 天，可以根据用户说的时间范围调整，比如"这周"就传 7）。
2. 脚本输出 JSON，包含：
   - `totalAttempts`：总练习次数
   - `byModule`：各模块练习次数+平均band（阅读/听力没有band概念时是平均正确率`avgAccuracy`）
   - `bySubtype`：按更细的子类型拆分(写作Task1/Task2分开、口语Part1/Part2/Part3/完整流程分开、听力单题/全真模拟分开)，比如能回答"我写作Task1比Task2弱"这种更具体的问题，key是`module:子类型`形式，每项有`label`(中文名)+`count`+`avgBand`/`avgAccuracy`
   - `errorTagFrequency`：弱项标签出现频率（键的中文含义见下表）
   - `trend`：按日期的band变化序列
   - `listeningBySection`：听力按S1-S4统计的正确率+练习次数，专门回答"我听力哪个section最差"这类问题
3. 自己读懂这些数据后，用中文给用户一段诊断 + 具体训练建议，不要原样转发JSON。如果 `totalAttempts` 是 0，直接说"还没有练习记录，写作/口语/阅读/听力随便练一次都行，攒点数据才能诊断"，别只点名Task2/Part2这两个——系统现在四个模块都有内容。

## 弱项标签含义

- `underdeveloped`: 展开不足/字数或时长不够
- `chinglish`: 中式表达
- `task_response_weak`: 任务回应不足（没答到点上）
- `coherence_weak`: 逻辑连贯弱
- `grammar_weak`: 语法薄弱
- `vocab_gap`: 词汇空白
- `pronunciation_weak`: 发音待提升
- `filler_heavy`: 填充词过多
- `careless`: 粗心(阅读/听力，本来能答对但读串/听串了)
- `logic_misread`: 逻辑理解错(阅读/听力，比如T/F/NG搞反、漏看否定词)
- `time_pressure`: 时间紧导致的失分(阅读/听力，题目靠后或需要大量定位)
- `trap_distractor`: 踩了干扰项的坑(阅读/听力，原文里有个像是对的但其实不对的说法)

## 诊断思路

- 哪个模块平均band明显低于其他模块 → 重点练那个模块；再看`bySubtype`细分到具体子类型(比如发现"写作"整体一般，但拆开看是Task1明显拖后腿、Task2其实还行，建议就该聚焦Task1，不是泛泛说"多练写作")。
- 哪个标签出现频率最高 → 那是当前最该解决的具体问题，给1-2个针对性练习建议（比如`chinglish`高频就建议重点用"中式英语检测"功能复盘旧作文；`filler_heavy`高频就建议多做几次口语Part2专门盯着填充词指标）。
- 用户想回头看某一次具体的练习记录(比如"上次那篇作文写得怎么样")：提示他们打开 `<base_url>/history`，按模块筛选+点进去看完整历史详情(作文原文+评语、口语转写、阅读/听力逐题对照)。
- 用户想知道"我反复犯的错误有哪些"(不是单次诊断，是跨多次练习的重复模式)：提示他们打开 `<base_url>/weakness`——汇总了写作里反复出现的中式表达、口语里反复被标记的发音风险词、阅读/听力标记的生词，按出现次数排序。
- 如果`trend`里band在涨，鼓励一下；在跌或停滞，提醒可能是练习量不够或者最近换了更难的题。
- 用户当前目标分（如果对话里提到过）和实际band有差距的话，给出大概需要多少次额外练习的粗略建议，别精确到小数点，定性说明就行。

## 如果用户要"针对弱项生成一篇阅读"

直接调 `POST /api/reading/generate/preview`，不传`questionTypes`参数（留空让后端自己读阅读错题历史选薄弱题型），具体调用方式和确认入库流程参考 `ielts-reading` skill 里的"AI生成新文章"那一段，照着做就行，不要重复发明一套调用方式。

## 如果用户要"找听力弱section的练习"

读上面脚本输出的 `listeningBySection`，确定是用户指名的section还是正确率最低的那个。这一步要开浏览器+curl接口了（跟上面纯读DB的analyze.js不一样），先跑一次 `bash ~/ielts-coach/skills/_shared/ensure-server.sh` 拿到 `$TOKEN`，再查 `curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/listening/sections` 挑一个对应section、没做过的优先，直接打开 `<base_url>/listening/exam/<id>`。具体步骤参考 `ielts-listening` skill。

---
name: ielts-speaking
description: Open the IELTS Speaking practice modules in the local app (~/ielts-coach) — the full continuous Part1→Part2→Part3 flow, or individual Part 1 warm-up / Part 2 long turn / Part 3 examiner mode / shadow reading. Use when the user wants to practice speaking, talk about a cue card, shadow an audio sample, or do a mock examiner conversation.
user-invocable: true
allowed-tools:
  - Bash
---

# 口语

先判断用户要练哪个子模块，再跑 `bash ~/ielts-coach/skills/_shared/ensure-server.sh` 拿到 `READY <base_url>`，然后打开对应路由：

| 用户想练的 | 路由 | 说明 |
|---|---|---|
| 完整流程(像真实考试一样) | `/speaking/full` | Part1(热身问答)→Part2(话题卡)→Part3(考官追问)连续进行，结束后三段评分自动合并成一个综合band(跟真实雅思"一个综合分"逻辑一致) |
| Part 1 热身问答(单独练) | `/speaking/part1` | 没有准备时间，一次性连续回答一个话题下的3-4个问题(真实考试是考官逐题问，这里简化成一段连续录音) |
| Part 2 抽题说一段(单独练) | `/speaking/part2` | 1分钟准备+2分钟回答，自动录音转写，给流利度/词汇/语法/发音四项评分+填充词统计+发音风险标记 |
| 影子跟读 | `/speaking/shadow` | 需要用户先在 `/import` 页面导入过范例音频（mp3/wav），否则会提示去导入 |
| 真人考官模式(Part3单独练) | `/speaking/examiner` | 4轮对话，前几轮 Claude 根据上一轮回答动态追问，最后才给四项评分。**单次会话大约消耗4-5次模型调用，每轮响应时间10-90秒不等（正常波动）**，提前告诉用户别误以为卡住了 |

`/speaking/full`内部的Part3会自动用Part2同主题的题(按tags匹配，比如Part2抽到"person"主题，Part3也会优先选"person"主题的)，跟真实雅思Part3话题延续Part2的逻辑一致。

打开后提醒用户：
- 需要给浏览器麦克风权限。
- 发音分数是基于转写文本+识别置信度估算的，不是真的听觉判断，这一点评分结果里也会注明。
- 影子跟读和考官模式都不会预置雅思真题音频（版权问题），跟读素材要用户自己导入。
- Part1没有真实考试那种"考官逐题问、间隔答"的交互，是简化成一段连续录音。

数据存在本机 SQLite，录音文件存在 `~/ielts-coach/data/audio/recordings/`，都不会上传。

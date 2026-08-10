---
name: ielts-listening
description: Open the IELTS Listening module in the local app (~/ielts-coach) — drag-drop import audio (mp3/m4a/wav) paired with question files (pdf/txt/json), or batch-import via a JSON template; auto-pairs files by filename, with manual pairing for mismatches. Practice a single section (S1-S4) or take a full 4-section mock with continuous playback, strict one-time-audio-playback mode, question flagging/review, auto-grading (including multiple-select and map/diagram-labeling questions), error-tag analysis, and IELTS band conversion for mocks. Use whenever the user wants to practice listening, import listening materials, or check listening progress/weak sections.
user-invocable: true
allowed-tools:
  - Bash
---

# 听力

和阅读共用同一套题库/判分/错题归因基础设施，但素材是"音频+题目"成对的。

## 1. 导入听力题
1. 跑 `bash ~/ielts-coach/skills/_shared/ensure-server.sh` 拿到 `READY <base_url>` 和 `TOKEN <token>`（下面直接curl接口都要带 `-H "Authorization: Bearer $TOKEN"`，开浏览器走用户自己的登录session不需要）。
2. `open <base_url>/listening/import`，把音频(mp3/m4a/wav)和题目文件(pdf/txt/json)一起拖进去：
   - 同名文件自动配对(如 `section1.mp3` + `section1.pdf`)，配不上的会列出来让用户手动指定哪个音频对应哪个题目。
   - 也支持批量JSON模板（页面右上角"下载JSON模板"），一个JSON里可以放多个section，每个section用文件名引用对应的音频，连同音频文件一起拖进去即可批量导入。
3. **关键限制**：听力AI拿不到音频本身，没法像阅读那样直接听音频反推答案。预览阶段如果用户粘贴了完整听力原文(transcript)，可以点"AI辅助填充答案"让AI基于原文生成参考答案；没有transcript就只能手动填答案。导入前务必提醒用户检查答案是否正确。
4. 标题/section编号(S1-S4)可以在预览阶段改，留空标题用文件名。

## 2. 练习

`open <base_url>/listening`，菜单有"全部/已完成/未完成"tab。

- **单题练习**：点任意一个section直接进入，只计这一节的时间。
- **全真模拟**：点"全真模拟(4 Sections)"进组卷页，每个S1-S4槽位选一个(或点"随机组卷"，优先选没做过的)，凑够后连续做完4节，统一判分+给出近似band换算(雅思听力通用换算表，非官方逐年精确版本)。

做题页：顶部倒计时(每节默认10分钟，导入时可在JSON模板里通过`defaultDurationSec`自定义)+全真模拟时显示S1-S4进度；音频默认"严格机考模式"——点"开始播放"后一次性放完不能拖动/回放，可以勾选"练习模式"切换成可暂停回放+可调0.8x/1.0x/1.2x倍速的模式(严格模式下没有变速，跟真实考试一致)；题目支持填空/单选/多选/匹配/地图标注(地图标注题是简化版——展示题目文档里那一页的截图当参考图+编号文字填空，不是可点击打标记的交互地图)；每题可以"标记"留着复查，底部题号导航能跳转。

**听写模式**：选题菜单里有transcript的section会多一个"听写"链接(`/listening/dictation/<id>`)，可以随便暂停/回放音频，把听到的内容打出来，点"对比原文"按逐词比对(LCS算法，漏听一个词不会导致后面全部错位判断)，标红没听对的词。

判分后：逐题对错+正确答案、错题归因tag(careless/vocab_gap/logic_misread/time_pressure/trap_distractor)，如果导入时提供了transcript，还能展开"听力原文"并自动高亮答案所在的句子(简单子串匹配，不是语义理解)。

## 3. 针对性练习（弱section定位）

如果用户说"我听力XX最差，帮我找XX练习"这类话：
```bash
node ~/ielts-coach/skills/ielts-diagnosis/scripts/analyze.js 30
```
输出里的 `listeningBySection` 字段是按S1-S4统计的正确率，找到用户说的那个section(或正确率最低的那个)，再查（先跑一次`ensure-server.sh`拿`$TOKEN`）：
```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/listening/sections
```
从里面挑一个对应section、`completed:false`优先的条目，直接 `open <base_url>/listening/exam/<id>` 打开。

## 重要限制
- 判分依赖用户自己提供的答案(或基于transcript的AI辅助建议)，不是官方答案册。
- 地图/示意图标注题是简化版，没有真实的"在图上点选/拖拽"交互。
- Band换算是通用近似表，不同年份官方表格可能有±0.5浮动。
- 听写模式没有自动逐句暂停(没有句子级时间戳)，靠用户自己手动暂停/回放。

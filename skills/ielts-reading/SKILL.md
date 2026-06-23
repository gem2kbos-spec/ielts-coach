---
name: ielts-reading
description: Open the IELTS Reading module in the local app (~/ielts-coach) — import a PDF with multiple passages and questions, OR have AI generate a brand-new IELTS-style reading passage+questions personalised to the user's weak question types and vocabulary that needs reinforcement (e.g. "帮我生成一篇针对我弱项的阅读", "生成一篇困难的环境类阅读"). Also browse the question bank (all/done/todo/AI生成/真题导入 tabs), take a passage in a computer-test-style layout with a timer and text annotation, and get auto-graded with error-tag analysis. There's also a separate lightweight "free reading" mode for marking vocabulary in any imported text without question structure. Use whenever the user wants to practice reading comprehension, import/generate reading material, or check reading progress.
user-invocable: true
allowed-tools:
  - Bash
---

# 阅读

三种获取文章的方式 + 共用的做题/判分体验。

## 1. PDF导入真题
1. 跑 `bash ~/ielts-coach/skills/_shared/ensure-server.sh` 拿到 `READY <base_url>`。
2. `open <base_url>/reading/import`，拖一份含多篇阅读理解(文章+题目)的PDF进去。自动按"PASSAGE/Questions/题号/选项字母"切分+AI建议答案，置信度低时可手动按页码范围切分，预览确认后入库。

## 2. AI 生成新文章（用户说"帮我生成一篇阅读"之类的话时用这个）

直接调接口，不需要打开浏览器表单，但**生成后必须先把内容讲给用户看，等用户确认要不要入库，不能自动入库**：

```bash
curl -s -X POST http://localhost:3000/api/reading/generate/preview \
  -H "Content-Type: application/json" \
  -d '{"difficulty": "medium", "topic": "气候变化", "questionTypes": [], "extraRequirements": ""}' \
  -o /tmp/ielts-reading-draft.json
```

- 参数全部可选，留空对应字段：`difficulty`(easy/medium/hard)留空AI自己定；`topic`留空随机选雅思常考主题；`questionTypes`留空时后端会自动读用户阅读错题历史里出错率最高的题型来配题（"针对我弱项"就是不传这个参数，让后端自动判断）；`extraRequirements`是自由文本，用户说的"多考推断题"之类的话直接填进去。
- 调用大概10-90秒（生成650-900词文章+13题，AI正在认真写，等得久不代表卡住）。
- 结果在`/tmp/ielts-reading-draft.json`里的`.draft`字段，把标题、难度、主题、题目类型分布跟用户说一下。如果`weakTypesUsed`非空，告诉用户"已经按你最近出错最多的题型(xxx)安排了重点"；如果`reinforcementWordsUsed`非空，告诉用户"已经把词汇库里标了待巩固的词(xxx)写进文章了"。
- 用户确认要这篇之后才入库：
```bash
node -e "const d=JSON.parse(require('fs').readFileSync('/tmp/ielts-reading-draft.json')); console.log(JSON.stringify({passages:[d.draft]}))" > /tmp/ielts-reading-import-body.json
curl -s -X POST http://localhost:3000/api/reading/import -d @/tmp/ielts-reading-import-body.json -H "Content-Type: application/json"
```
- 用户说"不满意/重新生成"就把同样的参数再调一次`/generate/preview`（保留上次的difficulty/topic/questionTypes/extraRequirements，不用重新问用户）。
- 入库后告诉用户可以去 `<base_url>/reading` 选题页找到这篇（带"AI生成"标签），或者直接 `open <base_url>/reading` 给他们看。

支持的题型（生成时可以指定偏好，由用户用中文描述，自己翻译成下面的key）：`true_false_ng`(T/F/NG) `multiple_choice`(选择题) `short_answer`(简答) `sentence_completion`(句子填空) `summary_completion`(摘要填空) `matching_heading`(段落标题匹配) `matching_information`(信息定位匹配) `table_completion`(表格/笔记填空，简化版，没有真实表格视觉布局)。

## 3. 选题与做题（两种来源共用）

`open <base_url>/reading`，菜单有"全部/已完成/未完成/AI生成/真题导入"五个tab，已完成的篇目灰显+显示上次正确率，点任意一篇可直接进入，不强制顺序。

做题页左右分栏：左边原文(顶部计时器，选中文字弹出"高亮/加笔记"或"标记生词"——自定义浮层，不是浏览器原生tooltip；如果文章是AI生成且写了待巩固词，右上角有个"高亮巩固词"开关)，右边按题型作答，提交后立刻判分：正确率、逐题对照+AI解析、错题归因tag(careless/vocab_gap/logic_misread/time_pressure/trap_distractor)，数据存进attempts表，仪表板能看到正确率趋势。

## 4. 自由阅读模式

`open <base_url>/reading/freeread`——只读文章+划词标记生词，没有题目结构，适合任意文字材料。

## 重要限制

- 判分用的是AI生成/建议的答案，不是官方答案册，准确率不是100%保证（尤其是PDF导入时标了"AI答案建议置信度低"的题，建议用户检查一下）。
- `table_completion`只是简化的"按空格列填空"，不会真的画表格/笔记/流程图的视觉布局。

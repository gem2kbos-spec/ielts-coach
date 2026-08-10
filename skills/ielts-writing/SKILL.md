---
name: ielts-writing
description: Open or explain the IELTS Writing practice modules in the local app (~/ielts-coach) — Task 1 (chart/graph/table description, 20min, 150 words), Task 2 (argumentative essay, 40min, 250 words), and Expression Training (phrase drills + sentence translation with SRS). Use when the user wants to practice writing, asks about Task 1/Task 2, timing, band scores, Chinglish detection, band 7/9 rewrites, or wants to drill advanced vocabulary/collocations/sentence patterns.
user-invocable: true
allowed-tools:
  - Bash
---

# 写作

雅思写作由 Task1(图表/表格描述，权重1) + Task2(议论文，权重2) 组成。

1. 跑 `bash ~/ielts-coach/skills/_shared/ensure-server.sh` 确保服务在跑，拿到 `READY <base_url>` 和 `TOKEN <token>`(加了用户系统后直接curl接口都要带这个token；`TOKEN NONE`说明用户还没在网页登录过，先让他登录一次)。
2. `open <base_url>/writing` 打开选择页(Task1/Task2两个入口)，或者直接 `open <base_url>/writing/task1` / `open <base_url>/writing/task2` 跳过选择。
3. Task1流程：审题2分→大纲3分→写作13分→检查2分(共20分钟)，题目是柱状图/折线图/饼图/表格(纯前端用recharts渲染结构化数据，没有真实图片)，写完点"提交评分"，得到TA(对Task1来说是"数据描述准确性"而不是"观点")/CC/LR/GRA四项评分+中式英语检测+Band7/Band9对照重写。
4. Task2流程：审题3分→大纲5分→写作30分→检查2分(共40分钟)，跟之前一样。

如果用户问"评一下我这篇作文"并直接把作文文字贴在对话里：可以告诉他们也可以这样做，但更准确的方式是引导他们去网页里走完整流程（因为打分prompt需要原题/原图表数据，网页里题目和作答是绑定的）。如果用户坚持要在对话里直接评，需要先问清楚题目是什么(Task1还是Task2、具体哪道题)，再用curl调用对应接口：

```bash
# Task1（$TOKEN来自上面ensure-server.sh的TOKEN输出）
curl -s -X POST http://localhost:3000/api/writing/task1/grade \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"itemId": "<先用 curl -H \"Authorization: Bearer $TOKEN\" http://localhost:3000/api/writing/task1/random 抽一个>", "essayText": "...", "durationSec": 1200}'
# Task2
curl -s -X POST http://localhost:3000/api/writing/task2/grade \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"itemId": "<先用 curl -H \"Authorization: Bearer $TOKEN\" http://localhost:3000/api/writing/task2/random 抽一个>", "essayText": "...", "durationSec": 2400}'
```

数据存在本机 SQLite（`~/ielts-coach/data/ielts.db`），不会上传到任何地方。

## 表达训练（词组 + 句子翻译）

独立于Task1/Task2，是专门练"高频高级表达"的模块，逻辑是"看中文写英文"，无尽模式练习(没有每日固定题量限制)。

1. `open <base_url>/writing/expressions` 进入选择页，有"词组练习"/"句子翻译"两个tab，可按分类(动词词组/句式/观点/让步转折/数据描述 五类词组；议论句/让步句/原因结果句/举例/数据句 五类句子)+难度+Task1/Task2筛选，也能搜索。
2. 在上面这些筛选基础上，再叠加5个练习状态入口：已练习/完全正确/基本正确/有误/无尽模式——点哪个就进入对应的专项练习(比如筛了"词组练习+数据描述+困难"再点"有误"，就是专门复习困难数据描述类里上次答错的)。无尽模式不挑状态，从筛选结果里不断抽题，做完一批自动续下一批，不会"做完"。或者直接点列表里某一条单独练。
3. 每条题目左边的小圆点是熟练度：灰=未学，黄=练习中，绿=已掌握(连续答对3次自动转)。
4. 词组判分：完全正确/基本正确/有误三档，给标准答案+2-3个更高级替换表达+例句+生词解释(中文含义+用法)，有误时标出具体错误类型(介词/搭配/拼写/语法/用词)。句子判分：三个维度(准确性/表达水平/语法错误逐条标注)+参考译文+Band7和Band8+两档升级改写+生词解释。
5. 可以点"+ 自己添加"自己填中文+英文，AI自动补全替换表达/例句/分类/难度。
6. 写完一篇Task1/Task2作文如果AI检测到中式表达/低级用词，评分结果页chinglish列表旁会顺带给"加入今日练习"的按钮，链到词组库里对应的高级表达。
7. 页面右上角显示"今日已练习/总共已练习"次数，仪表板也有一张表达训练卡片同步这两个数字。
7. 数据存在 `attempts` 表，`module='writing_expression'`，`item.subtype`区分`phrase_drill`/`sentence_translation`；SRS复习状态在`expression_review`表，跟词汇模块完全独立(词汇模块没有也不打算做SRS)。

如果用户想在对话里直接判一个：
```bash
curl -s -X POST http://localhost:3000/api/expressions/<itemId>/grade \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"answer": "..."}'
```
`itemId`先用 `curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/expressions?type=phrase` 列出来挑一个。

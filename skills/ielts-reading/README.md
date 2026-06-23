# ielts-reading

PDF多篇阅读理解导入(自动切分+AI建议答案+预览确认) → 机考式做题(计时+高亮/笔记/标记生词) → 自动判分+错题归因。
另有一个不带题目结构的"自由阅读"模式，只做划词标记生词。

## 独立测试

```bash
bash ~/ielts-coach/skills/_shared/ensure-server.sh
open http://localhost:5173/reading/import   # 导入PDF
open http://localhost:5173/reading          # 选题菜单
open http://localhost:5173/reading/freeread # 自由阅读(老的纯vocab标记模式)
```

或直接调接口：

```bash
curl -s -F "file=@some-reading.pdf" http://localhost:3000/api/reading/parse-pdf   # 预览解析
curl -s http://localhost:3000/api/reading/passages                                # 题库列表+完成状态
```

完整流程（导入→选题→做题→判分→仪表板统计）已经用真实PDF + 无头浏览器跑通过一次，参考对话记录里的截图。

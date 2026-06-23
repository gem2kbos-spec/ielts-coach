# ielts-writing

打开写作 Task2 练习页，或在对话里直接调评分接口。

## 独立测试

```bash
bash ~/ielts-coach/skills/_shared/ensure-server.sh
open http://localhost:5173/writing/task2

# 或直接调接口：
curl -s http://localhost:3000/api/writing/task2/random
curl -s -X POST http://localhost:3000/api/writing/task2/grade \
  -H "Content-Type: application/json" \
  -d '{"itemId": "<上面拿到的id>", "essayText": "至少50词的文章...", "durationSec": 1800}'
```

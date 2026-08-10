# ielts-vocab

词汇库：增删查、AI中文释义+详解、导出 Markdown/Anki。间隔复习还没做（P1）。

## 独立测试

```bash
bash ~/ielts-coach/skills/_shared/ensure-server.sh   # 输出的TOKEN行是下面$TOKEN的值
open http://localhost:5173/vocab

# 或直接调接口：
curl -s -X POST http://localhost:3000/api/vocab -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"word": "ubiquitous", "contextSentence": "Smartphones have become ubiquitous in modern life."}'
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/vocab
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/vocab/export/markdown
```

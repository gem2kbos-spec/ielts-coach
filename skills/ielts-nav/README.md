# ielts-nav

主导航 skill。把自然语言意图路由到其他 7 个 skill 对应的模块。

## 独立测试

```bash
bash ~/ielts-coach/skills/_shared/ensure-server.sh
# 应输出 READY http://localhost:5173 (开发模式) 或 http://localhost:3000 (生产模式)
```

在 Claude Code 对话里说"我想练习一下口语"之类模糊的话，看是否正确路由或反问澄清。

# ielts-speaking

打开口语 Part2 / 影子跟读 / 真人考官模式三个子页面。

## 独立测试

```bash
bash ~/ielts-coach/skills/_shared/ensure-server.sh
open http://localhost:5173/speaking/part2
open http://localhost:5173/speaking/shadow
open http://localhost:5173/speaking/examiner
```

录音功能需要在真实浏览器里手动测试（麦克风权限），无法纯脚本验证。后端接口可以用 curl 传一段 wav 文件测试，参考 `server/routes/speaking.js` 里的几个路由。

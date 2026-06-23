# ielts-listening

音频+题目拖拽导入(自动配对/JSON模板批量导入) → 单题练习或全真模拟(4 Sections连续) → 严格机考式音频播放(一次性/可切换练习模式) → 自动判分(填空/单选/多选/匹配/地图标注) → 错题归因 + transcript高亮 + band换算。

## 独立测试

```bash
bash ~/ielts-coach/skills/_shared/ensure-server.sh
open http://localhost:5173/listening/import   # 导入音频+题目
open http://localhost:5173/listening          # 选题菜单
open http://localhost:5173/listening/mock     # 全真模拟组卷
```

或直接调接口：

```bash
curl -s http://localhost:3000/api/listening/template                    # 下载批量导入JSON模板
curl -s -F "files=@a.mp3" -F "files=@a.pdf" http://localhost:3000/api/listening/upload  # 上传配对预览
curl -s http://localhost:3000/api/listening/sections                    # 题库列表+完成状态
node ~/ielts-coach/skills/ielts-diagnosis/scripts/analyze.js 30         # 含 listeningBySection 按section正确率
```

完整流程（导入→单题练习→判分→全真模拟组卷→连续4节→模考结果）已经用合成的测试音频+PDF + 无头浏览器跑通过一次。

地图/示意图标注题是简化版：直接把题目文档里那一页(pdf转png)截图当参考图，不需要用户单独上传图片，也不支持"在图上点击打标记"的交互，只是编号文字填空。

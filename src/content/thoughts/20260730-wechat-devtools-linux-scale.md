---
date: 2026-07-30T06:29:00Z
tags: ["ai", "linux", "wechat-devtools"]
---

在 Omarchy Linux 上，微信开发者工具的界面比之前在 Ubuntu 上大很多，又没有调整整个窗口缩放的快捷键；问了 AI 后，它找到了一个启动参数，还直接帮我写进 `.desktop` 启动器，从 Launcher 打开时就会自动缩小，挺有意思。

```ini
Exec=wechat-devtools --force-device-scale-factor=0.85 %U
```

现在的工作方式已经完全变了：有什么不懂，先问 AI。感觉自己解决问题的能力也变强了。

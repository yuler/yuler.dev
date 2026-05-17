---
date: 2026-05-18T12:00:00Z
tags: ["agentic-coding", "yolo-mode", "superpowers"]
---

在 agentic coding 时，现在更倾向于直接开启 YOLO mode，这样不容易漏掉确认，效率更高。

然后通过 git worktree 开发多个 feature，或者跨项目开发，使用 [superpowers](https://github.com/obra/superpowers) 定义好 spec 然后让 Agent 执行，最后直接看效果。

下面是 Claude 和 Gemini 开启 YOLO mode 的命令。

```bash
claude --dangerously-skip-permissions
gemini --yolo # Ctrl + Y
```

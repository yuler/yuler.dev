---
date: 2026-09-11T12:00:00Z
tags: ["monorepo", "difit", "code-review"]
---

最近公司代码整合成 monorepo，同时包含前端和后端。一个 feature vibe coding 出来的 diff 太大，GitHub / GitLab 的 web UI review 显示内容太多, 效果就不是显示内容太多, 效果就不是那么好了.

经过调研, 发现 [difit](https://github.com/yoshiko-pg/difit) 工具挺不错的, 目前正在使用

- UI 风格和交互像 github PR 一样
- 可以通过左侧的 tree 之间点击父节点,标记这个子节点都 reviewed
- Review comment 会转变成 prompt, 可以集合一起发送给 AI Agent
- 由于 difit 是本地启动一个 web 段服务, 所以每次修改只需要 commit, 不需要 push 

```bash
npx difit --clean @ main
## `@` 是当前 HEAD。
## --clean reviewed 标记清除
```


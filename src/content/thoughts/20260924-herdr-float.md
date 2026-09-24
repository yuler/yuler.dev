---
date: 2026-09-24T02:15:00Z
tags: ["omarchy", "herdr"]
---

最近把大部分 agent 工作搬进了 herdr，Omarchy workspace 用法也跟着变了。

之前 herdr 常驻 scratchpad，哪个 workspace 都能快速调出来；但 Omarchy 默认 scratchpad 打开的是 terminal。现在流程反过来：herdr 关闭、重启后都能恢复 tab 和窗口，用完直接 close 掉就行。

配合加了一组窗口设置：启动时给 herdr 绑独立 app-id，窗口 float + center，默认 1400x900，这样随开随关都不会让 tiling 布局跳动：

```lua
-- ~/.config/hypr/hyprland.lua
o.window("^herdr$", { float = true })
o.window("^herdr$", { center = true })
o.window("^herdr$", { size = { 1400, 900 } })
```

启动脚本（`bin/omarchy-launch-terminal-herdr`）：`exec omarchy-launch-terminal --app-id=herdr herdr`，快捷键还是 `SUPER + CTRL + RETURN`。

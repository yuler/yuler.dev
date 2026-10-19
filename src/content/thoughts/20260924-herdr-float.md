---
date: 2026-09-24T02:15:00Z
tags: ["omarchy", "herdr"]
---

最近把 agent 调用都放到 herdr 里面了，Omarchy workspace 用法也跟着变了。

之前 herdr 常驻 scratchpad workspace 里面，这样无论在哪个 workspace 都能快速调出来。最近想了下，herdr 可以像 tmux 一样 close 后恢复，甚至重启后也能保留 tab 和 pane 状态。这样每次需要查看或使用的时候呼出来，用完直接 close window 就行。

然后将 herdr 默认行为调整一下：启动时绑定 `--app-id=herdr`，窗口 float 并居中。

先把启动脚本覆盖到本地的 `bin/omarchy-launch-terminal-herdr`：

```sh
exec omarchy-launch-terminal --app-id=herdr herdr
```

再把窗口规则覆盖到本地的 `~/.config/hypr/hyprland.lua`：

```lua
-- ~/.config/hypr/hyprland.lua
o.window("^herdr$", { float = true })
o.window("^herdr$", { center = true })
o.window("^herdr$", { size = { 1400, 900 } })
```

这样就可以通过快捷键 `SUPER + CTRL + RETURN` 或 Omarchy menu 启动 herdr。

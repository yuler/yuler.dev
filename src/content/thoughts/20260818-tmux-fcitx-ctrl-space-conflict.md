---
date: 2026-08-18T02:13:00Z
tags: ["fcitx", "tmux", "omarchy"]
---

foot + tmux 里突然无法切换中文输入法，浏览器等别的应用却都正常。查了一圈发现是快捷键冲突：omarchy 里 tmux 的 prefix 默认是 `C-Space`，而 fcitx5 切换输入法的默认触发键也是 `Ctrl+Space`。在 tmux 里按 `Ctrl+Space` 会被 tmux 先截走当成 prefix 用，fcitx5 的切换就不生效了。

默认的 `Ctrl+Space` 跟 tmux prefix 冲突，既然要输入中文，干脆只保留 rime 一个输入法（`DefaultIM=rime`，去掉 keyboard-us），再从 fcitx5 的 `TriggerKeys` 里删掉 `Control+space`，不在系统层切换输入法。中文/英文切换直接在 rime 里用 Shift，跟我的输入习惯更贴合，tmux 保留 C-Space 前缀，各不相争。

闲置时还有之前的 [fcitx-idle-english](https://github.com/yuler/dotfiles/blob/main/bin/fcitx-idle-english) 脚本自动切回英文。

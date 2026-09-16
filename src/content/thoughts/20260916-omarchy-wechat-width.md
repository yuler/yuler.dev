---
date: 2026-09-16T06:33:41Z
tags: ["omarchy", "wechat"]
---

在 Omarchy 里面运行微信的话，如果是 dwindle 模式，默认窗口平铺的话，微信 App 的宽度有点大。
可以通过脚本把宽度固定回去，也可以在 Hyprland 配置里预置启动时的 width 比例；
微信里点开的窗口也可以设置 floating 模式，例如打开微信里面的图片通过 floating window 显示，这样更符合个人习惯。

相关代码：[omarchy-fix-wechat-width](https://github.com/yuler/dotfiles/blob/main/bin/omarchy-fix-wechat-width)

`~/.config/hypr/hyprland.lua` 示例：

```lua
-- WeChat: start at a ~700px chat column in the scrolling layout (workspace 3).
o.window("wechat", { scrolling_width = 0.37 })

-- WeChat popups (image/video preview, etc.): float them instead of tiling.
-- `negative:` passes when the regex fails, so the main "Weixin"
-- window keeps tiling.
o.window({ class = "^wechat$", title = "negative:^Weixin$" }, { float = true })
```

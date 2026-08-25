---
date: 2026-08-25T07:36:53Z
tags: ["omarchy", "linux"]
---

公司的显示器接了 HDMI 转换头，有时锁屏后再点亮就会花屏、颜色错乱。之前让 AI 写了个 [fix-monitor-colors](https://github.com/yuler/dotfiles/blob/main/bin/fix-monitor-colors.sh) 脚本修复，起初在 terminal 里手动跑就行，但桌面焦点常常不在 terminal，每次都得先切过去再跑。

后来想直接在 Omarchy Menu 里面加一个快捷启动项会更方便，直接让 AI 改去做，然后它在 `~/.config/omarchy/extensions/omarchy-menu.jsonc` 里配置一个菜单项就行了

只踩了一个坑：脚本在 `dotfiles/bin`，PATH 加在 `.bashrc` 里；而菜单命令是非交互 login shell，会跳过 `.bashrc`。把 PATH 挪到 `.bash_profile` 就好了。

[@dhh](https://twitter.com/dhh) 最近在 X 上推广的 [Omarchy quattro](https://x.com/search?q=omarchy%20quattro&f=live) 话题很热。当年没跟上 Rails 的脚步，这次总算抢先用上了他做的 Omarchy ——用下来非常好用，不愧是写出 Rails 的那个男人。[#Omarchy](https://x.com/hashtag/omarchy)

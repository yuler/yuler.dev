---
date: 2026-08-11T02:54:00Z
tags: ["fcitx", "ime", "linux"]
---

中文输入法在组词时会进入预编辑（preedit / composition）状态：拼音已打出，字还没上屏。一旦停在中文模式，有些场景就很别扭——比如浏览器里搜英文关键词，一打就进组词；Launcher 里找应用名时也一样。

于是试了个想法：空闲时自动切回英文。用 AI 写了个脚本 [fcitx-idle-english](https://github.com/yuler/dotfiles/blob/main/bin/omarchy-fcitx-idle-english)，先用用看，看看能不能适应这个模式。

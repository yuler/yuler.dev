---
date: 2026-09-22T07:16:00Z
tags: ["git"]
---

公司把 Git 当网盘用，文件名还是中文。终端里 `git status`、`git diff` 会把路径显示成 `\345\205\254...` 这种八进制转义，而不是汉字。

这是 `core.quotepath` 的默认行为。在 `~/.gitconfig` 里关掉之后，中文文件名就会原样显示：

```ini
# ~/.gitconfig
[core]
	quotepath = false
```

---
title: 'Setup Mac Mini'
description: 'WIP'
slug: 'setup-mac-mini'
tags: ["mac", "mac mini"]
date: 2024-12-09
---

## 背景

前段时间看网上说使用国家补贴京东直接下单, Mac Mini (3599 元) 直接性价比天花板, 所以也入手了. 由于入手的较晚, 所以最近才到. 简单记录下新机 Mac 安装软件.

## 设置

- 取消密码策略, 这样可以设置较短开机密码

```bash
pwpolicy -clearaccountpolicies
```

## Mac Setup

- ClashX Pro
- [搜狗输入法](https://shurufa.sogou.com/), 取消 Ctrl + Space 切换输入法快捷键(和 VSCode 冲突, 设置完后需要重启 VSCode)
- My self [dotfiles](https://github.com/yuler/dotfiles/), install.sh & brew.sh & npm.sh

## 远程控制

在 Mac mini 上设置远程控制

- 系统偏好设置 -> 通用 -> 文件共享 & 远程管理

## Windows 虚拟机

[VMWare Fusion Pro for Mac](https://www.vmware.com/products/fusion.html)

- 安装的时候需要跳过 Windows 连网设置

按下 `Shift` + `F10` 输入 `oobe\bypassnro` 回车重启

- 在 VMWare Fusion 菜单上点击, 需要安装 VMWare Tools 工具

是 Windows 网络桥接, 文件拖拽共享 等功能

> <https://youtu.be/7NJpTb9MNFo?si=wD_WnzGJLlwSErmY>

## Refs

- <https://sourabhbajaj.com/mac-setup/>

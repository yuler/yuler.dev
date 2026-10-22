---
title: '给讯飞学习机布置作业'
slug: 'assign-homework-to-studypad'
description: '通过 PC 布置作业。'
tags: ['安卓', '学习机', '讯飞学习机']
date: 2026-10-21
---

## 背景

老师布置作业，有时候是发到群里的。英语作业常常是一张图片，图里是要抄的单词和句子。孩子不知道这个具体的句子，他就需要这个图片去抄写。

家里有一台讯飞学习机。我之前的做法是把图片下载下来，打开学习机的 App，布置一条作业，把图传上去。一个星期大概三四次，不算难，就是麻烦。

后来就在想，能不能把这件事做成程序。

## 先确认：没有网页版

家长端包名是 `com.iflytek.aistudyclient.parentcontrol`。官网 `xxj.xunfei.cn` 是产品页，没有网页版。

既然没有网页入口，思路就是在我这台电脑上（Omarchy Linux）装一个 Android 模拟器。这样后续也可以在这上面跑一些其他的 App。

## 模拟器：装得上，一打开就退出

先后试了两条路：

- **Waydroid。** 装是装上了，但讯飞 AI 学一样打不开。
- **Android Emulator（AVD）。** Android Studio 那套，只是没走 IDE，直接用 Arch 的 SDK 包装。脚本在 dotfiles 仓库的 [`emulator/`](https://github.com/yuler/dotfiles/tree/main/emulator) 目录下：[`android-emulator-setup.sh`](https://github.com/yuler/dotfiles/blob/main/emulator/android-emulator-setup.sh) 负责一次性安装，[`android-emulator-start-pixel-7.sh`](https://github.com/yuler/dotfiles/blob/main/emulator/android-emulator-start-pixel-7.sh) 负责每次启动。

装好之后，用 `adb install -r ~/Downloads/讯飞AI学-4.9.0.13591.apk` 把应用装进模拟器。

两条路都装得上，但都因为同一个原因打不开：两边架构对不上。讯飞 AI 学带的是 ARM 程序，还套了一层只认 ARM 的加固壳。这台电脑是 x86，模拟器系统也是 x86，两边对不上，所以一打开就退出。包里的原生库只有 `arm64-v8a` 和 `armeabi-v7a`，没有 x86 版。模拟器虽然能用翻译层跑普通 ARM 库，但这个壳会按手机 CPU 去改系统里的运行时——它以为自己在改 ARM 的运行时，实际改到的是 x86 的，改完就崩溃了。

能跑起来的办法：

- **真机。** 普通的 ARM 手机，用数据线装这个 APK。这是这个包本来就支持的环境。
- **ARM 版安卓模拟器。** 系统本身是 ARM，壳和运行时就一致了。这台电脑是 Intel，ARM 系统没有硬件虚拟化，只能用软件模拟，会比现在这台慢很多。
- **借用一台 ARM 设备。** 比如另一台安卓手机，或云端的 ARM 真机。

## REA：拆开安装包找接口

手动抓包要登录、要配代理，嫌麻烦。正好前两周 REA（Reverse Engineer Anything）火，直接把 APK 喂给它，让它找接口。

家长端是 Flutter 加梆梆加固壳，但壳只包了 Java 入口，接口都在没被加固的 `libapp.so` 里，静态拆包就能读到。

拆出来就三步：收验证码、登录、布置作业。学科、标题、说明，加上老师发来的那张图，一条命令发到学习机；图片支持本地文件和剪贴板。完整的逆向报告见 [REVERSE.md](https://github.com/yuler/scripts/blob/main/studypad/REVERSE.md)，踩坑记录见 [POSTMORTEM.md](https://github.com/yuler/scripts/blob/main/studypad/POSTMORTEM.md)。

英语抄写还是同一张图。差别是图留在电脑上，不用再打开手机 App。

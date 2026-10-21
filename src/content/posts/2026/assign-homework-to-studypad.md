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

## Waydroid：包的链接有问题，装不上

一开始用的是 Waydroid。结果安装包的下载链接一直有问题，装不上。这条路先放下。

## 官方模拟器：脚本在，没起来

后来上了 Android 那套——Android Studio 用的 AVD，只是没走 IDE，直接用 Arch 的 SDK 包装。脚本在 `~/brain/setup-emulator.sh`。

`setup-emulator.sh` 装命令行工具、模拟器、`android-tools` 和 JDK 17，SDK 放在 `/opt/android-sdk`，再下载 Android 13 的 `google_apis` x86_64 镜像，创建一个叫 `xunfei` 的虚拟设备，4 GB 内存、4 核。`start-xunfei.sh` 负责每次启动、装 APK、拉起应用。

脚本一直在，但模拟器里讯飞 AI 学就是装不上，一直没起来。

仔细看了一下原因：这个 Android 13 `google_apis` x86_64 镜像的 `ro.product.cpu.abilist` 只有 `x86_64`，并没有脚本注释里以为的 ARM 翻译。讯飞 AI 学的安装包里只有 `arm64-v8a` 和 `armeabi-v7a`，没有 x86 的库。所以 `adb install` 直接报 `INSTALL_FAILED_NO_MATCHING_ABIS`。

也就是说，**脚本以为镜像自带 ARM 翻译，其实没有**。要跑 ARM 应用，得换一个真正带 arm64 翻译的镜像（Android 11/12 的 `google_apis` 镜像带）。

## REA：拆开安装包找接口

手动抓包要登录、要配代理，嫌麻烦。正好前两周 REA（Reverse Engineer Anything）火，直接把 APK 喂给它，让它找接口。

家长端是 Flutter 加梆梆加固壳，但壳只包了 Java 入口，接口都在没被加固的 `libapp.so` 里，静态拆包就能读到。

拆出来就三步：收验证码、登录、布置作业。学科、标题、说明，加上老师发来的那张图，一条命令发到学习机；图片支持本地文件和剪贴板。完整的逆向报告见 [REVERSE.md](https://github.com/yuler/scripts/blob/main/studypad/REVERSE.md)，踩坑记录见 [POSTMORTEM.md](https://github.com/yuler/scripts/blob/main/studypad/POSTMORTEM.md)。

英语抄写还是同一张图。差别是图留在电脑上，不用再打开手机 App。

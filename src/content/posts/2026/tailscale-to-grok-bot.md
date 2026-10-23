---
title: '在 Grok Bot 云电脑上装 Tailscale，再 SSH 进去'
slug: 'tailscale-to-grok-bot'
description: '在 Grok Bot 云电脑上用 userspace Tailscale 组网，邀请另一台机器，再用 tailscale ssh 连上去。'
tags: ['Tailscale', 'Grok Bot', 'SSH']
date: 2026-09-23
draft: true
---

让 Grok Bot 云电脑和自己的机器进同一个私有网，然后从另一台机器 `tailscale ssh` 进去。

四步：装 → 浏览器登录 → 邀请进同一张网 → 另一台机器 SSH 进来。跨账号要改 ACL。

## 1. 让 Grok Bot 装上

云电脑没有完整的 systemd，也没有 `CAP_NET_ADMIN`。`/dev/net/tun` 在，创建 `tailscale0` 会报 `operation not permitted`，内核 TUN 起不来，只能走 userspace。

打开 Grok Bot，把下面这段贴进去。它会给出一段可以直接复制执行的安装命令。

```text
在这台云电脑上安装 Tailscale，给我一段可以直接复制执行的命令。

约束：
- 没有完整的 systemd，不要用系统服务托管
- 没有 CAP_NET_ADMIN，创建 tailscale0 会报 operation not permitted
- 用官方二进制，放到 ~/.local/tailscale/
- tailscaled 用 userspace networking（--tun=userspace-networking）
- 状态目录：~/.local/state/tailscale/
- socket：~/.local/run/tailscale/tailscaled.sock
- 之后每条 tailscale 命令都带 --socket=~/.local/run/tailscale/tailscaled.sock

装好即可，先不要登录。最后单独给出拿浏览器登录链接的命令。
```

## 2. 浏览器登录

安装命令跑完后，在云电脑上执行：

```bash
tailscale --socket=~/.local/run/tailscale/tailscaled.sock login
```

终端会打印一个链接。在浏览器里用 Owner 账号 `owner@example.com` 授权。授权之后，这台云电脑进网，拿到 `100.x.x.A`。

## 3. 邀请另一台机器

同一张网就是同一个 tailnet。

1. Owner 打开 Admin → Users，Invite external users，复制邀请链接。
2. 协作者用自己的身份接受，这里是 GitHub 登录 `collaborator@github`。
3. Free 计划还要在 Admin 里批准，对方才真正进网。

协作者这台机器如果以前连的是自己的私人网，在 Client 里先 Log out，再用 `collaborator@github` Log in。登录身份保持协作者自己的账号。网页上的 Download 可以忽略。

## 4. 打开 SSH，从另一台机器连上

在云电脑上执行：

```bash
tailscale --socket=~/.local/run/tailscale/tailscaled.sock set --ssh
```

Machines 页这个节点会出现 SSH 标记。

另一台已经进同一张网的机器上：

```bash
tailscale ssh dev@100.x.x.A
```

如果报 `tailnet policy does not permit you to SSH to this node`，SSH 开关已经开了，是 ACL 没放行。默认策略的 `dst` 是 `autogroup:self`，只允许连自己名下的设备，协作者进不了 Owner 这台云电脑。

给云主机打 `tag:ssh`，ACL 里放行协作者到这个 tag。`dst` 写 tag，个人套餐不接受把另一个用户的邮箱写在 `dst` 上。`autogroup` 用单数 `autogroup:member`。

```json
{
  "tagOwners": {
    "tag:ssh": ["owner@example.com"]
  },
  "ssh": [
    {
      "action": "check",
      "src": ["autogroup:member"],
      "dst": ["autogroup:self"],
      "users": ["autogroup:nonroot", "root"]
    },
    {
      "action": "accept",
      "src": ["collaborator@github"],
      "dst": ["tag:ssh"],
      "users": ["dev", "autogroup:nonroot"]
    }
  ]
}
```

在 Machines 里给云主机打上 `tag:ssh`，发布 ACL，再连一次：

```bash
tailscale ssh dev@100.x.x.A
```

这时应该能以 `dev` 登录。

<!--
TODO: 下面「用 Grok Bot 当出口」还没实际操作，先整段注释，不要删。

## 6. 用 Grok Bot 当出口

目标不是「SSH 进 VPS 之后，这台机器的全部流量都改走 Grok Bot」。只让走进 3X-UI、并且命中路由的流量，从 Grok Bot 云电脑的出口 IP 出去。解锁 Gemini 时，路由只匹配 `domain:googleapis.com`。

两条机器：

- Grok Bot 云电脑：用户 `dev`，Tailscale 用户态组网，没有 `tailscale0`。
- 自己的 VPS：协作账号下的节点，上面跑 3X-UI。

### Grok Bot：只在 tailnet 上暴露 SOCKS5

云电脑没有 `CAP_NET_ADMIN`，内核 TUN 起不来，所以 SOCKS 不能直接绑 Tailscale IP。实际做法：

1. `gost` 只听 `127.0.0.1:1080`，SOCKS5 用户名密码写在 `~/.local/state/socks5/auth.user` 和 `auth.pass`。
2. 用用户目录里的 Tailscale CLI（必须带 `--socket=~/.local/run/tailscale/tailscaled.sock`）执行 `serve --bg --tcp 1080 tcp://127.0.0.1:1080`。这样 `100.x.x.A:1080` 只在 tailnet 内可访问，没有开 Funnel。
3. `supervise-socks5.sh` 负责进程挂了就拉起，并反复确认 Serve 还在。`~/.profile` 在登录 shell 里发现监督脚本不在就后台启动。这台环境没有 systemd，也没有 crontab。

UDP 到不了对端。gost 在本机回环上能做 SOCKS5 UDP ASSOCIATE，但 `tailscale serve --tcp` 只转发 TCP。要让对端直接打到 `100.x.x.A` 的 UDP，需要把套接字绑到 Tailscale 地址，而这台 VM 没有 TUN。

Tailscale SSH 的登录用户是 `dev`，不是 `root`。策略没放行时，会报 `tailnet policy does not permit you to SSH as user "root"`；用户不存在时，也会报「不允许以该用户 SSH」。`nobody`、`www-data` 这种系统账号即使放行，也会 `can't switch user`。

### VPS：组网之后先修 DNS

VPS 用官方脚本装 Tailscale，`tailscale up` 进同一个 tailnet。阿里云内网 DNS 是 `100.100.2.136` / `100.100.2.138`，落在 Tailscale 占用的 `100.64.0.0/10` 里。Tailscale 会丢掉「源地址在这段、但不是从 `tailscale0` 进来」的包，所以查询发出去，回包被丢，`www.google.com` 解析超时。3X-UI 测出站时先解析这个测试地址，于是失败信息是 `cannot resolve host www.google.com`，还没轮到测 SOCKS。

处理：DHCP 不再采用阿里云下发的 DNS，改用 `223.5.5.5` 和 `223.6.6.6`，写在 `/etc/netplan/99-dns.yaml`（`dhcp4-overrides.use-dns: false`）。公网 DNS 不在 `100.64.0.0/10`，回包不会被丢掉。

### 3X-UI：一条出站，一条域名路由

出站 `grok-bot`：

- 协议 `socks`
- 地址是 Grok Bot 的 Tailscale IP，端口 `1080`
- 用户名密码与云电脑上的 `auth.user` / `auth.pass` 相同
- `targetStrategy` 为 `UseIPv4`

路由插在 api 规则之后：

- `domain`: `domain:googleapis.com`
- `outboundTag`: `grok-bot`
- 不填入站标签，表示之后任何入站进来的、命中这个域名的流量都走这条出站

面板保存的是整份 Xray 模板（接口字段名 `xraySetting`），提交时用表单，不是 JSON body。保存成功后核心通过 API 热更新，不必整面板重启。

### 验证

从 VPS 直接打 SOCKS：

```bash
curl -U 'USER:PASS' --socks5-hostname 100.x.x.A:1080 https://ifconfig.me
```

面板里对 `grok-bot` 做出站测试，应返回 HTTP 204，出口是 Grok Bot 云电脑的公网 IP。对 `generativelanguage.googleapis.com:443` 做路由测试，命中的出站是 `grok-bot`。

还没做的一步：3X-UI 里还没有给客户端用的入站。没有入站时，这条路由不会改 SSH 登录 VPS 之后系统自己发出的流量。
-->

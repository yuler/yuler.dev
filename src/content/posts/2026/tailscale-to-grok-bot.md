---
title: ''
description: ''
tags: []
date: 2026-09-23
draft: true
---

在 Grok Bot 云电脑上装 Tailscale，并配置跨账号 SSH ACL
背景
想在「Grok Bot 云主机」和自己的其它机器之间组一个私有网，并让协作账号能 tailscale ssh 进来。云主机环境没有完整的 systemd / 常规 TUN 权限，和家里 NAS 那套装法不太一样。

1. 安装与登录
   在用户目录下落地官方二进制（示例路径：~/.local/tailscale/），用 userspace networking 跑 tailscaled（无 --tun=userspace-networking）。
   原因：/dev/net/tun 在，但创建 tailscale0 报 operation not permitted（缺少 CAP_NET_ADMIN），没法走内核 TUN。
   状态目录与 socket 放在用户目录（例如 ~~/.local/state/tailscale/、~~/.local/run/tailscale/tailscaled.sock），CLI 一律带 --socket=...。
   用 Owner 账号浏览器授权登录后，节点拿到 Tailscale IP（下文记为 100.x.x.A），主机名类似 grok-bot-vm-********。
2. 把另一个账号拉进同一个 tailnet
   Tailscale 没有「组」按钮，对应的是 tailnet。

Owner 在 Admin → Users 里 Invite external users，复制邀请链接（Free 计划常见是链接邀请，不一定填邮箱）。
对方用自己的登录身份接受（示例：GitHub 登录，下文记为 collaborator@github）。
Free 计划下邀请用户需 Admin Approve 后才真正进网。
需要的话把该用户角色从 Member 调成 Admin。
对方本机若早就装过 Client、以前连的是自己的私人网：需要在 Client 里 Log out 再 Log in（仍用同一个 collaborator@github，不要改成 Owner 邮箱）。网页上的「Download」可以忽略。

3. 开启 Tailscale SSH
   在云主机上：

tailscale --socket=... set --ssh
确认 prefs 里 RunSSH: true。Machines 页该节点会出现 SSH 标记。

协作机器上尝试：

tailscale ssh <local-user>@100.x.x.A
若出现：

tailnet policy does not permit you to SSH to this node
说明 SSH 开关已开，但 ACL 没放行，不是 Client 坏了。

4. ACL 踩坑与最终写法
   **默认策略（示意）**大致是：

"ssh": [
{
"action": "check",
"src": ["autogroup:member"],
"dst": ["autogroup:self"],
"users": ["autogroup:nonroot", "root"]
}
]
dst: autogroup:self 只允许连 自己名下 的设备。协作账号进不了 Owner 名下的云主机。

失败尝试：

写法	结果
dst: ["autogroup:members"]	校验失败：invalid dst
dst: ["*"] / 直接写 IP	同样不接受（本环境实测）
src: collaborator + dst: owner@email	校验失败：users in dst are only allowed from the same user（跨用户 dst 受限，常见于个人/Free 套餐）
可行做法：用 tag，而不是写对方的邮箱当 dst。

ACL 里声明 tag 归属，并增加跨用户 SSH 规则（示意，已打码）：
"tagOwners": {
"tag:ssh": ["owner@*****.com"]
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
"users": ["box", "autogroup:nonroot"]
}
]
在 Machines 里给云主机打上 tag:ssh。
发布 ACL 后再试 tailscale ssh box@100.x.x.A，应可连通。
注意：autogroup 用单数 autogroup:member，不要写成 members。

5. 小结
   受限 VM：优先 userspace Tailscale，接受没有 tailscale0。
   跨账号进网：邀请链接 → 批准 →（可选）Admin；Client 需重新登录同一身份。
   tailscale set --ssh 只开能力；跨 Owner 的 SSH 靠 ACL。
   个人网跨用户 SSH：不要用「对方邮箱当 dst」，改用 tag: + tagOwners，再给目标机器打 tag。
   打码对照（写 blog 时勿贴原文）
   原文角色	文中写法
   Owner 邮箱 / 控制台账号	owner@*****.com / Cozilla41
   协作 GitHub 身份	collaborator@github
   云主机 Tailscale IP	100.x.x.A
   本机 Linux 用户	box
   邀请链接 / 密码类凭证	一律省略
   需要的话我可以再补一版「英文标题 + 大纲」或把 SOCKS5（Serve + 鉴权）那一段也加成附录。

## 6. 用 Grok Bot 当出口

目标不是「SSH 进 VPS 之后，这台机器的全部流量都改走 Grok Bot」。只让走进 3X-UI、并且命中路由的流量，从 Grok Bot 云电脑的出口 IP 出去。解锁 Gemini 时，路由只匹配 `domain:googleapis.com`。

两条机器：

- Grok Bot 云电脑：用户 `box`，Tailscale 用户态组网，没有 `tailscale0`。
- 自己的 VPS：协作账号下的节点，上面跑 3X-UI。

### Grok Bot：只在 tailnet 上暴露 SOCKS5

云电脑没有 `CAP_NET_ADMIN`，内核 TUN 起不来，所以 SOCKS 不能直接绑 Tailscale IP。实际做法：

1. `gost` 只听 `127.0.0.1:1080`，SOCKS5 用户名密码写在 `~/.local/state/socks5/auth.user` 和 `auth.pass`。
2. 用用户目录里的 Tailscale CLI（必须带 `--socket=~/.local/run/tailscale/tailscaled.sock`）执行 `serve --bg --tcp 1080 tcp://127.0.0.1:1080`。这样 `100.x.x.A:1080` 只在 tailnet 内可访问，没有开 Funnel。
3. `supervise-socks5.sh` 负责进程挂了就拉起，并反复确认 Serve 还在。`~/.profile` 在登录 shell 里发现监督脚本不在就后台启动。这台环境没有 systemd，也没有 crontab。

UDP 到不了对端。gost 在本机回环上能做 SOCKS5 UDP ASSOCIATE，但 `tailscale serve --tcp` 只转发 TCP。要让对端直接打到 `100.x.x.A` 的 UDP，需要把套接字绑到 Tailscale 地址，而这台 VM 没有 TUN。

Tailscale SSH 的登录用户是 `box`，不是 `root`。策略没放行时，会报 `tailnet policy does not permit you to SSH as user "root"`；用户不存在时，也会报「不允许以该用户 SSH」。`nobody`、`www-data` 这种系统账号即使放行，也会 `can't switch user`。

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

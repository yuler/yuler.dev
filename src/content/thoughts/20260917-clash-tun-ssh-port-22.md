---
date: 2026-09-17T06:34:00Z
tags: ["clash", "ssh"]
---

Clash 开启 TUN 模式后，SSH 经常连不上服务器，通常是因为代理服务商默认禁止转发 22 端口流量。

之前一直是通过给每个服务器域名或 IP 加 DIRECT 白名单，后来发现更省事的做法是直接按端口分流，将 22 端口设为直连。

在 Clash Verge 的配置扩展（如订阅的 Rules 或全局 Merge）中添加前置规则，订阅更新也不会被覆盖：

```yaml
prepend:
  - DST-PORT,22,DIRECT
```

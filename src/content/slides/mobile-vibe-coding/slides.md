---
theme: default
title: 纯手机 Vibe Coding 实战
info: |
  ## 纯手机 Vibe Coding 实战
  告别编辑器，手机端原生 AI 与 AI APP 端到端生产闭环
class: text-center
highlighter: shiki
lineNumbers: true
drawings:
  persist: false
transition: slide-left
css: unocss
---

# 纯手机 Vibe Coding 实战

### 告别手写与编辑器 · 手机端原生 AI 端到端生产闭环

<div class="mt-6 p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 text-left">
  <div class="text-sm font-semibold mb-1.5 text-sky-400 flex items-center gap-2">
    <span>💡</span> 核心思想
  </div>
  <p class="text-xs text-slate-300 leading-relaxed">
    通过手机去操作，利用原生 AI 以及 AI APP（例如这个，还有那个等等）。因为现在编程都不是手写的，所以我们都不需要编辑器（Editor）了，直接由 AI 生成代码就行。
  </p>
</div>

<div class="mt-5 text-left">
  <div class="text-xs font-mono text-slate-400 mb-2.5">📋 具体闭环思路：</div>
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-2.5 p-2 rounded bg-slate-800/40 border border-slate-700/60 text-xs text-slate-200">
      <span class="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[11px] shrink-0 font-bold">1</span>
      <span>通过 <b>GitHub APP</b> review 大概的内容</span>
    </div>
    <div class="flex items-center gap-2.5 p-2 rounded bg-slate-800/40 border border-slate-700/60 text-xs text-slate-200">
      <span class="w-5 h-5 flex items-center justify-center rounded-full bg-blue-500/20 text-blue-400 font-mono text-[11px] shrink-0 font-bold">2</span>
      <span>由 <b>AI</b> 去写代码</span>
    </div>
    <div class="flex items-center gap-2.5 p-2 rounded bg-slate-800/40 border border-slate-700/60 text-xs text-slate-200">
      <span class="w-5 h-5 flex items-center justify-center rounded-full bg-purple-500/20 text-purple-400 font-mono text-[11px] shrink-0 font-bold">3</span>
      <span><b>AI</b> 再进行 review</span>
    </div>
    <div class="flex items-center gap-2.5 p-2 rounded bg-slate-800/40 border border-slate-700/60 text-xs text-slate-200">
      <span class="w-5 h-5 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-mono text-[11px] shrink-0 font-bold">4</span>
      <span>补充一些测试</span>
    </div>
    <div class="flex items-center gap-2.5 p-2 rounded bg-slate-800/40 border border-slate-700/60 text-xs text-slate-200">
      <span class="w-5 h-5 flex items-center justify-center rounded-full bg-sky-500/20 text-sky-400 font-mono text-[11px] shrink-0 font-bold">5</span>
      <span>进行线上验证</span>
    </div>
  </div>
</div>

<div class="mt-8 text-slate-400 text-xs font-mono">
  分享人：Yuler
</div>

<!--
各位同行、朋友们大家好！今天我想和大家分享一个彻底颠覆我日常开发习惯的范式：
“纯手机 Vibe Coding 实战”。

现在的编程时代已经彻底变了——代码不再需要我们用手在键盘上一行行手写，我们甚至完全不需要编辑器（Editor）了！
核心思想就是纯粹通过手机去操作，充分利用手机上的原生 AI 以及各类 AI APP，直接把意图交由 AI 生成完整代码。

整套生产闭环的具体思路大概如下：
1. 随时随地通过手机端的 GitHub APP review 大概的需求与代码内容；
2. 调度 AI 去写核心业务代码；
3. 由 AI 再次进行 review，交叉校验；
4. 补充相关测试用例，保障健壮性；
5. 最后直接推送到线上进行真实环境验证。

接下来我们将一步步展开这套无需编辑器、全靠手机与 AI 协同的极速开发闭环！
-->

---
layout: default
---

# 核心思想：为什么我们不再需要编辑器？

告别手写语法打字，手机是意图控制台，AI 端到端闭环交付

<div class="grid grid-cols-2 gap-8 mt-6">

<div class="p-5 rounded-xl border border-red-500/20 bg-red-500/5">
  <h3 class="text-red-400 font-bold text-lg mb-3 flex items-center gap-2">
    <span>❌</span> 传统编程依赖编辑器
  </h3>
  <ul class="space-y-3 text-sm text-slate-300">
    <li><b>人工输入语法：</b> 必须依赖键盘逐字敲括号、分号与缩进，手机小屏幕输入效率极低</li>
    <li><b>沉重工具链：</b> 依赖 VS Code 等庞大 IDE、各种插件生态以及本地环境配置</li>
    <li><b>心智负担繁重：</b> 大量精力被困在排查语法拼写与繁琐工具配置上</li>
  </ul>
</div>

<div class="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
  <h3 class="text-emerald-400 font-bold text-lg mb-3 flex items-center gap-2">
    <span>✨</span> AI 原生移动端范式
  </h3>
  <ul class="space-y-3 text-sm text-slate-300">
    <li><b>完全告别编辑器：</b> 编程不再手写，不需要任何 Editor，由 AI 端到端直接生成代码</li>
    <li><b>手机即控制台：</b> 利用原生 AI 以及各种 AI APP，发号施令并驱动开发任务</li>
    <li><b>端到端质量闭环：</b> GitHub APP 审查 + AI 写码 + AI 复审 + 测试补充 + 线上秒级验证</li>
  </ul>
</div>

</div>

<div class="mt-8 p-3 rounded-lg bg-slate-800/60 border border-slate-700 text-center font-mono text-xs text-slate-300">
  💡 核心哲学：告别编辑器，手机握在掌心，AI 顶在前面，意图即交付。
</div>

<!--
我们来聊透“核心思想”。
为什么以前用手机写代码是受罪，现在却变成了一种享受？
因为编程的本质变了——我们根本不需要编辑器（Editor）了。
过去写代码 80% 的精力花在键盘敲语法、查文档补全、配 IDE 插件上。
但在今天：
第一，代码逻辑由 AI 全权负责编写，我们根本不需要在手机屏幕上去手写代码；
第二，手机只做意图表达与质量决策：
通过 GitHub APP 看需求，让 AI 写代码，AI 交叉 review，补充测试，直接上线验证。
手机只做控制面，计算与实现交给 AI，不需要编辑器，这就是 AI 原生时代的极速闭环！
-->

---
layout: default
---

# 整体系统拓扑：端到端解耦架构

从上往下看：两条入口汇合到本地，再提交、Review、用手机浏览器看结果

<div class="topo">
  <div class="topo-fork">
    <div class="topo-card">
      <div class="topo-kicker">路径一</div>
      <div class="topo-title">AI 客户端</div>
      <div class="topo-line">Cursor</div>
      <div class="topo-line">Grok Bot</div>
      <div class="topo-line">Muse · Codex</div>
      <div class="topo-note">不经过终端</div>
    </div>
    <div class="topo-card">
      <div class="topo-kicker">路径二</div>
      <div class="topo-title">终端 Termius</div>
      <div class="topo-note">先连到本地</div>
      <div class="topo-line">SSH</div>
      <div class="topo-line">UU 远程的 SSH</div>
      <div class="topo-line">Tailscale 隧道</div>
    </div>
  </div>
  <div class="topo-arrow"></div>
  <div class="topo-step">本地 Mac mini · 写代码</div>
  <div class="topo-arrow"></div>
  <div class="topo-step">提交到 GitHub</div>
  <div class="topo-arrow"></div>
  <div class="topo-step">机器人 PR Review</div>
  <div class="topo-arrow"></div>
  <div class="topo-fork">
    <div class="topo-card">
      <div class="topo-kicker">看结果</div>
      <div class="topo-title">远程服务器</div>
      <div class="topo-note">手机浏览器打开线上页面</div>
    </div>
    <div class="topo-card">
      <div class="topo-kicker">或</div>
      <div class="topo-title">留在本地</div>
      <div class="topo-note">手机走局域网浏览器打开</div>
    </div>
  </div>
</div>

<!--
这张图从上往下看，不要横着扫。
手机上有两条路。
第一条是 AI 客户端：Cursor、Grok Bot，同类的还有 Muse、Codex 这种，不经过终端。
第二条是终端，用 Termius。终端前面还有一层连接，才能传到家里的机器：可以直接 SSH，可以用 UU 远程里的 SSH，也可以走 Tailscale 隧道。
两条路汇合到本地 Mac mini，在这里写代码，然后提交到 GitHub。
机器人做 PR Review。通过之后有两种看结果的方式：部署到远程服务器，手机浏览器打开线上页面；或者就跑在本地，手机用局域网浏览器打开。
-->

---
layout: default
---

# 隧道连接工具矩阵：内外网打通方案

宿主机预先授权 Agent，手机随时随地秒进开发会话

<div class="grid grid-cols-2 gap-6 mt-4">

<div class="p-4 rounded-xl border border-sky-500/30 bg-sky-500/5 flex flex-col justify-between">
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sky-400 font-bold text-base">🖥️ 电脑/节点端：穿透与远程矩阵</h3>
      <span class="text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">宿主机已授权 Agent</span>
    </div>
    <ul class="space-y-3 text-xs text-slate-300 mt-2">
      <li>
        <b class="text-sky-300">🏠 在家直连场景：</b><br>
        无需开电脑屏幕，直接基于家庭局域网 IP 直连 SSH，延迟趋近于 0，极速进入工作状态。
      </li>
      <li>
        <b class="text-emerald-300">🌟 外出主力 · UU 远程 (UU Remote)：</b><br>
        • <b>常规主力：</b>使用 UU 远程内置的 SSH 终端，穿透稳定迅速。<br>
        • <b>备用逃生舱：</b>自带低延迟图形桌面，需要启动特定 GUI 应用或看 DevTools 时一键切入。
      </li>
      <li>
        <b class="text-purple-300">🛡️ 安全兜底 · Tailscale：</b><br>
        基于 WireGuard 的加密 Mesh 虚拟私网，在复杂网络环境下提供零端口暴露的安全直连兜底。
      </li>
    </ul>
  </div>
  <div class="mt-3 p-2 bg-slate-900/60 rounded border border-slate-800 text-[11px] text-slate-400">
    💡 提示：Mac mini 无头运行，通过快捷脚本自动解锁 Keychain。
  </div>
</div>

<div class="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between">
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-emerald-400 font-bold text-base">📱 手机端：终端连接利器</h3>
      <span class="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">iOS 首选推荐</span>
    </div>
    <ul class="space-y-3 text-xs text-slate-300 mt-2">
      <li>
        <b class="text-emerald-300">⚡ Termius：</b><br>
        iOS 生态综合体验最好的 SSH 客户端。支持多主机分组、会话保持与弱网自动重连。
      </li>
      <li>
        <b class="text-amber-300">🚀 Snippets 快捷宏指令：</b><br>
        把常用长指令（如调起 Agent CLI、进入工程目录、启动 dev 服务）预置为快捷块，单指一触即发。
      </li>
      <li>
        <b class="text-sky-300">⌨️ 触控优化手势键盘：</b><br>
        配备专为 Terminal 设计的辅助功能键（Esc、Tab、Ctrl、方向键），操作 Shell 行云流水。
      </li>
    </ul>
  </div>
  <div class="mt-3 p-2 bg-slate-900/60 rounded border border-slate-800 text-[11px] text-slate-400">
    💡 场景：在家用局域网直连 Termius；在外直接走 UU 远程内置终端或 Tailscale。
  </div>
</div>

</div>

<div class="mt-6 p-3 rounded-lg bg-slate-800/80 border border-slate-700 text-center text-xs text-slate-300">
  🔑 核心认知：连接工具的目标是<b>“消除物理距离”</b>，让常开的主机如同放在口袋里一样触手可得。
</div>

<!--
在第二部分，我们来重点拆解隧道连接工具。
这是很多尝试“手机写代码”的同学卡住的第一道门槛：
很多人以为连远程必须买昂贵的公网 IP 服务器，其实完全不需要。
我们分两个场景：
第一个场景是在家：你窝在沙发上或者躺在床上，家里 Mac mini 静音开着，你连显示器都不用开，掏出 iPhone 打开 Termius，直接输局域网 IP，秒进 SSH，延迟只有几毫秒。
第二个场景是出门在外：我们的主力是“UU 远程”。UU 远程不仅能串流桌面，关键是它内置的 SSH 非常好用，而且一旦遇到需要启动某个图形界面应用、或者需要肉眼看一眼本地 DevTools 时，随时一键滑入图形桌面，这就是我们的“可视化逃生舱”。
同时，Tailscale 作为一个加密 Mesh 私网作为兜底，确保在任何复杂网络下都能打通。
-->

---
layout: default
---

# 工具一 · UU 远程：外出主力穿透与图形化“逃生舱”

常规使用内置 SSH 终端，随时一键滑入 macOS 桌面

<div class="grid grid-cols-2 gap-6 mt-2 items-center">

<div class="space-y-4 text-sm text-slate-300">
  <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
    <h4 class="text-sky-400 font-semibold mb-1">🎯 主力穿透与最终兜底双重定位</h4>
    <p class="text-xs text-slate-400">出门在外的连接主力。常规使用其内置 SSH 极速打通；当终端遇到瓶颈需要查看复杂 UI、本地 DevTools 或处理特定弹窗时，随时滑入桌面接管。</p>
  </div>

  <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
    <h4 class="text-sky-400 font-semibold mb-1">🔍 截图中的实战场景</h4>
    <ul class="text-xs list-disc list-inside space-y-1 text-slate-400">
      <li>展示手机屏幕直接操控 Mac mini 上的 Cursor IDE 窗口</li>
      <li>查看 <code class="text-sky-300">k41</code> 工作区中 <code class="text-sky-300">SignInDialog</code> 组件代码与未提交变更</li>
      <li>右侧内嵌浏览器：直观观测本地服务端口与页面截图渲染</li>
    </ul>
  </div>

  <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
    <h4 class="text-sky-400 font-semibold mb-1">💡 极客配置建议</h4>
    <p class="text-xs text-slate-400">将 Mac mini 配合虚拟显示插件（如 BetterDisplay 虚拟 1080p），开启触控惯性指针，单指滑动、双指缩放极度丝滑。</p>
  </div>
</div>

<div class="flex justify-center">
  <img src="./images/01-uu-remote.jpg" class="rounded-xl shadow-2xl border border-slate-700 max-h-[380px] object-contain hover:scale-105 transition-all duration-300" />
</div>

</div>

<!--
现在来看实战截图一：UU 远程。
大家看截图，这是我手机上直接接管家里 Mac mini 桌面的真实画面：
屏幕里开着 Cursor，左边在看 k41 项目的 SignInDialog 登录弹窗代码，右边内嵌的浏览器正在实时捕获 DevTools 截图。
为什么我们要把 UU 远程作为主力？
因为在公网环境下，它穿透极快，常规直接用它的内置 SSH 敲命令；
而一旦遇到样式偏离、本地多窗口排查，你 3 秒钟之内就能直接降落到桌面，绝对不会因为“纯命令行看不到界面”而陷入两眼一抹黑的窘境。
-->

---
layout: default
---

# 工具二 · Termius + Agent CLI：掌上纯文本极速交互

在家庭局域网与移动网络中，秒级唤醒 YOLO 自治 Agent

<div class="grid grid-cols-2 gap-6 mt-2 items-center">

<div class="space-y-3 text-sm text-slate-300">
  <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
    <h4 class="text-emerald-400 font-semibold mb-1">⚡ Agent CLI YOLO 自治模式</h4>
    <ul class="text-xs list-disc list-inside space-y-1 text-slate-400">
      <li>终端输入 <code class="text-emerald-300">ca</code>（<code class="text-emerald-300">cursor-agent</code> 的 alias）调起 Agent</li>
      <li>开启 YOLO 模式：赋予防灾沙盒内的终端自主执行权，自动改文件与跑单测，杜绝手机端频繁弹窗按确认</li>
    </ul>
  </div>

  <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
    <h4 class="text-emerald-400 font-semibold mb-1">📱 Termius 实操利好</h4>
    <p class="text-xs text-slate-400">在家里直接敲局域网 IP 秒连；外出配合穿透无缝重连，后台挂起不掉线。</p>
  </div>

  <div class="p-3 rounded-lg bg-slate-800/40 border border-sky-500/20">
    <h4 class="text-sky-400 font-semibold mb-1">💡 Tip：SSH 解锁 Keychain</h4>
    <div class="text-xs font-mono text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800">
      <span class="text-slate-500">yule@macmini k41 %</span> mac-unlock-keychain<br>
      <span class="text-emerald-400">login keychain unlocked</span>
    </div>
    <p class="text-xs text-slate-400 mt-1">根除 macOS 无头 SSH 会话中无法读取 Git/SSH 密钥与私有环境变量的痛点。</p>
  </div>
</div>

<div class="flex justify-center">
  <img src="./images/02-termius-cursor-cli.jpg" class="rounded-xl shadow-2xl border border-slate-700 max-h-[380px] object-contain hover:scale-105 transition-all duration-300" />
</div>

</div>

<!--
接下来是工具二：Termius 终端配 Agent CLI（图二）。
大家看截图，核心是调起 cursor-agent（alias 是 ca），模型选 Grok 4.7 256K，并且必须带上 [yolo] 参数！
为什么在手机上一定要 YOLO 模式？
因为手机屏幕小，如果 Agent 每跑一条命令、改一个文件都要停下来问你“是否确认”，在手机上会让人崩溃。开启 YOLO，让 Agent 在 Git 版本控制保护下自主跑单测、改代码，你只管提需求看结果。
最后补一个 Tip：macOS 的 SSH 默认会锁死 Keychain 钥匙串，导致你的 Git pull/push 弹密码挂死。连上之后跑一下 mac-unlock-keychain，自动解锁，保证所有凭据通行无阻。
-->

---
layout: default
---

# 第三部分 · 多元 Agent 工具生态

终端交互流 vs 免终端轻量流，按需选择交互深度

<div class="grid grid-cols-2 gap-6 mt-4">

<div class="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 flex flex-col justify-between">
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-purple-400 font-bold text-base">轨 A · 终端交互流 (Direct CLI)</h3>
      <span class="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">深度聚焦 / 掌控思维链</span>
    </div>
    <p class="text-xs text-slate-300 mb-3">直面 Agent 思维脉络与终端日志，适合架构重构与疑难 Debug。</p>
    <div class="space-y-2 text-xs font-mono text-slate-400 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
      <div>💻 <b>Termius:</b> SSH 直连宿主机</div>
      <div>⬇️ <b>ca [yolo]:</b> cursor-agent 的 alias，自主规划、改文件、跑测试</div>
      <div>⬇️ <b>实时打断:</b> 随时按 Ctrl+C 调整提示词</div>
    </div>
  </div>
  <div class="mt-4 text-xs text-purple-300/80">核心优势：无中间层包装，真实输出尽在眼底</div>
</div>

<div class="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 flex flex-col justify-between">
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-blue-400 font-bold text-base">轨 B · 免终端轻量流 (Lightweight)</h3>
      <span class="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">碎片时间 / 单手操作</span>
    </div>
    <p class="text-xs text-slate-300 mb-3">不用进黑漆漆的命令行，靠原生 App 与群聊即可派活。</p>
    <div class="space-y-2 text-xs font-mono text-slate-400 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
      <div>📱 <b>Cursor iOS App:</b> 语音输入意图、思维链可视化</div>
      <div>💬 <b>Grok / Grok Bot:</b> 群聊直接派单、多 Agent 自动提 PR</div>
      <div>🔄 <b>云端漫游:</b> 手机讨论进度随时漫游至电脑</div>
    </div>
  </div>
  <div class="mt-4 text-xs text-blue-300/80">核心优势：自然语言沟通，像和真人同事协作一样轻松</div>
</div>

</div>

<div class="mt-6 p-3 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
  <span class="text-slate-300 font-semibold">🔄 最终汇流：</span>
  <span class="font-mono text-emerald-400">无论哪种交互流，最终产物统一汇聚至 Git 分支与 PR，接受统一架构 Review</span>
</div>

<!--
进入第三部分：其他 Agent 工具生态。
我们把平时的使用方式拆解为两条轨：
第一条是“终端交互流”：通过 Termius 连进去跑 CLI Agent。你可以在手机上亲眼看着 Agent 的思维链、看它改了哪些文件、看单测输出，适合中大型需求；
第二条是“免终端轻量流”：
比如 Cursor iOS 原生客户端，利用手机语音输入法直接说话，Agent 帮你探索文件；
又比如 Grok Bot 群聊，甚至连 App 都不用开，在群里发一条消息，背后的 Coder 机器人自动开工写代码开 PR。
两条轨互为补充，丰俭由人。
-->

---
layout: default
---

# 工具三 · Cursor iOS 原生客户端：移动端沉浸对齐

触手可及的上下文探索与思维链结构化呈现

<div class="grid grid-cols-2 gap-6 mt-2 items-center">

<div class="space-y-4 text-sm text-slate-300">
  <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
    <h4 class="text-purple-400 font-semibold mb-1">📱 原生交互与语音输入优势</h4>
    <p class="text-xs text-slate-400">比起纯 Web 终端，原生 App 对 iOS 键盘与听写输入支持极佳，大拇指按住语音说话，一句话表达复杂设计意图。</p>
  </div>

  <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
    <h4 class="text-purple-400 font-semibold mb-1">🧠 思维链与文件探索可视化</h4>
    <ul class="text-xs list-disc list-inside space-y-1 text-slate-400">
      <li>清晰展示 Agent 思考耗时（如：<code class="text-purple-300">Thought 1s</code>）</li>
      <li>展开折叠 Agent 探索的文件列表（如：<code class="text-purple-300">Explored 1 file</code>）</li>
      <li>清晰查看分步规划与执行结论</li>
    </ul>
  </div>

  <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
    <h4 class="text-purple-400 font-semibold mb-1">🔄 多端会话状态无缝漫游</h4>
    <p class="text-xs text-slate-400">在手机端发起的讨论和代码生成，回到家打开电脑桌面版 Cursor 时，全部历史原封不动同步，无痛接力。</p>
  </div>
</div>

<div class="flex justify-center">
  <img src="./images/03-cursor-ios.jpg" class="rounded-xl shadow-2xl border border-slate-700 max-h-[380px] object-contain hover:scale-105 transition-all duration-300" />
</div>

</div>

<!--
这是第三件武器：Cursor 的 iOS 官方客户端（图三）。
如果你在散步、不方便敲键盘，原生 App 就是神器。
你可以直接使用 iOS 自带的语音听写：“帮我给底部加一行 build 时间和 commit hash，样式和全局主题一致”。
看截图：Cursor 会直观展示“Thought 1s”，展开展示它检索了哪个组件，生成了清晰的修改计划。
而且所有记录和电脑桌面端是实时漫游同步的，出门手机聊、回家电脑看。
-->

---
layout: default
---

# 工具四 · Grok Bot 协同群：多 Agent 的“微信办公室”

人类只做需求提出者，AI 员工自行组队、开 PR、互相审查

<div class="grid grid-cols-2 gap-6 mt-2 items-center">

<div class="space-y-3 text-sm text-slate-300">
  <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
    <h4 class="text-amber-400 font-semibold mb-1">🤖 Coder Agent 交付 PR</h4>
    <p class="text-xs text-slate-400">自主完成功能开发后，直接在群内同步：</p>
    <div class="text-xs font-mono text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800">
      底部 build 时间 + commit 的 PR 开好了：<br>
      <span class="text-amber-400">https://github.com/yuler/k41/pull/3</span><br>
      页面底部灰色小字显示 构建时间 + 7 位 commit<br>
      <span class="text-sky-300">@PR Reviewer</span> 麻烦看一下。
    </div>
  </div>

  <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
    <h4 class="text-emerald-400 font-semibold mb-1">🛡️ PR Reviewer Agent 自动化评审</h4>
    <div class="text-xs font-mono text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800">
      <b>收到，开始看 #3。</b><br>
      我会本地分别跑一次带构建参数的打包和一次不带的，截图页面底部，用 <b>Cozilla41</b> 在 PR 上留 comment，再回群同步。
    </div>
  </div>

  <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
    <h4 class="text-purple-400 font-semibold mb-1">✨ 极客价值：群聊驱动的敏捷协作</h4>
    <p class="text-xs text-slate-400">无需打开专业 IDE，把工程任务拆解给专职 Agent 消化，人类退居幕后。</p>
  </div>
</div>

<div class="flex justify-center">
  <img src="./images/04-grok-bot-im.jpg" class="rounded-xl shadow-2xl border border-slate-700 max-h-[380px] object-contain hover:scale-105 transition-all duration-300" />
</div>

</div>

<!--
第四件武器更具未来感：Grok Bot 协同群（图四）。
大家仔细看这张真实的群聊截图：
群里有专门的 Coder 机器人和 Reviewer 机器人。
Coder 机器人写完代码，自动发帖：“底部 build 时间 + commit 的 PR 开好了，附带链接，@PR Reviewer 麻烦看一下”。
Reviewer 机器人秒回：“收到，开始看 #3。本地分别跑带参数与不带参数的打包，截图底部并在 PR 留言”。
在这个模式下，你的手机就是一个移动项目管理中心，AI 员工各司其职，你只需静候佳音。
-->

---
layout: default
---

# 第四部分 · 架构 Review 与 GitHub 提交

人机双重把关：AI 自述改动，人类掌上审核并按下合并闸门

<div class="grid grid-cols-2 gap-6 mt-2 items-center">

<div class="space-y-3 text-sm text-slate-300">
  <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
    <h4 class="text-indigo-400 font-semibold mb-1">📋 真实 PR 审查 (#3)</h4>
    <p class="text-xs font-mono text-slate-300">
      <b>yuler/k41 #3:</b> [web] Show build time and commit in footer<br>
      <span class="text-indigo-400">main ← feat/web-build-footer</span>
    </p>
    <p class="text-xs text-slate-400 mt-1">由协同机器人账号 <b>Cozilla41</b> 自动发起，附带清晰的改动 Summary 与影响范围。</p>
  </div>

  <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
    <h4 class="text-emerald-400 font-semibold mb-1">⚙️ 人机双重架构审查标准</h4>
    <ul class="text-xs list-disc list-inside space-y-1 text-slate-400">
      <li><b>步骤一 (AI 自述)：</b> Agent 提交时简述架构改动（如本次通过 Vite define 注入编译期常量，通过 Docker ARG 传参）</li>
      <li><b>步骤二 (人类把关)：</b> 在手机 GitHub App 上花 30 秒扫读 Files Changed，确认无越权改动或多余依赖</li>
    </ul>
  </div>

  <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
    <h4 class="text-amber-400 font-semibold mb-1">👆 单手决策门禁</h4>
    <p class="text-xs text-slate-400">确认 CI 绿灯后，大拇指轻按 <b>Squash and merge</b>。AI 拥有全权编码自由，但终极合并权永远在人类手中。</p>
  </div>
</div>

<div class="flex justify-center">
  <img src="./images/05-github-pr.jpg" class="rounded-xl shadow-2xl border border-slate-700 max-h-[380px] object-contain hover:scale-105 transition-all duration-300" />
</div>

</div>

<!--
写完代码后，必须有规范的架构审查与提交流程。
在图五中，我们通过 GitHub 移动端 App 进行审查。
这里是人机双重把关：
第一关：Agent 提 PR 时，会列出架构设计与实现方式，比如本次说明了它是怎么通过 Vite define 注入常量，双环境如何兼顾；
第二关：人类肉眼审查。不需要去咬文嚼字扣语法，重点看架构合理性、改动文件有没有越权。
确认 CI 跑通后，大拇指按一下“Squash and merge”，正式合并！
-->

---
layout: default
---

# 第五部分 · 最重要的一点：查看结果的两种方式

开发联调态 vs 最终交付态，让移动端验证清晰解耦

<div class="grid grid-cols-2 gap-6 mt-4">

<div class="p-4 rounded-xl border border-teal-500/30 bg-teal-500/5 flex flex-col justify-between">
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-teal-400 font-bold text-base">方式 1 · 开发联调态 (本地内网即时看)</h3>
      <span class="text-xs px-2 py-0.5 rounded bg-teal-500/20 text-teal-300">高频调试 / 秒级热更</span>
    </div>
    <p class="text-xs text-slate-300 mb-3">改样式、试效果、调交互，不需要频繁推代码到 GitHub。</p>
    <div class="space-y-2 text-xs font-mono text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
      <div><b>1. 宿主机服务启动：</b><br><span class="text-teal-300">pnpm dev --host 0.0.0.0</span></div>
      <div><b>2. 手机 Safari 访问：</b><br><span class="text-slate-400">http://&lt;局域网 IP 或 Tailscale IP&gt;:3000</span></div>
      <div><b>3. 体验：</b><br>HMR 毫秒级热更新，代码一改手机即变</div>
    </div>
  </div>
  <div class="mt-4 text-xs text-teal-300/80">核心价值：零发布成本，极速试错，不污染 Git 历史</div>
</div>

<div class="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 flex flex-col justify-between">
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-indigo-400 font-bold text-base">方式 2 · 最终交付态 (线上域名自动部署)</h3>
      <span class="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">正式验收 / 生产闭环</span>
    </div>
    <p class="text-xs text-slate-300 mb-3">功能通过验收准备发布，直通线上真实生产域名。</p>
    <div class="space-y-2 text-xs font-mono text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
      <div><b>1. 前置资产：</b><br>自备云服务器 (VPS) + 独立域名</div>
      <div><b>2. 流水线打通：</b><br>GitHub PR 合并 ➔ GitHub Actions 自动触发</div>
      <div><b>3. 生产部署：</b><br>构建 Docker 镜像并推送，自动无缝上线</div>
    </div>
  </div>
  <div class="mt-4 text-xs text-indigo-300/80">核心价值：100% 工业级自动化交付，亲眼见证生产产物上线</div>
</div>

</div>

<div class="mt-6 p-3 rounded-lg bg-slate-800/80 border border-slate-700 text-center text-xs text-slate-300">
  💡 极客准则：<b>调试改动看内网，正式上线看域名。</b> 两套验证链路互不干扰。
</div>

<!--
现在到了最关键的环节：查看结果。
很多人问：“在手机上写完代码，我到底怎么看效果？”
我们必须明确区分两种方式：
第一种是“开发联调态”：你正在改一个按钮颜色或者一个弹窗，这时候千万不要每次都 push 代码。在 Mac mini 上跑 dev 服务时加上 --host 0.0.0.0 暴露端口，手机连着同一个 Wi-Fi（或者在外连着 Tailscale），Safari 输内网 IP 直接看，带有 Vite 的 HMR 秒级热更新，体验飞起！
第二种是“最终交付态”：功能调试完毕了，需要正式上线。这时候你自备一台云服务器和域名，PR 合并之后 GitHub Actions 自动构建 Docker 镜像并部署，手机切公网刷新线上域名验收！
-->

---
layout: default
---

# 生产验收实战：手机浏览器看结果，直接对着结果 Review

打开线上页面，Review 只看浏览器里呈现出来的结果

<div class="grid grid-cols-2 gap-6 mt-2 items-center">

<div class="space-y-4 text-sm text-slate-300">
  <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
    <h4 class="text-teal-400 font-semibold mb-1">🌐 用手机浏览器打开结果</h4>
    <p class="text-xs text-slate-400">PR 合并后自动部署到生产域名。验收时切到手机 Safari，直接打开 <code class="text-teal-300">k41.yuler.cc</code>，看的就是线上这一版。</p>
  </div>

  <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
    <h4 class="text-emerald-400 font-semibold mb-1">🎯 对着页面本身做 Review</h4>
    <ul class="text-xs list-disc list-inside space-y-1 text-slate-400">
      <li>看布局、文案、交互是不是要的那个结果</li>
      <li>不以 diff 或终端日志为准，以浏览器里看到的为准</li>
      <li>Footer 上的构建时间和 commit，用来确认这就是刚合并的那一版</li>
    </ul>
  </div>

  <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
    <h4 class="text-purple-400 font-semibold mb-1">🔁 结果不过就再改一轮</h4>
    <p class="text-xs text-slate-400">页面对了就收；不对就回到手机上改下一轮。全程对着结果验收，不用打开电脑。</p>
  </div>
</div>

<div class="flex justify-center">
  <img src="./images/06-browser-production.jpg" class="rounded-xl shadow-2xl border border-slate-700 max-h-[380px] object-contain hover:scale-105 transition-all duration-300" />
</div>

</div>

<!--
最后一步：用手机浏览器看结果，然后直接对着结果 Review（图六）。
当我们在 GitHub App 点击 Merge 之后，流水线会把这一版部署到线上。
验收时打开手机 Safari，访问 k41.yuler.cc。Review 不回到电脑上看 diff，就看浏览器里这个页面是不是要的结果：布局、文案、交互对不对。
页面底部的构建时间和 commit 哈希，只用来确认你看的就是刚合并的那一版。
对了就收；不对就回到手机上再改一轮。从头到尾只拿一部手机，写完、合并、打开浏览器、对着结果做 Review。
-->

---
layout: default
---

# 深度硬核实战：三大工程支柱剖析

让“手机打代码”从玩具走向高可用工程实践的底层秘密

<div class="grid grid-cols-3 gap-4 mt-6">

<div class="p-4 rounded-xl border border-sky-500/20 bg-sky-500/5">
  <div class="text-sky-400 font-mono text-sm font-bold mb-2">01 · Headless 凭据与网络</div>
  <h4 class="text-white text-sm font-semibold mb-2">UU 远程 + Tailscale + Keychain</h4>
  <p class="text-xs text-slate-400 leading-relaxed">
    • <b>内外网双通道：</b> 在家局域网极速直连，在外 UU 远程主力穿透 + Tailscale 加密 Mesh 私网兜底。<br>
    • <b>mac-unlock-keychain：</b> 自动化解开 macOS 登录钥匙串，彻底根除 SSH 会话中无法拉取私钥与 GitHub Token 的顽疾。
  </p>
</div>

<div class="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
  <div class="text-emerald-400 font-mono text-sm font-bold mb-2">02 · YOLO 机制与多角自治</div>
  <h4 class="text-white text-sm font-semibold mb-2">Agent CLI & 角色分权</h4>
  <p class="text-xs text-slate-400 leading-relaxed">
    • <b>YOLO 自治执行：</b> 给 Agent 赋予终端执行自治权，减少 95% 手机端冗余按键交互。<br>
    • <b>Coder 与 Reviewer 分权：</b> Coder 负责产出与本地预检；Reviewer 负责双构建对比、截图打标与 PR 留言。<br>
    • <b>超大上下文：</b> 256K 超大上下文保持全工程理解，避免手机端反复喂文件。
  </p>
</div>

<div class="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
  <div class="text-purple-400 font-mono text-sm font-bold mb-2">03 · 编译注入与双轨验证</div>
  <h4 class="text-white text-sm font-semibold mb-2">--host 暴露 + GitHub Actions</h4>
  <p class="text-xs text-slate-400 leading-relaxed">
    • <b>联调态内网暴露：</b> 开发服务器绑定 <code class="text-purple-300">--host 0.0.0.0</code>，手机 Safari 免构建即时验证。<br>
    • <b>交付态参数注入：</b> CI 阶段通过 Docker build-arg 捕获精确 commit 和 timestamp。<br>
    • <b>Vite define：</b> 编译期常数替换，零运行时开销渲染构建信息。
  </p>
</div>

</div>

<!--
聊完流程，我们来看看支撑这套系统的三个深水区硬核工程细节：
很多朋友自己尝试搭建时，往往会卡在几个坑里：
第一是 macOS 无头机器的凭据。SSH 连进去 Keychain 是锁死的，Git clone 经常会弹交互密码，脚本直接挂掉。我们用 unlock 脚本彻底解套；网络上利用 UU 远程和 Tailscale 形成稳健通道。
第二是 Agent 行为设计。开启 YOLO 模式，把无谓的确认弹窗全部消灭；
第三是双轨验证的工程化。开发期用 --host 0.0.0.0 暴露局域网给手机，上线期走 Vite define 和 Docker ARG 自动化注入，严丝合缝。
-->

---
layout: default
---

# 安全防护网：手机端敲代码如何防止“翻车”？

三道不可跨越的防线，确保生产环境坚如磐石

<div class="space-y-4 mt-6">

<div class="flex items-start gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700">
  <div class="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg shrink-0">1</div>
  <div>
    <h4 class="text-white font-semibold text-sm">网络与身份隔离防线 (Zero-Trust Access)</h4>
    <p class="text-xs text-slate-400 mt-1">家里的 Mac mini 从不向路由器开放公网端口映射（Port Forwarding）。全部通信收敛在 UU 远程安全加密通道或 Tailscale 虚拟私网内，外部黑客根本探测不到端口。</p>
  </div>
</div>

<div class="flex items-start gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700">
  <div class="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-lg shrink-0">2</div>
  <div>
    <h4 class="text-white font-semibold text-sm">Git 分支保护与 CI 门禁防线 (Strict Branch Protection)</h4>
    <p class="text-xs text-slate-400 mt-1">仓库主分支 (<code class="text-purple-300">main</code>) 开启保护规则：禁止任何直接 push，只接受 PR 合并。所有 PR 必须强制跑通 TypeScript 静态检查、Linter 格式化规范以及单元测试，绿灯前无法合并。</p>
  </div>
</div>

<div class="flex items-start gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700">
  <div class="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg shrink-0">3</div>
  <div>
    <h4 class="text-white font-semibold text-sm">人类双眼裁决机制 (Human-in-the-Loop Gatekeeper)</h4>
    <p class="text-xs text-slate-400 mt-1">AI Agent 拥有全自动编码、自我测试、开 PR 和留评论的全部自由，<b>但唯一没有 Merge 权限</b>。人类只需在手机 GitHub App 上扫一眼 Diff 和 Reviewer 机器人的报告，保留终极控制权。</p>
  </div>
</div>

</div>

<!--
可能有人会担心：“在手机上搞这么激进的自动化，万一 Agent 发疯把代码搞崩了怎么办？”
答案是：我们建立了一套不可穿透的三层防线。
第一道是网络隔离：家里机器从不对公网开洞；
第二道是 CI/CD 物理隔离：main 分支上了锁，Agent 只能开 feature 分支，单测不过 CI 就会阻断；
第三道是人类裁决门禁：Agent 再聪明，Merge 按钮永远只能由我们在 GitHub App 上亲手去点。
-->

---
layout: default
---

# 踩坑与避坑指南：移动端实操经验谈

血泪经验总结出来的 4 条关键军规

<div class="grid grid-cols-2 gap-6 mt-6">

<div class="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
  <h4 class="text-amber-400 font-bold text-sm mb-2 flex items-center gap-2">
    <span>⚠️</span> 坑 1：手机输入法自动替换代码符号
  </h4>
  <p class="text-xs text-slate-300 leading-relaxed">
    <b>现象：</b> 手机输入法经常会自动把英文半角双引号替换成中文弯引号 <code class="text-amber-300">“ ”</code>，或者把两个减号替换成长破折号 <code class="text-amber-300">—</code>，导致脚本执行报错。<br>
    <b>解法：</b> 尽可能用自然语言描述意图，不要在手机键盘上手敲复杂的 Shell 指令；或者在 iOS 设置中关闭“智能标点”。
  </p>
</div>

<div class="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
  <h4 class="text-amber-400 font-bold text-sm mb-2 flex items-center gap-2">
    <span>⚠️</span> 坑 2：开发服务器未绑定 host 导致手机连不上
  </h4>
  <p class="text-xs text-slate-300 leading-relaxed">
    <b>现象：</b> 在电脑上启动了 <code class="text-amber-300">pnpm dev</code>，但在手机 Safari 里输入内网 IP 却打不开页面。<br>
    <b>解法：</b> 很多前端框架默认只监听 <code class="text-amber-300">localhost (127.0.0.1)</code>，必须显式加上 <code class="text-amber-300">--host 0.0.0.0</code> 才会允许局域网外部设备访问。
  </p>
</div>

<div class="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
  <h4 class="text-amber-400 font-bold text-sm mb-2 flex items-center gap-2">
    <span>⚠️</span> 坑 3：SSH 后台挂起被 iOS 系统冻结
  </h4>
  <p class="text-xs text-slate-300 leading-relaxed">
    <b>现象：</b> 切到微信看消息，再切回 Termius，SSH 管道断开重连，正在跑的任务丢失交互。<br>
    <b>解法：</b> 算力端强依赖 <code class="text-amber-300">tmux</code> 持久化会话，配合 Termius 开启后台保持与自动重连功能。
  </p>
</div>

<div class="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
  <h4 class="text-amber-400 font-bold text-sm mb-2 flex items-center gap-2">
    <span>⚠️</span> 坑 4：任务颗粒度过大导致 Agent 迷航
  </h4>
  <p class="text-xs text-slate-300 leading-relaxed">
    <b>现象：</b> Agent 连续修改 10 几个文件，改东坏西，偏离最初目标。<br>
    <b>解法：</b> 移动端坚持“小步快跑”微敏捷模式，每个需求拆解为 1~2 个明确改动，Agent 完成率几乎 100%。
  </p>
</div>

</div>

<!--
这里有几条实战避坑要点：
1. 标点符号坑：iOS 的智能标点会把半角引号变成全角弯引号。多用语音和自然语言，少手敲命令。
2. 局域网访问坑：调试前端时，一定要确认 dev 脚本带了 --host 0.0.0.0，否则默认绑 127.0.0.1 手机是连不上的。
3. 会话保持：养成在 Mac mini 上使用 tmux 的习惯，不管手机怎么切应用，会话永不中断。
4. 任务颗粒度：移动端 Vibe Coding 的核心是小步快跑，明确小目标，一次改一个明确功能。
-->

---
layout: default
---

# 移动端 Vibe Coding 装备清单

极客极简出行流：一部手机搞定全栈开发

<div class="grid grid-cols-2 gap-8 mt-6">

<div class="space-y-3">
  <h3 class="text-emerald-400 font-bold text-sm">📱 手机端必装软件 (iOS Stack)</h3>
  <div class="space-y-2 text-xs">
    <div class="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 flex justify-between items-center">
      <span><b>Termius</b> - 核心 SSH 终端管理，支持 Snippets 与手势优化</span>
      <span class="text-emerald-400 font-mono">App Store</span>
    </div>
    <div class="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 flex justify-between items-center">
      <span><b>UU 远程 (UU Remote)</b> - 外出主力穿透，内置 SSH + 备用图形桌面</span>
      <span class="text-emerald-400 font-mono">App Store</span>
    </div>
    <div class="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 flex justify-between items-center">
      <span><b>Cursor iOS / Grok</b> - 原生沉浸对话与群聊异步派单</span>
      <span class="text-emerald-400 font-mono">App Store</span>
    </div>
    <div class="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 flex justify-between items-center">
      <span><b>GitHub App / Safari</b> - 掌上 PR 审查合并与内网/线上双轨验证</span>
      <span class="text-emerald-400 font-mono">原生 / App Store</span>
    </div>
  </div>
</div>

<div class="space-y-3">
  <h3 class="text-sky-400 font-bold text-sm">🖥️ 宿主机基建 (Mac mini + 云端)</h3>
  <div class="space-y-2 text-xs">
    <div class="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 flex justify-between items-center">
      <span><b>硬件选型</b> - Mac mini M2/M4（低功耗、免显示器、无额外云成本）</span>
      <span class="text-sky-400 font-mono">静音待机</span>
    </div>
    <div class="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 flex justify-between items-center">
      <span><b>Agent CLI</b> - 终端调用 Grok 4.7 Medium YOLO 自治模式</span>
      <span class="text-sky-400 font-mono">CLI 工具</span>
    </div>
    <div class="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 flex justify-between items-center">
      <span><b>Keychain & Tailscale</b> - 自动化解密脚本与虚拟 Mesh 安全私网</span>
      <span class="text-sky-400 font-mono">安全底座</span>
    </div>
    <div class="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 flex justify-between items-center">
      <span><b>云端资产</b> - 轻量 VPS 云服务器 + 独立域名 + GitHub Actions CI/CD</span>
      <span class="text-sky-400 font-mono">自动上线</span>
    </div>
  </div>
</div>

</div>

<!--
这是完整的极客装备清单：
手机端：Termius 负责日常终端交互；UU 远程负责外出主力穿透与备用图形接管；Cursor 与 Grok 负责自然语言交互；GitHub App 与 Safari 负责审查与双轨验证。
宿主机端：一台闲置的 Mac mini 放家里，搭配自动化脚本与 Agent CLI。
云端：一台轻量服务器和一个域名，配合 GitHub Actions 完成自动发布。
带齐这套装备，出门连电脑包都可以不背了。
-->

---
layout: default
class: text-center
---

# 总结与思考：未来的开发者长什么样？

<div class="mt-8 max-w-2xl mx-auto p-6 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700 shadow-2xl">
  <div class="text-2xl font-bold text-white mb-4">
    “计算留在家里，AI 顶在前面，控制握在掌心。”
  </div>
  <p class="text-sm text-slate-300 leading-relaxed">
    纯手机 Vibe Coding 并不是一种博人眼球的妥协，<br>
    而是软件工程从“体力劳动（打字编码）”向“脑力决策（架构与意图引导）”演进的必然形态。<br>
    无论你身在何处，只要有想法，世界的代码库与生产环境就在你的指尖运转。
  </p>
</div>

<div class="mt-12 flex justify-center gap-6">
  <div class="text-center">
    <div class="text-xs text-slate-400 font-mono mb-1">项目案例开源地址</div>
    <div class="text-sm font-bold text-emerald-400 font-mono">github.com/yuler/k41</div>
  </div>
  <div class="border-r border-slate-700"></div>
  <div class="text-center">
    <div class="text-xs text-slate-400 font-mono mb-1">线上部署效果预览</div>
    <div class="text-sm font-bold text-sky-400 font-mono">k41.yuler.cc</div>
  </div>
</div>

<div class="mt-12 text-slate-500 text-xs">
  Q & A / 欢迎交流与拍砖
</div>

<!--
最后我想用一句话来给今天的分享画个句号：
“计算留在家里，AI 顶在前面，控制握在掌心。”
纯手机 Vibe Coding 让我们从繁琐的机械语法中彻底解放出来，把精力 100% 聚焦在创意、架构和决策上。
哪怕我正走在路上、躺在沙发上，只要手握手机，我就能运筹帷幄。
希望今天的实战经验能对大家有所启发，谢谢大家！
-->

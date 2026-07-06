---
title: '现代 CSS 设计模式笔记'
description: '重读 37signals Campfire CSS 文章的笔记，涵盖 OKLCH 配色、自定义属性模式、:has()、基于 ch 的响应式断点与 any-hover 等实践。'
tags: ["CSS", "OKLCH", "Campfire"]
date: 2026-07-06
---

今天重新阅读一些 basecamp 的这篇文章 [modern-css-patterns-and-techniques-in-campfire](https://dev.37signals.com/modern-css-patterns-and-techniques-in-campfire/)

做个简单的总结，看看是否可以提取一下共用的 css 或者 design.md 方便后续项目直接使用

## oklch

文章提及到使用 [oklch](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/oklch) 来定义颜色

- Lightness(亮度): perceptual lightness ranging from 0%—100%;
- Chroma(色度): the amount of color from pure grey to full saturation, 0–0.5;
- Hue(色相): the color’s angle on the color wheel, 0–360deg.

```css
:root {
  --lch-gray: 96% 0.005 96;
  --lch-gray-dark: 92% 0.005 96;
  --lch-gray-darker: 75% 0.005 96;
  --lch-blue: 54% 0.23 255;
}
```

带来的好处是，更方便人类的阅读和使用，我们可以通过调整 lightness 来改变颜色的深浅，而不改变颜色的色相，这在 RGB 模式很难做到

先定义纯 lch 的颜色值，然后通过定义抽象的自定义属性通过 oklch 方法

```css
--color-border: oklch(var(--lch-gray));
--color-border-dark: oklch(var(--lch-gray-dark));
--color-border-darker: oklch(var(--lch-gray-darker));
```

同时 oklch 可以很方便的添加 alpha 透明度

```css
--color-link-50: oklch(var(--lch-blue) / 0.5);
```

## Custom Properties

**Declared vs. Fallback values**

```css
/* Declared */
.btn {
  --btn-background: var(--color-text-reversed);
  --btn-border-color: var(--color-border);
  --btn-border-radius: 2em;
  --btn-border-size: 1px;
  --btn-color: var(--color-text);
  --btn-padding: 0.5em 1.1em;

  align-items: center;
  background-color: var(--btn-background);
  border-radius: var(--btn-border-radius);
  border: var(--btn-border-size) solid var(--btn-border-color);
  color: var(--btn-color);
  display: inline-flex;
  gap: 0.5em;
  justify-content: center;
  padding: var(--btn-padding);
}

/* Fallback values */
.btn {
  align-items: center;
  background-color: var(--btn-background, var(--color-text-reversed));
  border-radius: var(--btn-border-radius, 2em);
  border: var(--btn-border-size, 1px) solid var(--btn-border-color, var(--color-border));
  color: var(--btn-color, var(--color-text));
  display: inline-flex;
  gap: 0.5em;
  justify-content: center;
  padding: var(--btn-padding, 0.5em 1.1em);
}
```

通过 fallback 模式，这样可以让我们的代码看起来更紧凑的同时也能通过自定义属性暴露出变量

我们该如何决定何时使用自定义属性呢？

1. 每当我们需要在多个地方使用相同的值时（遵循 DRY 原则）
2. 当我们知道某个值将会被更改时

**Variants**

当我们知道自己需要更改某些值来创建元素的变体时，我们可以把自定义属性看作一个 CSS 类的迷你 API。我们可以通过更改自定义属性的值来声明变体，而无需重新定义属性。

```css
/* Variants */

.btn--reversed {
  --btn-background: var(--color-text);
}

.btn--negative {
  --btn-background: var(--color-negative);
}

:is(.btn--reversed, .btn--negative) {
  --btn-color: var(--color-text-reversed);
}

.btn--borderless {
  --btn-border-color: transparent;
}

.btn--success {
  animation: success 1s ease-out;

  img {
    animation: zoom-fade 300ms ease-out;
  }
}
```

## CSS :has()

你可以把 :has() 看作是查询元素内部内容的一种方式。

Example 1

```erb
<%= form.button class: "btn btn--reversed center", type: "submit" do %>
  <%= image_tag "check.svg", aria: { hidden: "true" }, size: 20 %>
  <span class="for-screen-reader">Save changes</span>
<% end %>
```

```css
&:where(:has(.for-screen-reader):has(img)) {
  --btn-border-radius: 50%;
  --btn-padding: 0;

  aspect-ratio: 1;
  block-size: var(--btn-size);
  display: grid;
  inline-size: var(--btn-size);
  place-items: center;

  > * {
    grid-area: 1/1;
  }
}
```

只需将任何内容放入 `.btn` 里，剩下的就交给它处理吧。不再需要像以前一样的 `.btn--circle-icon` 或 `.btn--icon-and-text` 这样的实用类

文章中还列举了一些其他例子，总的来说，以前需要配合服务端或者 js 来做的，现在 CSS 就直接能处理了，而且使用 has 就能直接完成了

## Responsive design

在 Campfire 中，没有基于 viewport 像素判定「移动端」的断点，布局随内容与字体缩放自适应。不是通过 @media 查询 viewport 宽度小于多少就断言它是移动端设备，它只有一个断点：

```css
/* narrower than 100 characters */
@media (max-width: 100ch) {
  ...
}
```

在 CSS 中，ch 是一个相对单位，1ch 等于当前字体中数字“0”的宽度。因此，100ch 粗略地可以理解为“100 个字符的宽度”。

这种方式替换了传统的 `min-width: 768px` 这样的断点，不仅架构简单，而且更符合基于内容排版的思想

## any-hover

文章还提到 any-hover 来检测是否支持 hover 属性，举了一个 iPad 的例子，如果 iPad 连接上 Magic Keyboard 的话就会匹配 hover 相关样式

```css
@media (any-hover: hover) {
  &:where(:not(:active):hover) {
    /* hover effect */
  }
}

@media (any-hover: hover) and (pointer: fine) { /* hover 才显示 */ }
@media (any-hover: none) and (pointer: coarse) { /* 常显 */ }
```

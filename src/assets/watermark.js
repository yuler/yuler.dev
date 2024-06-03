export function watermark({ width = 100, height = 100, content, debug = false }) {
  // 通过 canvas 绘制水印内容
  const createWaterMark = content => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.rotate(-10 * Math.PI / 180)
    ctx.font = 'bold 24px serif'
    ctx.fillStyle = debug ? 'rgba(255,0,0,1)' : 'rgba(255,0,0,0.005)'
    const lines = content.split(',')
    for (const line of lines) {
      ctx.fillText(line, 0, 50)
      ctx.translate(0, 30)
    }
    return canvas.toDataURL()
  }

  // 创建一个 `div#watermark` 元素并添加到 `body` 上
  let watermarkDiv = document.querySelector('#watermark')
  if (!watermarkDiv) watermarkDiv = document.createElement('div')
  const base64Url = `url(${createWaterMark(content)})`
  watermarkDiv.setAttribute('id', 'watermark')
  watermarkDiv.setAttribute('style', `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9999999999;
    pointer-events: none;
    background-repeat: repeat;
    background-image: ${base64Url};
  `)
  document.body.appendChild(watermarkDiv)
}

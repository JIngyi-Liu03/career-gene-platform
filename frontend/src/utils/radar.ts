// 雷达图（SVG）绘制：纯展示，只读 rate 画多边形。由原 utils/score.ts 的 drawRadar 迁出。
import type { RadarAxis } from '@/types/quiz'

function hexA(hex: string, al: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${al})`
}

export function drawRadar(containerId: string, axes: RadarAxis[], color: string): void {
  const NS = 'http://www.w3.org/2000/svg'
  const size = 560, cx = size / 2, cy = size / 2 + 10, R = 178
  const n = axes.length
  const axisMax = Math.max(...axes.map((a) => a.rate), 1)
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
  svg.setAttribute('width', '100%')
  svg.style.maxWidth = '520px'
  svg.style.display = 'block'
  svg.style.margin = '0 auto'
  const angle = (i: number) => -Math.PI / 2 + i * (2 * Math.PI / n)
  const levels = 2
  for (let l = 1; l <= levels; l++) {
    const r = (R * l) / levels
    let p: string[] = []
    for (let i = 0; i < n; i++) {
      const a = angle(i)
      p.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
    }
    const poly = document.createElementNS(NS, 'polygon')
    poly.setAttribute('points', p.join(' '))
    poly.setAttribute('fill', 'none')
    poly.setAttribute('stroke', '#e6ebf3')
    poly.setAttribute('stroke-width', '1')
    svg.appendChild(poly)
  }
  axes.forEach((ax, i) => {
    const a = angle(i)
    const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a)
    const line = document.createElementNS(NS, 'line')
    line.setAttribute('x1', String(cx)); line.setAttribute('y1', String(cy))
    line.setAttribute('x2', String(x)); line.setAttribute('y2', String(y))
    line.setAttribute('stroke', '#e6ebf3'); line.setAttribute('stroke-width', '1')
    svg.appendChild(line)
    const lx = cx + (R + 32) * Math.cos(a), ly = cy + (R + 32) * Math.sin(a)
    const t = document.createElementNS(NS, 'text')
    t.setAttribute('x', String(lx)); t.setAttribute('y', String(ly))
    t.setAttribute('text-anchor', 'middle')
    t.setAttribute('dominant-baseline', 'middle')
    t.setAttribute('font-size', '16')
    t.setAttribute('font-weight', '700')
    t.setAttribute('fill', '#1f2a44')
    t.textContent = `${ax.label} ${ax.rate}%`
    svg.appendChild(t)
  })
  let dp: string[] = []
  axes.forEach((ax, i) => {
    const a = angle(i)
    const r = R * (ax.rate / axisMax)
    dp.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  })
  const dpoly = document.createElementNS(NS, 'polygon')
  dpoly.setAttribute('points', dp.join(' '))
  dpoly.setAttribute('fill', hexA(color, 0.22))
  dpoly.setAttribute('stroke', color)
  dpoly.setAttribute('stroke-width', '2')
  svg.appendChild(dpoly)
  axes.forEach((ax, i) => {
    const a = angle(i)
    const r = R * (ax.rate / axisMax)
    const c = document.createElementNS(NS, 'circle')
    c.setAttribute('cx', (cx + r * Math.cos(a)).toFixed(1))
    c.setAttribute('cy', (cy + r * Math.sin(a)).toFixed(1))
    c.setAttribute('r', '3')
    c.setAttribute('fill', color)
    svg.appendChild(c)
  })
  const box = document.getElementById(containerId)
  if (box) {
    box.innerHTML = ''
    box.appendChild(svg)
  }
}

// 文本清洗：与原前端 cleanText / cleanOpt 一致。
// 题库内部文本含「第X部分 / 数字编号 / A.B.C.D. 前缀」，对外展示时去除。

export function cleanText(s: string): string {
  if (!s) return ''
  return String(s)
    .replace(/^第[一二三四五六七八九十百零]+部分[:：]?\s*/, '')
    .replace(/^\d+[、.．\s]*/, '')
    .replace(/^\d+(?=[一-龥])/, '')
}

export function cleanOpt(s: string): string {
  return String(s).replace(/^(A\.|B\.|C\.|D\.|\(A\)|\(B\)|\(C\)|\(D\))\s*/, '')
}

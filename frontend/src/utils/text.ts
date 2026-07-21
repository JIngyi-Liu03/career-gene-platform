// 文本清洗：由原 index.html 原样搬运（cleanText / cleanOpt）。
// 去掉题目/选项中的序号前缀，供页面与记录展示使用。

// 去掉「第X部分」「数字编号」等前缀
export function cleanText(s: string): string {
  if (!s) return ''
  return String(s)
    .replace(/^第[一二三四五六七八九十百零]+部分[:：]?\s*/, '')
    .replace(/^\d+[、.．\s]*/, '')
    .replace(/^\d+(?=[一-龥])/, '')
}

// 去掉 A./B./C./D./(A) 等选项前缀
export function cleanOpt(s: string): string {
  return String(s).replace(/^(A\.|B\.|C\.|D\.|\(A\)|\(B\)|\(C\)|\(D\))\s*/, '')
}

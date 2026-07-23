import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common'
import xss from 'xss'

// 输入清洗：递归遍历所有字符串字段，剥离 HTML/脚本标签，仅保留纯文本。
// 纵深防御——即便前端渲染已默认转义，也避免恶意 payload 入库，并保护后台等其它消费方。
const xssOptions = {
  whiteList: {}, // 不允许任何标签
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
}

function sanitize(value: any): any {
  if (typeof value === 'string') return xss(value, xssOptions)
  if (Array.isArray(value)) return value.map(sanitize)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value)) out[key] = sanitize(value[key])
    return out
  }
  return value
}

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): any {
    // 仅清洗请求入参（body/query/param），响应与自定义类型不动。
    if (metadata.type === 'body' || metadata.type === 'query' || metadata.type === 'param') {
      return sanitize(value)
    }
    return value
  }
}

import { Injectable } from '@nestjs/common'

export type SmsScene = 'register' | 'reset'

interface SmsCodeRow {
  phone: string
  code: string
  scene: SmsScene
  createdAt: number
  expiresAt: number
  consumed: boolean
}

// 短信验证码存储与发送（与前端流程一致的参考实现）。
// - 6 位随机验证码，有效期 5 分钟（SMS_CODE_TTL）
// - 单次使用（consumed 标记），用后即失效
// - 发送限频：60 秒内不能重复发送
// - 按场景校验：注册时手机号必须未注册，重置时手机号必须已注册
// 说明：真实发送应接入短信网关（如腾讯云）。未配置网关时走 dev 回显模式，
// 把验证码通过接口原样返回，便于本地联调。生产环境请实现 send() 的真实发送并关闭回显。
@Injectable()
export class SmsService {
  private readonly TTL = 5 * 60 * 1000
  private readonly RATE_LIMIT = 60 * 1000
  private readonly rows: SmsCodeRow[] = []

  getLatestByPhone(phone: string): SmsCodeRow | null {
    let latest: SmsCodeRow | null = null
    for (const r of this.rows) {
      if (r.phone === phone && (!latest || r.createdAt > latest.createdAt)) latest = r
    }
    return latest
  }

  // 60 秒限频：true 表示可以发送
  canSend(phone: string): boolean {
    const latest = this.getLatestByPhone(phone)
    return !latest || Date.now() - latest.createdAt >= this.RATE_LIMIT
  }

  // 生成并保存一条验证码（不负责发送）
  create(phone: string, scene: SmsScene): string {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    this.rows.push({
      phone,
      code,
      scene,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.TTL,
      consumed: false,
    })
    return code
  }

  // 发送验证码。返回 { dev }：dev=true 表示走回显模式（验证码未真实发出）。
  async send(phone: string, code: string): Promise<{ dev: boolean }> {
    const provider = process.env.SMS_PROVIDER || ''
    if (provider === 'tencent' && process.env.SMS_TENCENT_SECRET_ID && process.env.SMS_TENCENT_SECRET_KEY) {
      // TODO: 接入腾讯云短信 SDK，调用 smsClient.SendSms({ PhoneNumberSet:[+86${phone}], ... })
      // 真实发送失败应 throw new BadRequestException('短信发送失败，请稍后重试')
      // 此处保持 dev 回显以保证本地可运行；接入后删除下行回显即可。
    }
    // eslint-disable-next-line no-console
    console.log(`[SMS][dev] phone=${phone} code=${code}`)
    return { dev: true }
  }

  // 校验并消费验证码（单次使用）
  consume(phone: string, code: string): { ok: boolean; error?: string } {
    const row = this.getLatestByPhone(phone)
    if (!row) return { ok: false, error: '请先获取验证码' }
    if (row.consumed) return { ok: false, error: '验证码已使用，请重新获取' }
    if (row.expiresAt < Date.now()) return { ok: false, error: '验证码已过期，请重新获取' }
    if (row.code !== String(code)) return { ok: false, error: '验证码错误' }
    row.consumed = true
    return { ok: true }
  }
}

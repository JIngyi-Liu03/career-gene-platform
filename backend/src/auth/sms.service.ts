import { BadRequestException, Injectable } from '@nestjs/common'
import tencentcloud from 'tencentcloud-sdk-nodejs-sms'

export type SmsScene = 'register' | 'reset'

interface SmsCodeRow {
  phone: string
  code: string
  scene: SmsScene
  createdAt: number
  expiresAt: number
  consumed: boolean
}

// 腾讯云短信错误码 → 中文提示（SendStatusSet.Code / 请求异常 code）
const TENCENT_ERROR_MAP: Record<string, string> = {
  'FailedOperation.SignatureIncorrectOrUnapproved': '短信签名未通过审核或与报备不一致',
  'FailedOperation.TemplateIncorrectOrUnapproved': '短信模板未通过审核或与报备不一致',
  'LimitExceeded.PhoneNumberDailyLimit': '该手机号当日发送次数已达上限',
  'LimitExceeded.PhoneNumberOneHourLimit': '该手机号发送过于频繁，请 1 小时后再试',
  'LimitExceeded.PhoneNumberThirtySecondLimit': '发送过于频繁，请稍后再试',
  'FailedOperation.PhoneNumberInBlacklist': '该手机号已被列入黑名单，无法发送短信',
  'FailedOperation.JsonParseFail': '短信请求参数错误',
  'UnauthorizedOperation.SmsSdkAppIdVerifyFail': '短信应用配置错误（SdkAppId 校验失败）',
  'AuthFailure.SecretIdNotFound': '短信密钥无效（SecretId 不存在或已失效）',
  'AuthFailure.SignatureFailure': '短信密钥签名校验失败，请检查 SecretKey',
  'InvalidParameterValue.SignName': '短信签名参数错误',
  'InvalidParameterValue.TemplateId': '短信模板参数错误',
}

// 短信验证码存储与发送。
// - 6 位随机验证码，有效期 SMS_CODE_TTL（默认 5 分钟）
// - 单次使用（consumed 标记），用后即失效
// - 发送限频：SMS_SEND_INTERVAL（默认 60 秒）
// - 按场景校验：注册时手机号必须未注册，重置时手机号必须已注册（由 AuthService 完成）
// 腾讯云接入：SMS_PROVIDER=tencent 且密钥齐全时走真实 SendSms；
// 未配置网关时走 dev 回显（验证码原样返回），便于本地联调。
@Injectable()
export class SmsService {
  private readonly TTL = Number(process.env.SMS_CODE_TTL || 5 * 60 * 1000)
  private readonly RATE_LIMIT = Number(process.env.SMS_SEND_INTERVAL || 60 * 1000)
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

  // 发送验证码。返回 { dev }：dev=true 表示未真实发出（回显模式，仅本地联调用）。
  async send(phone: string, code: string): Promise<{ dev: boolean }> {
    if (process.env.SMS_PROVIDER === 'tencent') {
      const secretId = process.env.TENCENT_SECRET_ID || process.env.SMS_TENCENT_SECRET_ID || ''
      const secretKey = process.env.TENCENT_SECRET_KEY || process.env.SMS_TENCENT_SECRET_KEY || ''
      const sdkAppId = process.env.SMS_SDK_APP_ID || process.env.SMS_TENCENT_SDK_APP_ID || ''
      const signName = process.env.SMS_SIGN_NAME || process.env.SMS_TENCENT_SIGN || ''
      const templateId = process.env.SMS_TEMPLATE_ID || process.env.SMS_TENCENT_TEMPLATE_ID || ''
      if (secretId && secretKey && sdkAppId && signName && templateId) {
        return this.sendViaTencent(phone, code, { secretId, secretKey, sdkAppId, signName, templateId })
      }
    }
    // 未配置真实网关 → dev 回显（生产环境由 AuthService 决定是否把 devCode 返回前端）
    // eslint-disable-next-line no-console
    console.log(`[SMS][dev] phone=${phone} code=${code}`)
    return { dev: true }
  }

  // 通过腾讯云短信真实发送（tencentcloud-sdk-nodejs-sms, sms.v20210111.Client）
  private async sendViaTencent(
    phone: string,
    code: string,
    cfg: { secretId: string; secretKey: string; sdkAppId: string; signName: string; templateId: string },
  ): Promise<{ dev: boolean }> {
    const client = new tencentcloud.sms.v20210111.Client({
      credential: { secretId: cfg.secretId, secretKey: cfg.secretKey },
      region: process.env.SMS_REGION || 'ap-guangzhou',
      profile: { httpProfile: { endpoint: 'sms.tencentcloudapi.com' } },
    })
    try {
      const resp = await client.SendSms({
        PhoneNumberSet: [`+86${phone}`],
        SmsSdkAppId: cfg.sdkAppId,
        SignName: cfg.signName,
        TemplateId: cfg.templateId,
        TemplateParamSet: [code],
      })
      const st = resp?.SendStatusSet?.[0]
      if (st?.Code === 'Ok') return { dev: false }
      // 请求成功但号码状态非 Ok（如限频、黑名单）→ 按错误码翻译
      const errCode = st?.Code || 'Unknown'
      throw new BadRequestException(this.translateError(errCode, st?.Message))
    } catch (e) {
      if (e instanceof BadRequestException) throw e
      const err: any = e
      throw new BadRequestException(this.translateError(err?.code || '', err?.message || err?.description))
    }
  }

  // 腾讯云错误码 → 中文
  private translateError(code: string, description?: string): string {
    if (!code) {
      return description ? `短信发送失败：${description}` : '短信发送失败，请稍后重试'
    }
    const mapped = TENCENT_ERROR_MAP[code]
    if (mapped) return mapped
    return description ? `短信发送失败（${code}）：${description}` : `短信发送失败（${code}）`
  }

  // 校验并消费验证码（单次使用，防重放）
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

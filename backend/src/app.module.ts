import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { QuizModule } from './quiz/quiz.module'
import { ReportModule } from './report/report.module'
import { HealthModule } from './health/health.module'
import { AdminModule } from './admin/admin.module'
import { AnalyticsModule } from './analytics/analytics.module'

// 启动期配置校验：生产环境强制要求密钥与数据库连接串，且禁止 dev 占位密钥，
// 缺失即崩溃退出，避免“静默用 dev 密钥上线”的安全隐患。
function validateEnv(config: Record<string, unknown>) {
  const isProd = config['NODE_ENV'] === 'production' || process.env.NODE_ENV === 'production'
  if (!isProd) return config

  const required = ['DATABASE_URL', 'ACCESS_JWT_SECRET', 'REFRESH_JWT_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD']
  const missing = required.filter((k) => !config[k] || String(config[k]).trim() === '')
  if (missing.length) {
    throw new Error(`[config] 生产环境缺少必要环境变量: ${missing.join(', ')}`)
  }

  const devPlaceholders = ['dev-access-secret-change-me', 'dev-refresh-secret-change-me']
  const usingDev = devPlaceholders.some(
    (p) => String(config['ACCESS_JWT_SECRET']) === p || String(config['REFRESH_JWT_SECRET']) === p,
  )
  if (usingDev) {
    throw new Error('[config] 生产环境禁止使用 dev 占位 JWT 密钥，请通过环境变量注入真实密钥')
  }

  return config
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // 全局限流：默认每 IP 每分钟 100 请求；认证接口在 controller 层单独收紧。
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 100, name: 'global' }] }),
    PrismaModule,
    AuthModule,
    QuizModule,
    ReportModule,
    HealthModule,
    AdminModule,
    AnalyticsModule,
  ],
  providers: [
    // 全局限流守卫（基于 IP），与 controller 上的 JwtAuthGuard 互不冲突。
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

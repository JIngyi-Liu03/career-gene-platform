import { Controller, Post, Body } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { dayKey } from '../common/util'

// 站点访问上报：前端挂载时调用一次（可按 localStorage 每日节流），写入 Visit。免鉴权。
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('visit')
  async visit(@Body() body: { userId?: number }): Promise<{ ok: true }> {
    const day = dayKey(new Date())
    await this.prisma.visit.create({
      data: { day, userId: typeof body?.userId === 'number' ? body.userId : null },
    })
    return { ok: true }
  }
}

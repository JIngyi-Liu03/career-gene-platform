import { Controller, Get, Res } from '@nestjs/common'
import { Response } from 'express'
import { PrismaService } from '../prisma/prisma.service'

// 存活/就绪探针：做一次真实 DB 探活，DB 不可用时返回 503，便于 K8s/容器编排准确摘流。
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    let db = false
    try {
      await this.prisma.$queryRaw`SELECT 1`
      db = true
    } catch {
      db = false
    }
    res.status(db ? 200 : 503)
    return { status: db ? 'ok' : 'degraded', db }
  }
}

import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common'
import { Response } from 'express'
import { ReportService } from './report.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { GetUser } from '../auth/get-user.decorator'

// GET /report?inline=1  → 返回当前登录用户的 PDF 报告（token 识别身份）。
@Controller('report')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly service: ReportService) {}

  @Get()
  async report(
    @GetUser() user: { userId: number; phone: string },
    @Query('inline') inline: string,
    @Res() res: Response,
  ) {
    try {
      const pdfBytes = await this.service.generate(user.userId)
      const buf = Buffer.from(pdfBytes)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Length', buf.length)
      const disposition = inline === '1' ? 'inline' : 'attachment'
      res.setHeader('Content-Disposition', `${disposition}; filename="career-report-${user.phone}.pdf"`)
      res.status(200).end(buf)
    } catch (e: any) {
      res.status(e?.status || 500).json({ error: e?.message || 'report generation failed' })
    }
  }
}

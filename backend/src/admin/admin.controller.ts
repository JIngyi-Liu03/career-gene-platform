import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { AdminService } from './admin.service'
import { AdminJwtGuard } from './admin.guard'
import type { AdminLoginDto, UpdatePartBody } from './dto'

interface AdminReq extends Request {
  admin?: { adminId: number; username: string }
}

@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  // 公开：管理员登录（带防爆破限流）。
  @Post('login')
  login(@Body() dto: AdminLoginDto, @Req() req: AdminReq) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.ip
      || 'unknown'
    return this.service.login(dto, ip)
  }

  // 以下接口均需管理员 JWT。
  @UseGuards(AdminJwtGuard)
  @Get('quiz')
  getBank() {
    return this.service.getBank()
  }

  @UseGuards(AdminJwtGuard)
  @Put('quiz/part/:i')
  updatePart(
    @Param('i') i: string,
    @Body() body: UpdatePartBody,
    @Req() req: AdminReq,
  ) {
    if (!req.admin) throw new UnauthorizedException()
    return this.service.updatePart(parseInt(i, 10), body, req.admin.username)
  }

  @UseGuards(AdminJwtGuard)
  @Get('versions')
  getVersions() {
    return this.service.getVersions()
  }

  @UseGuards(AdminJwtGuard)
  @Post('quiz/rollback/:version')
  rollback(@Param('version') version: string, @Req() req: AdminReq) {
    if (!req.admin) throw new UnauthorizedException()
    return this.service.rollback(parseInt(version, 10), req.admin.username)
  }

  @UseGuards(AdminJwtGuard)
  @Get('stats')
  getStats() {
    return this.service.getStats()
  }

  @UseGuards(AdminJwtGuard)
  @Get('users')
  getUsers() {
    return this.service.getUsers()
  }

  @UseGuards(AdminJwtGuard)
  @Get('visits')
  getVisits(@Query('days') days: string) {
    return this.service.getVisits(parseInt(days, 10))
  }

  // 查看已完成用户的测试结果
  @UseGuards(AdminJwtGuard)
  @Get('users/:id/result')
  getUserResult(@Param('id') id: string) {
    return this.service.getUserResult(parseInt(id, 10))
  }

  // 导出用户数据（Excel / Word）：生成后返回限时下载直链（下载走 nginx 静态，无需 JWT）
  //   userIds：勾选用户导出报告（含结果）；不传则导出全部（不含结果）
  @UseGuards(AdminJwtGuard)
  @Get('export')
  async exportUsers(
    @Query('format') format: string,
    @Query('includeResults') includeResults: string,
    @Query('userIds') userIds?: string,
  ): Promise<{ downloadUrl: string; uuid: string }> {
    const fmt = format === 'word' ? 'word' : 'excel'
    const inc = includeResults === 'true'
    const ids = userIds
      ? userIds.split(',').map((s) => parseInt(s, 10)).filter((n) => !Number.isNaN(n))
      : undefined
    const { downloadUrl, uuid } = await this.service.exportUsersToFile({ includeResults: inc, format: fmt, userIds: ids })
    // 兜底：5 分钟后删除文件，避免遗留
    setTimeout(() => {
      void this.service.deleteExport(uuid)
    }, 5 * 60 * 1000)
    return { downloadUrl, uuid }
  }

  // 前端下载完成后即时清理（受 JWT 保护）
  @UseGuards(AdminJwtGuard)
  @Delete('export/:uuid')
  async deleteExport(@Param('uuid') uuid: string): Promise<{ ok: true }> {
    await this.service.deleteExport(uuid)
    return { ok: true }
  }

  // 本地开发回退：不走 nginx 静态（如本地 serve-admin.cjs 反代）时，由后端直接吐文件。
  // 生产环境该路径由 nginx location /exports/ 接管，此路由不会被命中。
  @Get('exports/:file')
  async serveExport(@Param('file') file: string, @Res() res: Response) {
    const fp = this.service.resolveExportFile(file)
    if (!fp) {
      res.status(400).end('bad filename')
      return
    }
    res.setHeader('Content-Disposition', 'attachment')
    res.sendFile(fp)
  }
}

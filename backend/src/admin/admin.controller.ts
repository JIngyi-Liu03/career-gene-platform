import {
  Controller,
  Post,
  Get,
  Put,
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

  // 导出用户数据（Excel / Word）
  @UseGuards(AdminJwtGuard)
  @Get('export')
  async exportUsers(
    @Query('format') format: string,
    @Query('includeResults') includeResults: string,
    @Res() res: Response,
  ) {
    const fmt = format === 'word' ? 'word' : 'excel'
    const inc = includeResults === 'true'
    const { buffer, filename, contentType } = await this.service.exportUsers(inc, fmt)
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
    res.send(buffer)
  }
}

import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { Request, Response } from 'express'

// 统一异常响应结构：{ code, message, timestamp, path }
// 同时拦截 Prisma 已知错误，避免向客户端泄露 SQL 等技术细节（只进日志）。
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<Response>()
    const req = ctx.getRequest<Request>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = '服务器内部错误'
    let code = 'INTERNAL_ERROR'

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const body = exception.getResponse()
      if (typeof body === 'string') {
        message = body
      } else if (body && typeof body === 'object') {
        const r = body as Record<string, unknown>
        if (Array.isArray(r.message)) {
          message = (r.message as unknown[]).join('; ')
          code = 'VALIDATION_ERROR'
        } else if (typeof r.message === 'string') {
          message = r.message
        } else {
          message = exception.message
        }
        if (typeof r.error === 'string') code = r.error
      } else {
        message = exception.message
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST
      message = '数据约束冲突，请检查输入'
      code = 'DB_CONSTRAINT'
      this.logger.warn(`Prisma known error P${exception.code} on ${req.method} ${req.url}`)
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST
      message = '数据校验失败'
      code = 'DB_VALIDATION'
    } else {
      // 未知错误：避免向客户端泄露技术细节，仅记录服务端日志
      this.logger.error(
        `Unhandled error on ${req.method} ${req.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      )
    }

    res.status(status).json({
      code,
      message,
      timestamp: new Date().toISOString(),
      path: req.url,
    })
  }
}

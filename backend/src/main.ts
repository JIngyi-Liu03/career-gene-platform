import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // 同源（nginx 同端口反代）下其实不需要 CORS，但保留以兼容直接跨域调试。
  app.enableCors()

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, disableErrorMessages: false }),
  )

  // 统一异常响应结构：{ code, message, timestamp, path }
  app.useGlobalFilters(new HttpExceptionFilter())

  const port = Number(process.env.PORT) || 3000
  await app.listen(port, '0.0.0.0')
  // eslint-disable-next-line no-console
  console.log(`[career-gene-backend] listening on :${port}`)
}

bootstrap()

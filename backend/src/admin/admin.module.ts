import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { PrismaModule } from '../prisma/prisma.module'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { AdminJwtGuard } from './admin.guard'
import { ACCESS_TTL, DEV_ACCESS_SECRET } from '../auth/jwt.constants'

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('ACCESS_JWT_SECRET') ?? DEV_ACCESS_SECRET,
        signOptions: { expiresIn: ACCESS_TTL },
      }),
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminJwtGuard],
  exports: [AdminJwtGuard],
})
export class AdminModule {}

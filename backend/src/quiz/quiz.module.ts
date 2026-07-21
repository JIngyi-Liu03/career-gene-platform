import { Module } from '@nestjs/common'
import { QuizService } from './quiz.service'
import { QuizController } from './quiz.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}

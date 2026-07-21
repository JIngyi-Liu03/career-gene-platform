import { Controller, Get, Post, Param, Body, UseGuards, Query } from '@nestjs/common'
import { QuizService } from './quiz.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { GetUser } from '../auth/get-user.decorator'

interface AuthUser {
  userId: number
  phone: string
}

@Controller('quiz')
@UseGuards(JwtAuthGuard)
export class QuizController {
  constructor(private readonly service: QuizService) {}

  @Get('meta')
  meta() {
    return this.service.meta()
  }

  @Get('part/:i')
  part(@Param('i') i: string) {
    return this.service.getPart(parseInt(i, 10))
  }

  @Post('part/:i')
  submitPart(@GetUser() user: AuthUser, @Param('i') i: string, @Body() body: { answers: number[] }) {
    return this.service.submitPart(user.userId, parseInt(i, 10), body?.answers || [])
  }

  @Get('progress')
  progress(@GetUser() user: AuthUser) {
    return this.service.progress(user.userId)
  }

  @Post('submit')
  submitAll(@GetUser() user: AuthUser, @Body() body: { answers: number[] }) {
    return this.service.submitAll(user.userId, body?.answers || [])
  }

  @Get('result')
  result(@GetUser() user: AuthUser) {
    return this.service.getResult(user.userId)
  }
}

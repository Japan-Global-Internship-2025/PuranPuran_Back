import { Controller, Get, Patch, UseGuards, Post } from '@nestjs/common';
import { JapaneseService } from './japanese.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('일본어 학습(日本語学習) API')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/japanese')
export class JapaneseController {
  constructor(private readonly japaneseService: JapaneseService) {}

  @ApiOperation({ summary: '오늘의 일본어 표현 조회 (자동 업데이트)' })
  @Get('daily')
  getDailyExpression(@GetUser() user: any) {
    return this.japaneseService.getDailyExpression(user.id);
  }

  @ApiOperation({ summary: '일본어 표현 새로고침' })
  @Patch('refresh')
  refreshExpression(@GetUser() user: any) {
    return this.japaneseService.refreshExpression(user.id);
  }

  @ApiOperation({ summary: '초기 데이터 시딩 (관리자용 혹은 초기 구축용)' })
  @Post('seed')
  seedData() {
    return this.japaneseService.seedInitialData();
  }
}

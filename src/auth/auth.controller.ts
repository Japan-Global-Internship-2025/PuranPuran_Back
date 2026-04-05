import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GetUser } from './get-user.decorator';

@ApiTags('유저 인증(ユーザー認証) API')
@ApiBearerAuth()
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: '사용자 생성' })
  @Post('signup')
  create(@Body() createUserDto: CreateUserDto) {
    return this.authService.create(createUserDto);
  }

  @ApiOperation({ summary: '사용자 정보 조회' })
  @UseGuards(AuthGuard('jwt'))
  @Get('user')
  findOne(@GetUser() user: any) {
    return this.authService.findOne(user.id);
  }

  @ApiOperation({ summary: '사용자 정보 수정' })
  @UseGuards(AuthGuard('jwt'))
  @Patch('user')
  update(@GetUser() user: any, @Body() updateUserDto: UpdateUserDto) {
    return this.authService.update(user.id, updateUserDto);
  }

  @ApiOperation({ summary: '사용자 삭제' })
  @UseGuards(AuthGuard('jwt'))
  @Delete('user')
  remove(@GetUser() user: any) {
    return this.authService.remove(user.id);
  }

  @ApiOperation({ summary: '사용자 로그인' })
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GetUser } from './get-user.decorator';

@ApiTags('유저 인증 API')
@ApiBearerAuth()
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  create(@Body() createUserDto: CreateUserDto) {
    return this.authService.create(createUserDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('user')
  findOne(@GetUser() user: any) {
    return this.authService.findOne(user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('user')
  update(@GetUser() user: any, @Body() updateUserDto: UpdateUserDto) {
    return this.authService.update(user.id, updateUserDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('user')
  remove(@GetUser() user: any) {
    return this.authService.remove(user.id);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}

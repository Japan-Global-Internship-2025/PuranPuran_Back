import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}
  
  async create(createUserDto: CreateUserDto) {
    console.log('Received CreateUserDto:', createUserDto);
    const { user_pw, ...userData } = createUserDto;
    const hashedPassword = await bcrypt.hash(user_pw, 12);
    const user = this.userRepository.create({ ...userData, user_pw: hashedPassword });
    return this.userRepository.save(user);
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('해당 유저를 찾을 수 없습니다.');
    }
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    return this.userRepository.update(id, updateUserDto);
  }

  async remove(id: number) {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('해당 유저를 찾을 수 없습니다.');
    }
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({ where: { user_id: loginDto.user_id }, select: ['id', 'user_pw'] });
    const isMatch = user && await bcrypt.compare(loginDto.user_pw, user.user_pw);

    if (!user || !isMatch) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 다릅니다.');
    }

    const payload = { id: user.id, user_id: user.user_id };

    return {
      access_token: this.jwtService.sign(payload),
    }
  }
}

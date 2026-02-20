import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class CreateUserDto {
    @ApiProperty({ example: 'minjae123', description: '사용자 아이디' })
    @IsString()
    @MinLength(6, { message: '아이디는 최소 6자 이상이여야 합니다.' })
    user_id: string;

    @ApiProperty({ example: 'password123', description: '사용자 비밀번호' })
    @IsString()
    @MinLength(8, { message: '비밀번호는 최소 8자 이상이여야 합니다.' })
    user_pw: string;

    @ApiProperty({ example: 's2400@gmail.com', description: '사용자 이메일' })
    @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
    user_email: string;

    @ApiProperty({ example: '[1, 5, 7]', description: '사용자 취향' })
    @IsString()
    taste: string;
}

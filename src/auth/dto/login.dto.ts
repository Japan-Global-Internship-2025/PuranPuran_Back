import { IsString, MinLength } from "class-validator";

export class LoginDto {
    @IsString()
    user_id: string;

    @IsString()
    user_pw: string;
}
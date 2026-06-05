import { IsString, IsOptional, IsDateString, Matches } from 'class-validator';

export class CreatePlannerDto {

    @IsDateString()
    plan_date!: string; // 선택한 날짜 (예: "2026-10-15")

    @IsString()
    @IsOptional()
    place?: string; // 해당 날짜에 가면 좋을 장소나 지역

    @IsString()
    @IsOptional()
    category?: string; // 일정 카테고리

    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'HH:mm 형식이어야 합니다' })
    start_time!: string; // "10:00"

    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'HH:mm 형식이어야 합니다' })
    end_time!: string; // "20:00"

    @IsString()
    @IsOptional()
    ai_request?: string; // "번화가에 가서 쇼핑도 하고 밥도 먹을래"

}

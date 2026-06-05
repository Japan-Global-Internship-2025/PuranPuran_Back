import { IsArray, IsDateString, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TotalPlanItemDto {
  @IsString()
  place: string; // 해당 날짜에 가면 좋을 장소나 지역 (예: 나고야역 주변)

  @IsString()
  category: string; // 카테고리(예: 관광·역주변, 쇼핑·번화가, 음식·맛집 등)

  @IsDateString()
  plan_date: string;

  @IsString()
  daily_description: string;
}

export class SaveTotalPlanDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TotalPlanItemDto)
  dailyPlans: TotalPlanItemDto[];
}

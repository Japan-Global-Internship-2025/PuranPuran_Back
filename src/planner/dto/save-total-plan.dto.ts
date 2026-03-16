import { IsArray, IsDateString, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TotalPlanItemDto {
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

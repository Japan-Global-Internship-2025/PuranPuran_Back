import { IsArray, IsDateString, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TotalPlanItemDto {
  @IsString()
  place: string;

  @IsString()
  category: string;

  @IsDateString()
  plan_date: string;

  @IsString()
  daily_description: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class SaveTotalPlanDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TotalPlanItemDto)
  dailyPlans: TotalPlanItemDto[];
}

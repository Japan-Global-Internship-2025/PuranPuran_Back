import { IsString, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class PlannerItemDto {
  @IsString() visit_time: string;
  @IsString() place_name: string;
  @IsString() category: string;
  @IsString() description: string;
  @IsNumber() latitude: number;
  @IsNumber() longitude: number;
  @IsString() image_url: string;
}

export class SavePlannerDto {
  @IsString() plan_date: string;
  @IsString() start_time: string;
  @IsString() end_time: string;
  @IsString() ai_request: string;

  // AI가 생성했던 아이템 배열을 그대로 받아옵니다.
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlannerItemDto)
  items: PlannerItemDto[];
}
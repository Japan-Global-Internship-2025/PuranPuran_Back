import { IsNumber, IsString, IsOptional, IsArray } from "class-validator"

export class CreateTravelDto {

    @IsString()
    travel_name: string

    @IsString()
    travel_region: string

    @IsString()
    travel_start_date: Date

    @IsString()
    travel_end_date: Date

    @IsNumber()
    travel_budget: number

    @IsOptional()
    @IsString()
    lodging_info?: string

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    places?: string[]
}
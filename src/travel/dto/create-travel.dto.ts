import { IsNumber, IsString, IsOptional, IsArray, IsNotEmpty } from "class-validator"

export class CreateTravelDto {

    @IsString()
    @IsNotEmpty()
    travel_name!: string

    @IsString()
    @IsNotEmpty()
    travel_region!: string

    @IsString()
    @IsNotEmpty()
    travel_start_date!: Date

    @IsString()
    @IsNotEmpty()
    travel_end_date!: Date

    @IsNumber()
    @IsNotEmpty()
    travel_budget!: number

    @IsArray()
    @IsOptional()
    walk_distance!: string[]

    @IsArray()
    @IsOptional()
    transportation!: string[]

    @IsOptional()
    @IsString()
    lodging_info!: string
}
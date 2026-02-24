import { IsNumber, IsString } from "class-validator"

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
}
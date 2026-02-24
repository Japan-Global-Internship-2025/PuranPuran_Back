import { Body, Controller, Delete, Post, UseGuards, Get, Param, Patch} from '@nestjs/common';
import { TravelService } from './travel.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CreateTravelDto } from './dto/create-travel.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { UpdateTravelDto } from './dto/update-travel.dto';


@ApiTags('여행 정보 API')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('travel')
export class TravelController {
  constructor(private readonly travelService: TravelService) {}
  
  @Post('create')
  create(@GetUser() user: any, @Body() createTravelDto: CreateTravelDto) {
    return this.travelService.create(user, createTravelDto);
  }

  @Delete(':id')
  delete(@Param('id') id: number, @GetUser() user: any) {
    return this.travelService.delete(+id, user.user_id); 
  }

  @Patch(':id')
  update(@Param('id') id: number, @GetUser() user: any, @Body() updateTravelDto: UpdateTravelDto) {
    return this.travelService.update(+id, user.user_id, updateTravelDto); 
  }

  @Get(':id')
  findOne(@Param('id') id: number, @GetUser() user: any) {
    return this.travelService.findOne(+id, user.user_id);
  }

  @Get()
  findAll(@GetUser() user: any) {
    return this.travelService.findAll(user.user_id);
  }
}

import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { PlannerService } from './planner.service';
import { CreatePlannerDto } from './dto/create-planner.dto';
import { UpdatePlannerDto } from './dto/update-planner.dto';
import { SavePlannerDto } from './dto/save-planner.dto';
import { SaveTotalPlanDto } from './dto/save-total-plan.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('플래너(プランナー) API')
@Controller('api/planner')
export class PlannerController {
  constructor(private readonly plannerService: PlannerService) { }

  @ApiOperation({ summary: '전체 일정 요약 생성 (AI 기반)' })
  @Post(':travelId/total/generate')
  async generateTotalPlanSummary(@Param('travelId', ParseIntPipe) travelId: number) {
    return await this.plannerService.generateTotalPlanSummary(travelId);
  }

  @ApiOperation({ summary: '전체 일정 요약 저장' })
  @Post(':travelId/total/save')
  async saveTotalPlan(
    @Param('travelId', ParseIntPipe) travelId: number,
    @Body() saveTotalPlanDto: SaveTotalPlanDto,
  ) {
    return await this.plannerService.saveTotalPlan(travelId, saveTotalPlanDto);
  }

  @ApiOperation({ summary: '총 여행 플래너 장소 저장' })
  @Post(':travelId/total/places/save')
  async saveTotalPlanPlaces(
    @Param('travelId', ParseIntPipe) travelId: number,
    @Body() { places = [] }: { places?: string[] },
  ) {
    return await this.plannerService.saveTotalPlanPlaces(travelId, places);
  }

  @ApiOperation({ summary: '여행 일정 생성 (AI 기반)' })
  @Post(':travelId/generate')
  async generateDailyPlan(
    @Param('travelId', ParseIntPipe) travelId: number,
    @Body() createPlannerDto: CreatePlannerDto,
  ) {
    return await this.plannerService.createAIPlan(travelId, createPlannerDto);
  }

  @Post(':travelId/save')
  async saveConfirmedPlan(
    @Param('travelId', ParseIntPipe) travelId: number,
    @Body() savePlannerDto: SavePlannerDto, // 프론트엔드에서 최종 확정한 데이터 전체
  ) {
    // 💡 DB에 실제 저장하는 서비스 로직 호출
    return await this.plannerService.savePlan(travelId, savePlannerDto);
  }

  @ApiOperation({ summary: '여행 ID에 따른 모든 일정 조회' })
  @Get(':travelId/all')
  async getPlannersByTravel(@Param('travelId', ParseIntPipe) travelId: number) {
    return await this.plannerService.findAllByTravel(travelId);
  }

  @ApiOperation({ summary: '플래너 상세 조회' })
  @Get(':plannerId')
  async getPlannerDetail(@Param('plannerId', ParseIntPipe) plannerId: number) {
    return await this.plannerService.findOne(plannerId);
  }

  @ApiOperation({ summary: '플래너 삭제' })
  @Delete(':plannerId')
  async removePlanner(@Param('plannerId', ParseIntPipe) plannerId: number) {
    return await this.plannerService.remove(plannerId);
  }


  @ApiOperation({ summary: '플래너 수정' })
  @Patch(':plannerId')
  update(@Param('plannerId', ParseIntPipe) plannerId: number, @Body() updatePlannerDto: UpdatePlannerDto) {
    return this.plannerService.update(plannerId, updatePlannerDto);
  }
}

import { Module } from '@nestjs/common';
import { PlannerService } from './planner.service';
import { PlannerController } from './planner.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyPlanner } from './entities/daily-planner.entity';
import { PlannerItem } from './entities/planner-item.entity';
import { TravelModule } from 'src/travel/travel.module';
import { Travel } from 'src/travel/entities/travel-entity';

@Module({
  imports: [TypeOrmModule.forFeature([DailyPlanner, PlannerItem, Travel]), TravelModule],
  controllers: [PlannerController],
  providers: [PlannerService],
  exports: [PlannerService],
})
export class PlannerModule {}

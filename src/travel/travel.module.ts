import { Module } from '@nestjs/common';
import { TravelService } from './travel.service';
import { TravelController } from './travel.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Travel } from './entities/travel-entity';
import { User } from '../auth/entities/user.entity';
import { RecommendPlace } from './entities/recommend-place.entity';
import { TravelRegion } from './entities/travel-region.entity';
// import { AuthService } from 'src/auth/auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([Travel, User, TravelRegion, RecommendPlace])],
  controllers: [TravelController],
  providers: [TravelService],
  exports: [TravelService],
})
export class TravelModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExchangeRateModule } from './exchange-rate/exchange-rate.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './auth/entities/user.entity';
import { ExchangeRate } from './exchange-rate/entities/exchange-rate.entity';
import { TravelModule } from './travel/travel.module';
import { Travel } from './travel/entities/travel-entity';
import { SpendingModule } from './spending/spending.module';
import { Spending } from './spending/entities/spending.entity';
import { PlannerModule } from './planner/planner.module';
import { PlannerItem } from './planner/entities/planner-item.entity';
import { DailyPlanner } from './planner/entities/daily-planner.entity';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { RecommendPlace } from './travel/entities/recommend-place.entity';
import { TravelRegion } from './travel/entities/travel-region.entity';
import { JapaneseModule } from './japanese/japanese.module';
import { JapaneseExpression } from './japanese/entities/japanese-expression.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env', }),
    ExchangeRateModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: 3306,
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [User, ExchangeRate, Travel, Spending, DailyPlanner, PlannerItem, TravelRegion, RecommendPlace, JapaneseExpression], 
        synchronize: true,
      }),
    }), 
    AuthModule, TravelModule, SpendingModule, PlannerModule, JapaneseModule,
  ],
  controllers: [AppController],
  providers: [AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter, // 전역 필터로 사용할 클래스 지정
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    }
  ],
})
export class AppModule { }

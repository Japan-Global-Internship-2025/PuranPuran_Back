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
        entities: [User, ExchangeRate, Travel, Spending, DailyPlanner, PlannerItem], 
        synchronize: true,
      }),
    }), 
    AuthModule, TravelModule, SpendingModule, PlannerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

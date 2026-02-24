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
import { ReceiptModule } from './receipt/receipt.module';
import { Receipt } from './receipt/entities/receipt.entity';
import { PlannerModule } from './planner/planner.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env', }),
    ExchangeRateModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [User, ExchangeRate, Travel, Receipt], 
        synchronize: true,
      }),
    }), 
    AuthModule, TravelModule, ReceiptModule, PlannerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

import { Module } from '@nestjs/common';
import { SpendingService } from './spending.service';
import { SpendingController } from './spending.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Spending } from './entities/spending.entity';
import { ExchangeRateModule } from 'src/exchange-rate/exchange-rate.module';

@Module({
  imports: [TypeOrmModule.forFeature([Spending]), ExchangeRateModule],
  controllers: [SpendingController],
  providers: [SpendingService],
})
export class SpendingModule { }

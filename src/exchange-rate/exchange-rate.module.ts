import { Module } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import { ExchangeRateController } from './exchange-rate.controller';
import { ExchangeRate } from './entities/exchange-rate.entitiy';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([ExchangeRate])],
  controllers: [ExchangeRateController],
  providers: [ExchangeRateService],
})
export class ExchangeRateModule {}

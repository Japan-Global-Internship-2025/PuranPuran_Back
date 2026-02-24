import { Module } from '@nestjs/common';
import { ReceiptService } from './receipt.service';
import { ReceiptController } from './receipt.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Receipt } from './entities/receipt.entity';
import { ExchangeRateModule } from 'src/exchange-rate/exchange-rate.module';

@Module({
  imports: [TypeOrmModule.forFeature([Receipt]), ExchangeRateModule],
  controllers: [ReceiptController],
  providers: [ReceiptService],
})
export class ReceiptModule { }

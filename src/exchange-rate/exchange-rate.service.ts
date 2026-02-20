import { Injectable } from '@nestjs/common';

@Injectable()
export class ExchangeRateService {
    getRate(): string {
        return '980.50';
    }
}

import { Controller , Get} from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('환율 API')
@ApiBearerAuth()
@Controller('api/exchange-rate')
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) { }

  @Get()
  getRate() {
    return this.exchangeRateService.getRate();
  }
}

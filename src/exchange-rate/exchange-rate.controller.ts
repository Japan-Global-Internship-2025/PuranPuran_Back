import { Controller , Get} from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('환율 API')
@ApiBearerAuth()
@Controller('api/exchange-rate')
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) { }

  @ApiOperation({ summary: '환율 정보 조회' })
  @Get()
  getRate() {
    return this.exchangeRateService.getRate();
  }
}

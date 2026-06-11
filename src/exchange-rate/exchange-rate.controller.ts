import { Controller , Get, UseGuards} from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';

@ApiTags('환율 API')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) 
@Controller('api/exchange-rate')
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) { }

  @ApiOperation({ summary: '환율 정보 조회' })
  @Get()
  getRate() {
    return this.exchangeRateService.getRate();
  }
}
  
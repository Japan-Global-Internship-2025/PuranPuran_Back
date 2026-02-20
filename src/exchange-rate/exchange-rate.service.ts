import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ExchangeRate } from './entities/exchange-rate.entitiy';
import { Repository } from 'typeorm';
import dayjs from 'dayjs';

@Injectable()
export class ExchangeRateService {
    constructor(@InjectRepository(ExchangeRate) private readonly exchangeRateRepository: Repository<ExchangeRate>) { }

    async getRate() {
        const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
        let yesterdayRate = await this.exchangeRateRepository.findOne({
            where: { date: yesterday as any },
        });
        console.log('어제 환율 정보:', yesterdayRate?.rate);

        if (!yesterdayRate) {
            console.log('어제 환율 정보 저장 중');
            const fetchedRate = await this.fetchExchangeRateFromAPI(yesterday);
            yesterdayRate = this.exchangeRateRepository.create({
                date: yesterday as any,
                rate: fetchedRate,
            });
            await this.exchangeRateRepository.save(yesterdayRate);
        }

        const rateResponse = await fetch("https://api.exchangerate.fun/latest?base=JPY")
        const currentData = await rateResponse.json();
        const currentDataTime = currentData.timestamp;
        const currentRate = currentData.rates.KRW * 100;

        const difference = currentRate - yesterdayRate.rate;
        const changePercentage = (difference / yesterdayRate.rate) * 100;


        const data = {
            message: 'Success!',
            data: {
                time: currentDataTime,
                now_rate: currentRate.toFixed(2),
                yesterday_rate: yesterdayRate.rate.toFixed(2),
                rate_compare: changePercentage.toFixed(2) + '%',
                status: difference > 0 ? '+' : difference < 0 ? '-' : '=',
            }
        }

        console.log('환율 비교 결과:', data.data);

        return data;
    }

    async fetchExchangeRateFromAPI(yesterday: string): Promise<number> {
        const baseUrl = 'https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON?';
        const apiKey = process.env.KOREAEXIM_API_KEY;
        const url = `${baseUrl}authkey=${apiKey}&searchdate=${yesterday}&data=AP01`;

        const response = await fetch(url);
        const data = await response.json();
        const yen_rate = data.find((item: any) => item.cur_unit == 'JPY(100)')?.deal_bas_r;

        console.log(yen_rate);

        return Number(yen_rate);
    }

    // async compareYesterday(currencyCode: string, currentRate: number) {
    //     const yesterdayData = await this.getOrUpdateYesterdayRate(currencyCode);
    //     const yesterdayRate = yesterdayData.rate;

    //     const diff = currentRate - yesterdayRate;
    //     const diffPercent = (diff / yesterdayRate) * 100;

    //     return {
    //         current: currentRate,
    //         yesterday: yesterdayRate,
    //         difference: diff.toFixed(2),
    //         percent: diffPercent.toFixed(2) + '%',
    //         status: diff > 0 ? '상승' : diff < 0 ? '하락' : '동결'
    //     };
    // }
}

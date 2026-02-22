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
            yesterdayRate = await this.getLatestAvailableRate(yesterday);
        }

        const rateResponse = await fetch("https://api.exchangerate.fun/latest?base=JPY")
        const currentData = await rateResponse.json();
        const currentDataTime = currentData.timestamp;
        const currentRate = currentData.rates.KRW * 100;

        const difference = currentRate - yesterdayRate!.rate;
        const changePercentage = (difference / yesterdayRate!.rate) * 100;


        const data = {
            message: 'Success!',
            data: {
                time: currentDataTime,
                now_rate: currentRate.toFixed(2),
                yesterday_rate: yesterdayRate!.rate.toFixed(2),
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

    // 데이터가 있을 때까지 과거로 가는 핵심 함수
    private async getLatestAvailableRate(targetDate: string, retryCount = 0): Promise<any> {
        if (retryCount > 10) return null;

        // 1. 먼저 DB에 해당 날짜 데이터가 있는지 확인
        let rateEntry = await this.exchangeRateRepository.findOne({
            where: { date: targetDate as any }
        });

        if (rateEntry) return rateEntry;

        // 2. DB에 없으면 API 호출
        console.log(`${targetDate} 데이터 조회 중... (시도: ${retryCount + 1})`);
        const apiData = await this.fetchExchangeRateFromAPI(targetDate);

        if (!apiData) {
            const dayBefore = dayjs(targetDate).subtract(1, 'day').format('YYYY-MM-DD');
            return this.getLatestAvailableRate(dayBefore, retryCount + 1);
        }

        // 4. 데이터가 있다면 JPY(100) 찾아서 DB 저장 후 반환
        const rate = apiData

        const newRate = this.exchangeRateRepository.create({
            date: targetDate,
            rate: rate,
        });
        await this.exchangeRateRepository.save(newRate);
        return newRate;
    }

}
